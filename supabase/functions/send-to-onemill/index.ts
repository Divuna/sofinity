import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  console.log('📤 [send-to-onemill] Incoming request');

  try {
    // Parse request body
    const payload = await req.json();
    const { user_id, content, sender, is_ai, ai_confidence } = payload;

    console.log('📤 [send-to-onemill] Payload:', { user_id, sender, content_length: content?.length });

    // Validate required fields
    if (!user_id || !content || !sender) {
      throw new Error('Missing required fields: user_id, content, sender');
    }

    // Get webhook configuration from environment
    const onemillWebhookUrl = Deno.env.get('ONEMILL_WEBHOOK_URL');
    const webhookToken = Deno.env.get('INTERNAL_WEBHOOK_TOKEN');

    if (!onemillWebhookUrl || !webhookToken) {
      console.error('❌ [send-to-onemill] Missing ONEMILL_WEBHOOK_URL or INTERNAL_WEBHOOK_TOKEN');
      throw new Error('Webhook configuration missing');
    }

    console.log('🔑 [send-to-onemill] Webhook URL configured:', onemillWebhookUrl.substring(0, 30) + '...');

    // Send webhook to OneMil
    const webhookPayload = {
      user_id,
      content,
      sender,
      is_ai: is_ai || false,
      ai_confidence: ai_confidence || null,
    };

    console.log('📡 [send-to-onemill] Sending webhook to OneMil...');

    const response = await fetch(onemillWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-token': webhookToken,
      },
      body: JSON.stringify(webhookPayload),
    });

    const responseText = await response.text();
    console.log('📡 [send-to-onemill] OneMil response status:', response.status);
    console.log('📡 [send-to-onemill] OneMil response body:', responseText);

    if (!response.ok) {
      throw new Error(`OneMil webhook failed: ${response.status} ${responseText}`);
    }

    console.log('✅ [send-to-onemill] Webhook sent successfully');

    return new Response(
      JSON.stringify({ success: true, status: 'sent' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('💥 [send-to-onemill] Error:', error);

    // Log error to database
    try {
      const { error: logError } = await supabase
        .from('sofinity_error_log')
        .insert({
          type: 'onemill_webhook_error',
          payload: await req.json().catch(() => ({})),
          error: JSON.stringify({
            message: error.message,
            stack: error.stack,
            name: error.name,
          }),
        });

      if (logError) {
        console.error('❌ [send-to-onemill] Failed to log error:', logError);
      }
    } catch (logError) {
      console.error('💥 [send-to-onemill] Failed to log error to database:', logError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
