import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  source_app: string;
  type: string;
  title: string;
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { source_app, type, title, message }: NotificationRequest = await req.json();

    if (!source_app || !type || !title || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: source_app, type, title, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch OneSignal credentials from settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['onesignal_app_id', 'onesignal_rest_api_key']);

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch OneSignal settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const oneSignalAppId = settingsData?.find(s => s.key === 'onesignal_app_id')?.value;
    const oneSignalApiKey = settingsData?.find(s => s.key === 'onesignal_rest_api_key')?.value;

    if (!oneSignalAppId || !oneSignalApiKey) {
      console.error('OneSignal credentials not found in settings');
      return new Response(
        JSON.stringify({ error: 'OneSignal credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ MULTI-DEVICE FIX: Fetch devices from user_devices table
    console.log(`Fetching devices for source_app: ${source_app}`);
    const { data: devices, error: devicesError } = await supabase
      .from('user_devices_active')
      .select('user_id, player_id, device_type, email');

    if (devicesError) {
      console.error('Error fetching devices:', devicesError);
      console.error('Supabase error details:', JSON.stringify(devicesError));
      return new Response(
        JSON.stringify({ error: 'Failed to fetch devices', details: devicesError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${devices?.length || 0} registered devices`);
    
    if (!devices || devices.length === 0) {
      console.log(`No active devices found for source_app: ${source_app}`);
      return new Response(
        JSON.stringify({ success: true, sent_count: 0, message: 'No active devices found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sentCount = 0;
    const notifications = [];

    // ✅ MULTI-DEVICE FIX: Group devices by user_id for efficient processing
    const devicesByUser = new Map<string, Array<{player_id: string, device_type: string}>>();
    for (const device of devices) {
      const userId = device.user_id || device.email; // Fallback to email for anonymous
      if (!devicesByUser.has(userId)) {
        devicesByUser.set(userId, []);
      }
      devicesByUser.get(userId)!.push({
        player_id: device.player_id,
        device_type: device.device_type
      });
    }

    console.log(`Grouped into ${devicesByUser.size} unique users/emails`);

    // Process each user (may have multiple devices)
    for (const [userId, userDevices] of devicesByUser) {
      try {
        let notificationData = null;
        
        // Determine if userId is UUID (authenticated) or email (anonymous)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        
        // Try to insert notification with user_id first (if authenticated)
        if (isUUID) {
          const { data: primaryInsert, error: primaryError } = await supabase
            .from('Notifications')
            .insert({
              user_id: userId,
              type: type,
              title: title,
              message: message,
              read: false,
              sent_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (primaryError) {
            // Check if it's a FK violation (user_id not in auth.users)
            if (primaryError.code === '23503') {
              console.warn(`⚠️ FK violation for user ${userId}, retrying with user_id = null`);
              
              // Fallback: insert without user_id (anonymous notification)
              const { data: fallbackInsert, error: fallbackError } = await supabase
                .from('Notifications')
                .insert({
                  user_id: null,
                  type: type,
                  title: title,
                  message: message,
                  read: false,
                  sent_at: new Date().toISOString(),
                })
                .select()
                .single();

              if (fallbackError) {
                console.error(`Error inserting anonymous notification for user ${userId}:`, fallbackError);
                // Continue to try sending push even if DB insert failed
              } else {
                notificationData = fallbackInsert;
                notifications.push(notificationData);
              }
            } else {
              console.error(`Error inserting notification for user ${userId}:`, primaryError);
              // Continue to try sending push even if DB insert failed
            }
          } else {
            notificationData = primaryInsert;
            notifications.push(notificationData);
          }
        } else {
          // Anonymous user (email as userId) - skip DB notification, just send push
          console.log(`Skipping DB notification for anonymous user: ${userId}`);
        }

        // ✅ MULTI-DEVICE FIX: Send push to ALL devices for this user
        if (userDevices.length > 0) {
          try {
            // Collect all player_ids for this user
            const playerIds = userDevices.map(d => d.player_id);
            console.log(`Sending push to ${playerIds.length} device(s) for user ${userId}`);

            const pushPayload: any = {
              app_id: oneSignalAppId,
              include_player_ids: playerIds, // ✅ Multiple devices support
              headings: { en: title },
              contents: { en: message },
              data: {
                type: type,
                source_app: source_app,
                device_count: playerIds.length,
              },
            };

            // Include notification_id only if we successfully created a DB record
            if (notificationData?.id) {
              pushPayload.data.notification_id = notificationData.id;
            }

            const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${oneSignalApiKey}`,
              },
              body: JSON.stringify(pushPayload),
            });

            if (oneSignalResponse.ok) {
              const responseData = await oneSignalResponse.json();
              sentCount += playerIds.length; // Count each device as separate send
              console.log(`✅ Push sent to ${playerIds.length} device(s) for user ${userId}`, responseData);
            } else {
              const errorText = await oneSignalResponse.text();
              console.error(`OneSignal API error for user ${userId}:`, errorText);
            }
          } catch (pushError) {
            console.error(`Failed to send push to user ${userId}:`, pushError);
          }
        } else {
          console.log(`User ${userId} has no registered devices, skipping push`);
        }
      } catch (userError) {
        console.error(`Error processing user ${userId}:`, userError);
      }
    }

    console.log(`Notifications processed: ${notifications.length}, Push sent: ${sentCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent_count: sentCount,
        notifications_created: notifications.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
