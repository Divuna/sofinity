import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushRequest {
  player_id: string;
  title: string;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 [send_push_via_onesignal] Starting push notification');
    
    const { player_id, title, message }: PushRequest = await req.json();
    console.log('📦 Request payload:', { player_id, title, message });

    if (!player_id || !title || !message) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: player_id, title, message' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch OneSignal credentials from settings
    console.log('🔑 Fetching OneSignal credentials from database...');
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['onesignal_app_id', 'onesignal_rest_api_key']);

    if (settingsError) {
      console.error('❌ Error fetching settings:', settingsError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch OneSignal credentials' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const settings = settingsData.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, string>);

    const appId = settings.onesignal_app_id;
    const apiKey = settings.onesignal_rest_api_key;

    if (!appId || !apiKey) {
      console.error('❌ OneSignal credentials not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'OneSignal credentials not configured in settings table' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('✅ OneSignal credentials retrieved');

    // Prepare notification payload
    const notificationPayload = {
      app_id: appId,
      include_player_ids: [player_id],
      headings: { en: title },
      contents: { en: message },
    };

    console.log('📤 Sending notification to OneSignal...');

    // Send notification using Bearer authentication
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(notificationPayload),
    });

    const responseBody = await response.text();
    const statusCode = response.status;
    const status = statusCode >= 200 && statusCode < 300 ? 'sent' : 'failed';

    console.log('📊 OneSignal Response Status:', statusCode);
    console.log('📊 OneSignal Response Body:', responseBody);

    // Log to push_log table
    const { error: logError } = await supabase
      .from('push_log')
      .insert({
        player_id,
        status_code: statusCode,
        response_body: responseBody,
        status,
        created_at: new Date().toISOString(),
      });

    if (logError) {
      console.error('⚠️ Failed to log to push_log table:', logError);
    } else {
      console.log('✅ Logged to push_log table');
    }

    if (status === 'sent') {
      return new Response(
        JSON.stringify({
          success: true,
          status: 'sent',
          status_code: statusCode,
          response: responseBody,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          status: 'failed',
          status_code: statusCode,
          error: responseBody,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: statusCode }
      );
    }

  } catch (error) {
    console.error('💥 Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
