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

    // Fetch active users matching source_app from profiles_notifications view
    console.log(`Fetching users for source_app: ${source_app}`);
    const { data: users, error: usersError } = await supabase
      .from('profiles_notifications')
      .select('user_id, onesignal_player_id')
      .eq('is_active', true)
      .eq('source_app', source_app);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      console.error('Supabase error details:', JSON.stringify(usersError));
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users', details: usersError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${users?.length || 0} users`);
    
    if (!users || users.length === 0) {
      console.log(`No active users found for source_app: ${source_app}`);
      return new Response(
        JSON.stringify({ success: true, sent_count: 0, message: 'No active users found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sentCount = 0;
    const notifications = [];

    // Process each user
    for (const user of users) {
      try {
        let notificationData = null;

        // Try to insert notification with user_id first
        const { data: primaryInsert, error: primaryError } = await supabase
          .from('Notifications')
          .insert({
            user_id: user.user_id,
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
            console.warn(`⚠️ FK violation for user ${user.user_id}, retrying with user_id = null`);
            
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
              console.error(`Error inserting anonymous notification for user ${user.user_id}:`, fallbackError);
              // Continue to try sending push even if DB insert failed
            } else {
              notificationData = fallbackInsert;
              notifications.push(notificationData);
            }
          } else {
            console.error(`Error inserting notification for user ${user.user_id}:`, primaryError);
            // Continue to try sending push even if DB insert failed
          }
        } else {
          notificationData = primaryInsert;
          notifications.push(notificationData);
        }

        // Send push notification via OneSignal if player_id exists
        // This happens regardless of whether DB insert succeeded
        if (user.onesignal_player_id) {
          try {
            const pushPayload: any = {
              app_id: oneSignalAppId,
              include_player_ids: [user.onesignal_player_id],
              headings: { en: title },
              contents: { en: message },
              data: {
                type: type,
                source_app: source_app,
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
              sentCount++;
              console.log(`✅ Push notification sent to user ${user.user_id}`);
            } else {
              const errorText = await oneSignalResponse.text();
              console.error(`OneSignal API error for user ${user.user_id}:`, errorText);
            }
          } catch (pushError) {
            console.error(`Failed to send push to user ${user.user_id}:`, pushError);
          }
        } else {
          console.log(`User ${user.user_id} has no OneSignal player_id, skipping push`);
        }
      } catch (userError) {
        console.error(`Error processing user ${user.user_id}:`, userError);
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
