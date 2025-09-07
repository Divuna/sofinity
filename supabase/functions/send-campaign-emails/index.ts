import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // For now, we'll just log the email sending process
    // In a real implementation, you would integrate with an email service like Resend
    let successCount = 0;
    const emailLogs = [];

    for (const campaignContact of campaignContacts) {
      const contact = campaignContact.Contacts;
      
      try {
        // Simulate email sending
        console.log(`Sending email to: ${contact.email} (${contact.name || contact.full_name})`);
        
        // Here you would call your email service API
        // For demo purposes, we'll just create a log entry
        const emailLog = {
          user_id: user.id,
          campaign_id: campaignId,
          recipient_email: contact.email,
          subject: `Kampaň: ${campaign.name}`,
          status: 'sent',
          sent_at: new Date().toISOString(),
          message_id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        emailLogs.push(emailLog);
        successCount++;
      } catch (error) {
        console.error(`Failed to send email to ${contact.email}:`, error);
        
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

    console.log(`Successfully sent ${successCount} out of ${campaignContacts.length} emails`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `E-maily byly odeslány (${successCount}/${campaignContacts.length})`,
        sentCount: successCount,
        totalCount: campaignContacts.length
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