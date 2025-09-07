import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

interface SendCampaignEmailsRequest {
  campaignId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify user authentication
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { campaignId }: SendCampaignEmailsRequest = await req.json();

    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }

    console.log('Sending emails for campaign:', campaignId);

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('Campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campaign not found or access denied');
    }

    if (!campaign.email) {
      throw new Error('Campaign has no email content');
    }

    // Get campaign contacts
    console.log('Fetching campaign contacts for campaign:', campaignId, 'user:', user.id);
    
    const { data: campaignContacts, error: contactsError } = await supabaseClient
      .from('campaign_contacts')
      .select(`
        contact_id,
        Contacts!inner(*)
      `)
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id);

    if (contactsError) {
      console.error('Campaign contacts query error:', contactsError);
      throw new Error(`Failed to fetch campaign contacts: ${contactsError.message}`);
    }

    if (!campaignContacts || campaignContacts.length === 0) {
      throw new Error('No contacts found for this campaign');
    }

    console.log(`Found ${campaignContacts.length} contacts to send emails to`);

    // Send actual emails using Resend
    let successCount = 0;
    const emailLogs = [];
    const emailResults = [];

    console.log(`=== STARTING EMAIL SEND FOR CAMPAIGN: ${campaign.name} (ID: ${campaignId}) ===`);

    for (const campaignContact of campaignContacts) {
      const contact = campaignContact.Contacts;
      
      try {
        // Detailed logging for each contact
        console.log(`📧 SENDING EMAIL:`);
        console.log(`  Campaign: ${campaign.name} (ID: ${campaignId})`);
        console.log(`  Recipient: ${contact.email}`);
        console.log(`  Contact Name: ${contact.name || contact.full_name || 'N/A'}`);
        
        // Send actual email using Resend
        const emailResponse = await resend.emails.send({
          from: 'Sofinity <noreply@opravo.cz>',
          to: [contact.email],
          subject: `Kampaň: ${campaign.name}`,
          html: campaign.email // Use the campaign's email content
        });

        if (emailResponse.error) {
          throw emailResponse.error;
        }

        const emailLog = {
          user_id: user.id,
          campaign_id: campaignId,
          recipient_email: contact.email,
          subject: `Kampaň: ${campaign.name}`,
          status: 'sent',
          sent_at: new Date().toISOString(),
          message_id: emailResponse.data?.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        emailLogs.push(emailLog);
        emailResults.push({
          email: contact.email,
          status: 'success',
          error: null
        });
        successCount++;
        
        console.log(`✅ SUCCESS: Email successfully sent to ${contact.email}`);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        console.log(`❌ ERROR sending email:`);
        console.log(`  Campaign: ${campaign.name} (ID: ${campaignId})`);
        console.log(`  Recipient: ${contact.email}`);
        console.log(`  Error: ${errorMessage}`);
        console.log(`  Full error payload:`, error);
        
        const emailLog = {
          user_id: user.id,
          campaign_id: campaignId,
          recipient_email: contact.email,
          subject: `Kampaň: ${campaign.name}`,
          status: 'failed',
          sent_at: new Date().toISOString(),
          message_id: null
        };

        emailLogs.push(emailLog);
        emailResults.push({
          email: contact.email,
          status: 'error',
          error: errorMessage
        });
      }
    }

    // Save email logs to database
    if (emailLogs.length > 0) {
      const { error: logError } = await supabaseClient
        .from('EmailLogs')
        .insert(emailLogs);

      if (logError) {
        console.error('Failed to save email logs:', logError);
      }
    }

    console.log(`=== EMAIL SEND COMPLETED ===`);
    console.log(`📊 FINAL RESULTS: Successfully sent ${successCount} out of ${campaignContacts.length} emails`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `E-maily byly odeslány (${successCount}/${campaignContacts.length})`,
        sentCount: successCount,
        totalCount: campaignContacts.length,
        emailResults: emailResults
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in send-campaign-emails function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        success: false 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);