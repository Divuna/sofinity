import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 [test-push-notification] Starting test pipeline');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Get OneSignal credentials from Edge Function secrets
    console.log('🔑 Loading OneSignal credentials from Edge Function secrets...');
    const appId = Deno.env.get('ONESIGNAL_APP_ID');
    const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!appId || !apiKey) {
      console.error('❌ OneSignal credentials not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'OneSignal credentials not configured in Edge Function secrets' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('✅ OneSignal credentials loaded');
    console.log('🔐 App ID:', appId);
    console.log('🔐 API Key:', 'Key *****' + apiKey.slice(-6));

    // Step 2: Find the most recent user with a valid player_id
    console.log('👤 Finding most recent user with valid player_id...');
    const { data: deviceData, error: deviceError } = await supabase
      .from('user_devices')
      .select('user_id, player_id, email, device_type, updated_at')
      .not('player_id', 'is', null)
      .neq('player_id', '')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (deviceError || !deviceData) {
      console.error('❌ No users found with valid player_id:', deviceError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No users found with valid player_id in user_devices table',
          details: deviceError 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log('✅ Found user:', {
      user_id: deviceData.user_id,
      player_id: deviceData.player_id,
      email: deviceData.email,
      device_type: deviceData.device_type,
      updated_at: deviceData.updated_at
    });

    // Step 3: Prepare test notification payload
    const testTitle = 'Test Sofinity → OneSignal 🚀';
    const testMessage = 'This is a test push notification from Sofinity system';
    
    const notificationPayload = {
      app_id: appId,
      include_player_ids: [deviceData.player_id],
      headings: { en: testTitle },
      contents: { en: testMessage },
      data: {
        test: true,
        timestamp: new Date().toISOString(),
        source: 'test-push-notification-function'
      }
    };

    console.log('📤 Sending test notification to OneSignal...');
    console.log('📦 Payload:', JSON.stringify(notificationPayload, null, 2));

    // Step 4: Send notification using REST API key with "Key" prefix
    const onesignalUrl = 'https://api.onesignal.com/notifications';
    const response = await fetch(onesignalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
      },
      body: JSON.stringify(notificationPayload),
    });

    const responseBody = await response.text();
    const statusCode = response.status;
    const status = statusCode >= 200 && statusCode < 300 ? 'sent' : 'error';

    console.log('📊 OneSignal Response Status:', statusCode);
    console.log('📊 OneSignal Response Body:', responseBody);

    // Step 5: Log to push_log table
    console.log('💾 Logging result to push_log table...');
    const { error: logError } = await supabase
      .from('push_log')
      .insert({
        player_id: deviceData.player_id,
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

    // Step 6: Return comprehensive test result
    const result = {
      success: status === 'sent',
      test_status: status,
      onesignal_response: {
        status_code: statusCode,
        body: responseBody,
        parsed: (() => {
          try {
            return JSON.parse(responseBody);
          } catch {
            return null;
          }
        })()
      },
      test_details: {
        app_id: appId,
        api_key_suffix: '*****' + apiKey.slice(-6),
        target_user: {
          user_id: deviceData.user_id,
          player_id: deviceData.player_id,
          email: deviceData.email,
          device_type: deviceData.device_type
        },
        notification: {
          title: testTitle,
          message: testMessage
        }
      },
      logged_to_database: !logError,
      timestamp: new Date().toISOString()
    };

    console.log('🎉 Test pipeline completed successfully!');
    console.log('📋 Full result:', JSON.stringify(result, null, 2));

    return new Response(
      JSON.stringify(result, null, 2),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: status === 'sent' ? 200 : statusCode 
      }
    );

  } catch (error) {
    console.error('💥 Fatal error in test pipeline:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
