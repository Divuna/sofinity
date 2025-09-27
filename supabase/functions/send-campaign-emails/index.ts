import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendCampaignRequest {
  email_id?: string;
  campaign_id?: string;
  batch_size?: number;
  user_id?: string;
}

interface EmailLog {
  campaign_id?: string;
  user_id: string;
  recipient_email: string;
  subject: string;
  status: string;
  sent_at: string;
  message_id?: string;
  payload: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email_id, campaign_id, batch_size = 10, user_id }: SendCampaignRequest = await req.json();

    console.log(`Sending campaign emails - Email ID: ${email_id}, Campaign ID: ${campaign_id}`);

    let emailsToSend: any[] = [];

    if (email_id) {
      // Send specific email
      const { data: emailRecord, error: emailError } = await supabaseClient
        .from('Emails')
        .select('*')
        .eq('id', email_id)
        .single();

      if (emailError || !emailRecord) {
        throw new Error('Email not found');
      }

      emailsToSend = [emailRecord];
    } else if (campaign_id) {
      // Send all emails for campaign
      const { data: campaignEmails, error: campaignError } = await supabaseClient
        .from('Emails')
        .select('*')
        .eq('project_id', campaign_id)
        .eq('status', 'draft');

      if (campaignError) {
        throw new Error(`Failed to fetch campaign emails: ${campaignError.message}`);
      }

      emailsToSend = campaignEmails || [];
    } else {
      throw new Error('Either email_id or campaign_id must be provided');
    }

    if (emailsToSend.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No emails to send',
          sent_count: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Get contacts for sending
    const { data: contacts, error: contactsError } = await supabaseClient
      .from('Contacts')
      .select('email, name')
      .eq('subscribed', true)
      .limit(batch_size);

    if (contactsError) {
      throw new Error(`Failed to fetch contacts: ${contactsError.message}`);
    }

    if (!contacts || contacts.length === 0) {
      throw new Error('No subscribed contacts found');
    }

    const results = [];
    const emailLogs: EmailLog[] = [];

    for (const email of emailsToSend) {
      for (const contact of contacts) {
        try {
          // Send via Resend
          const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'OneMil <no-reply@onemill.cz>',
              to: contact.email,
              subject: email.subject,
              html: email.content,
              tags: [
                { name: 'campaign', value: campaign_id || 'single' },
                { name: 'email_id', value: email.id }
              ]
            }),
          });

          const resendData = await resendResponse.json();

          if (resendResponse.ok) {
            emailLogs.push({
              campaign_id,
              user_id: email.user_id,
              recipient_email: contact.email,
              subject: email.subject,
              status: 'sent',
              sent_at: new Date().toISOString(),
              message_id: resendData.id,
              payload: {
                email_id: email.id,
                resend_id: resendData.id,
                contact_name: contact.name
              }
            });

            results.push({
              success: true,
              email_id: email.id,
              recipient: contact.email,
              message_id: resendData.id
            });
          } else {
            emailLogs.push({
              campaign_id,
              user_id: email.user_id,
              recipient_email: contact.email,
              subject: email.subject,
              status: 'failed',
              sent_at: new Date().toISOString(),
              payload: {
                email_id: email.id,
                error: resendData.message || 'Unknown error',
                contact_name: contact.name
              }
            });

            results.push({
              success: false,
              email_id: email.id,
              recipient: contact.email,
              error: resendData.message
            });
          }
        } catch (sendError: any) {
          console.error(`Error sending to ${contact.email}:`, sendError);
          
          emailLogs.push({
            campaign_id,
            user_id: email.user_id,
            recipient_email: contact.email,
            subject: email.subject,
            status: 'failed',
            sent_at: new Date().toISOString(),
            payload: {
              email_id: email.id,
              error: sendError.message,
              contact_name: contact.name
            }
          });

          results.push({
            success: false,
            email_id: email.id,
            recipient: contact.email,
            error: sendError.message
          });
        }
      }

      // Update email status to sent
      await supabaseClient
        .from('Emails')
        .update({ status: 'sent' })
        .eq('id', email.id);
    }

    // Batch insert email logs
    if (emailLogs.length > 0) {
      const { error: logError } = await supabaseClient
        .from('EmailLogs')
        .insert(emailLogs);

      if (logError) {
        console.error('Error saving email logs:', logError);
      }
    }

    // Log to audit_logs
    const { error: auditError } = await supabaseClient
      .from('audit_logs')
      .insert({
        event_name: 'campaign_emails_sent',
        user_id: user_id,
        project_id: campaign_id,
        event_data: {
          emails_processed: emailsToSend.length,
          contacts_reached: contacts.length,
          total_sent: results.filter(r => r.success).length,
          total_failed: results.filter(r => !r.success).length,
          batch_size
        }
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Campaign sending completed: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent_count: successCount,
        failed_count: failCount,
        total_processed: results.length,
        results,
        message: `Campaign emails processed: ${successCount} sent, ${failCount} failed`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Send Campaign Emails error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});