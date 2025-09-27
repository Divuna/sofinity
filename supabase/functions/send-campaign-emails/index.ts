import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resendApiKey = Deno.env.get('RESEND_API_KEY');

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

    // Get test email address for OneMil project
    const testEmail = 'support@opravo.cz';
    
    console.log(`Sending email for campaign: ${campaign.name}`);
    console.log(`Test mode: sending to ${testEmail}`);

    // Send email using Resend API
    let emailResponse;
    try {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'OneMil <noreply@opravo.cz>',
          to: [testEmail],
          subject: `OneMil Kampaň: ${campaign.name}`,
          html: campaign.email
        }),
      });

      if (!resendResponse.ok) {
        const errorText = await resendResponse.text();
        throw new Error(`Resend API error: ${resendResponse.status} - ${errorText}`);
      }

      emailResponse = {
        data: await resendResponse.json()
      };

    } catch (providerError) {
      console.log(`❌ EMAIL PROVIDER ERROR:`, providerError);
      throw providerError;
    }

    // Save email log
    const emailLog = {
      user_id: user.id,
      campaign_id: campaignId,
      recipient_email: testEmail,
      subject: `OneMil Kampaň: ${campaign.name}`,
      status: 'sent',
      sent_at: new Date().toISOString(),
      message_id: emailResponse.data?.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      payload: {
        response: emailResponse.data,
        email_mode: 'test',
        campaign_name: campaign.name,
        project: 'OneMil'
      }
    };

    const { error: logError } = await supabaseClient
      .from('EmailLogs')
      .insert([emailLog]);

    if (logError) {
      console.error('Failed to save email log:', logError);
    }

    console.log(`✅ SUCCESS: Email successfully sent to ${testEmail}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `E-mail byl odeslán na testovací adresu: ${testEmail}`,
        sentCount: 1,
        totalCount: 1,
        emailResults: [{
          email: testEmail,
          status: 'success',
          error: null
        }]
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