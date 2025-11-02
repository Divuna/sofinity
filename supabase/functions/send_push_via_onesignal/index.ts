import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushRequest {
  title: string;
  message: string;
  player_ids?: string[];
  user_email?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 [send_push_via_onesignal] Starting push notification diagnostic');
    
    const { title, message, player_ids, user_email }: PushRequest = await req.json();
    console.log('📦 Request payload:', { title, message, player_ids, user_email });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch OneSignal credentials from settings
    console.log('🔑 Fetching OneSignal credentials from database...');
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('onesignal_app_id, onesignal_rest_api_key')
      .single();

    if (settingsError || !settings?.onesignal_app_id || !settings?.onesignal_rest_api_key) {
      console.error('❌ OneSignal credentials not found:', settingsError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'OneSignal credentials not configured' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('✅ OneSignal credentials retrieved:', {
      app_id: settings.onesignal_app_id,
      api_key_preview: `${settings.onesignal_rest_api_key.substring(0, 8)}...`
    });

    // Determine target player IDs
    let targetPlayerIds: string[] = [];
    
    if (player_ids && player_ids.length > 0) {
      targetPlayerIds = player_ids;
      console.log('🎯 Using provided player IDs:', targetPlayerIds);
    } else if (user_email) {
      console.log('🔍 Looking up player IDs for email:', user_email);
      const { data: devices, error: devicesError } = await supabase
        .from('user_devices')
        .select('player_id')
        .eq('email', user_email)
        .not('player_id', 'is', null);

      if (devicesError || !devices || devices.length === 0) {
        console.error('❌ No devices found for email:', user_email, devicesError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No devices found for user' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      targetPlayerIds = devices.map(d => d.player_id).filter(Boolean);
      console.log('✅ Found player IDs:', targetPlayerIds);
    } else {
      console.error('❌ No player_ids or user_email provided');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Either player_ids or user_email must be provided' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (targetPlayerIds.length === 0) {
      console.error('❌ No valid player IDs to send to');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No valid player IDs found' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const notificationPayload = {
      app_id: settings.onesignal_app_id,
      include_player_ids: targetPlayerIds,
      headings: { en: title },
      contents: { en: message },
    };

    console.log('📤 Notification payload:', JSON.stringify(notificationPayload, null, 2));

    // TEST 1: Try Basic Authentication
    console.log('\n🧪 TEST 1: Attempting Basic Authentication...');
    const basicAuthResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${settings.onesignal_rest_api_key}`,
      },
      body: JSON.stringify(notificationPayload),
    });

    const basicAuthResult = await basicAuthResponse.json();
    console.log('📊 Basic Auth Response Status:', basicAuthResponse.status);
    console.log('📊 Basic Auth Response:', JSON.stringify(basicAuthResult, null, 2));

    // TEST 2: Try Bearer Authentication
    console.log('\n🧪 TEST 2: Attempting Bearer Authentication...');
    const bearerAuthResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.onesignal_rest_api_key}`,
      },
      body: JSON.stringify(notificationPayload),
    });

    const bearerAuthResult = await bearerAuthResponse.json();
    console.log('📊 Bearer Auth Response Status:', bearerAuthResponse.status);
    console.log('📊 Bearer Auth Response:', JSON.stringify(bearerAuthResult, null, 2));

    // Determine which method succeeded
    const basicSuccess = basicAuthResponse.status === 200;
    const bearerSuccess = bearerAuthResponse.status === 200;

    console.log('\n📋 DIAGNOSTIC SUMMARY:');
    console.log(`  ✓ Basic Auth (Basic ${settings.onesignal_rest_api_key.substring(0, 8)}...): ${basicSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`  ✓ Bearer Auth (Bearer ${settings.onesignal_rest_api_key.substring(0, 8)}...): ${bearerSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);

    if (basicSuccess || bearerSuccess) {
      const successfulMethod = basicSuccess ? 'Basic' : 'Bearer';
      const successfulResult = basicSuccess ? basicAuthResult : bearerAuthResult;
      
      console.log(`\n🎉 Push notification sent successfully via ${successfulMethod} auth!`);
      console.log('📬 Notification ID:', successfulResult.id);
      console.log('👥 Recipients:', successfulResult.recipients);

      return new Response(
        JSON.stringify({
          success: true,
          method: successfulMethod,
          notification_id: successfulResult.id,
          recipients: successfulResult.recipients,
          diagnostic: {
            basic_auth: { status: basicAuthResponse.status, success: basicSuccess },
            bearer_auth: { status: bearerAuthResponse.status, success: bearerSuccess },
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } else {
      console.error('\n❌ Both authentication methods failed!');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Both Basic and Bearer authentication failed',
          diagnostic: {
            basic_auth: { status: basicAuthResponse.status, result: basicAuthResult },
            bearer_auth: { status: bearerAuthResponse.status, result: bearerAuthResult },
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
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
