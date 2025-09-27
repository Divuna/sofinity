import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

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
  recipient_email: string;
  subject: string;
  status: string;
  sent_at: string;
  campaign_id?: string;
  user_id: string;
  payload: any;
  message_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize Resend client
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const resend = new Resend(resendApiKey);

    // Parse the request body
    const { email_id, campaign_id, batch_size = 10, user_id }: SendCampaignRequest = await req.json();

    if (!email_id && !campaign_id) {
      return new Response(
        JSON.stringify({ error: 'Either email_id or campaign_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing campaign send request:', { email_id, campaign_id, batch_size });

    // Fetch emails to send
    let emailsQuery = supabase
      .from('Emails')
      .select('*');

    if (email_id) {
      emailsQuery = emailsQuery.eq('id', email_id);
    } else if (campaign_id) {
      emailsQuery = emailsQuery.eq('campaign_id', campaign_id);
    }

    const { data: emails, error: emailsError } = await emailsQuery;

    if (emailsError || !emails || emails.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No emails found to send' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${emails.length} emails to send`);

    // Fetch subscribed contacts for OneMil project
    const { data: contactsData, error: contactsError } = await supabase
      .from('Contacts')
      .select('email, name, subscribed')
      .eq('project_id', 'defababe-004b-4c63-9ff1-311540b0a3c9')
      .eq('subscribed', true);

    let contacts = contactsData;
    if (contactsError || !contacts || contacts.length === 0) {
      console.log('No subscribed contacts found, using test recipient');
      // Use test recipient if no contacts found
      contacts = [{ email: 'divispavel2@gmail.com', name: 'Test User', subscribed: true }];
    }

    console.log(`Sending to ${contacts.length} contacts`);

    let totalSent = 0;
    let totalFailed = 0;
    const emailLogs: EmailLog[] = [];

    // Process each email
    for (const email of emails) {
      console.log(`Processing email: ${email.subject}`);

      // Process contacts in batches
      for (let i = 0; i < contacts.length; i += batch_size) {
        const batch = contacts.slice(i, i + batch_size);
        
        for (const contact of batch) {
          try {
            // Send email via Resend
            const { data: sendData, error: sendError } = await resend.emails.send({
              from: 'OneMil <noreply@onefocusedmillion.com>',
              to: [contact.email],
              subject: email.subject,
              html: email.content,
              text: email.content.replace(/<[^>]*>/g, ''), // Strip HTML for text version
            });

            if (sendError) {
              throw sendError;
            }

            // Log successful send
            const emailLog: EmailLog = {
              recipient_email: contact.email,
              subject: email.subject,
              status: 'sent',
              sent_at: new Date().toISOString(),
              campaign_id: email.campaign_id || null,
              user_id: user_id || email.user_id,
              payload: {
                email_id: email.id,
                contact_name: contact.name,
                resend_id: sendData?.id
              },
              message_id: sendData?.id || undefined
            };

            emailLogs.push(emailLog);
            totalSent++;

            console.log(`Email sent successfully to ${contact.email}`);

          } catch (error) {
            console.error(`Failed to send email to ${contact.email}:`, error);

            // Log failed send
            const emailLog: EmailLog = {
              recipient_email: contact.email,
              subject: email.subject,
              status: 'failed',
              sent_at: new Date().toISOString(),
              campaign_id: email.campaign_id || null,
              user_id: user_id || email.user_id,
              payload: {
                email_id: email.id,
                contact_name: contact.name,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            };

            emailLogs.push(emailLog);
            totalFailed++;
          }

          // Small delay between emails to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Delay between batches
        if (i + batch_size < contacts.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Update email status to sent
      const { error: updateError } = await supabase
        .from('Emails')
        .update({ status: 'sent' })
        .eq('id', email.id);

      if (updateError) {
        console.error('Failed to update email status:', updateError);
      }
    }

    // Bulk insert email logs
    if (emailLogs.length > 0) {
      const { error: logsError } = await supabase
        .from('EmailLogs')
        .insert(emailLogs);

      if (logsError) {
        console.error('Failed to insert email logs:', logsError);
      }
    }

    // Log the campaign send event to audit_logs
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        event_name: 'campaign_emails_sent',
        user_id: user_id || emails[0].user_id,
        event_data: {
          total_emails: emails.length,
          total_contacts: contacts.length,
          total_sent: totalSent,
          total_failed: totalFailed,
          batch_size: batch_size,
          campaign_id: campaign_id,
          email_ids: emails.map(e => e.id),
          sent_at: new Date().toISOString()
        }
      });

    if (auditError) {
      console.error('Failed to log audit event:', auditError);
      // Don't fail the request for audit log errors
    }

    console.log(`Campaign send completed: ${totalSent} sent, ${totalFailed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        total_sent: totalSent,
        total_failed: totalFailed,
        emails_processed: emails.length,
        contacts_count: contacts.length,
        logs_created: emailLogs.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in send-campaign-emails function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);