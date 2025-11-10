import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRecord {
  id: string;
  event_id: string;
  event_name: string;
  user_id: string;
  payload: any;
  target_email?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch OneSignal credentials from settings table
    const { data: settingsData, error: settingsError } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["onesignal_app_id", "onesignal_rest_api_key"]);

    if (settingsError) {
      console.error("Error fetching OneSignal settings:", settingsError);
    }

    const onesignalAppId = settingsData?.find(s => s.key === "onesignal_app_id")?.value;
    const onesignalApiKey = settingsData?.find(s => s.key === "onesignal_rest_api_key")?.value;

    // Fetch pending notifications from queue
    const { data: notifications, error: fetchError } = await supabase
      .from("NotificationQueue")
      .select("*")
      .eq("status", "pending")
      .limit(10);

    if (fetchError) {
      throw fetchError;
    }

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending notifications" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${notifications.length} notifications`);

    const results = { sent: 0, failed: 0, details: [] as any[] };

    for (const notification of notifications as NotificationRecord[]) {
      let pushSent = false;
      let emailSent = false;
      
      try {
        // Get user email and OneSignal player_ids from user_devices (multi-device support)
        let recipientEmail = notification.target_email;
        let playerIdsForPush: string[] = [];

        if (notification.user_id) {
          // Fetch all devices for this user
          const { data: devices } = await supabase
            .from("user_devices")
            .select("player_id")
            .eq("user_id", notification.user_id);

          playerIdsForPush = devices?.map(d => d.player_id).filter(Boolean) || [];

          // Get email from profiles if not provided
          if (!recipientEmail) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email")
              .eq("user_id", notification.user_id)
              .single();
            
            recipientEmail = profile?.email;
          }
        }

        // Send OneSignal push notification if credentials are available and user has player_ids
        if (onesignalAppId && onesignalApiKey && playerIdsForPush.length > 0) {
          try {
            const pushTitle = notification.payload?.title || "Oznámení";
            const pushMessage = notification.payload?.message || "Máte nové oznámení";

            console.log(`🔔 Sending push to ${playerIdsForPush.length} device(s) for notification ${notification.id}...`);
            console.log('🔐 Using OneSignal auth scheme:', 'Key *****' + onesignalApiKey.slice(-6));

            // Use OneSignal API host directly (avoid redirects that drop Authorization)
            const onesignalUrl = "https://api.onesignal.com/notifications";
            console.log('➡️  URL:', onesignalUrl);

            const pushResponse = await fetch(onesignalUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Key ${onesignalApiKey}`,
              },
              body: JSON.stringify({
                app_id: onesignalAppId,
                include_player_ids: playerIdsForPush,
                headings: { en: pushTitle, cs: pushTitle },
                contents: { en: pushMessage, cs: pushMessage },
                data: {
                  notification_id: notification.id,
                  event_id: notification.event_id,
                },
              }),
            });

            const pushStatusCode = pushResponse.status;
            console.log(`📊 Push response status: ${pushStatusCode}`);

            if (pushResponse.ok) {
              const pushResult = await pushResponse.json();
              console.log(`✅ Push notification sent for ${notification.id}:`, pushResult);
              pushSent = true;
              
              // Log to push_log table
              try {
                await supabase.from("push_log").insert({
                  player_id: playerIdsForPush[0], // Log first player_id
                  status_code: pushStatusCode,
                  response_body: JSON.stringify(pushResult),
                  status: "sent",
                });
              } catch (logError) {
                console.error("⚠️  Error logging to push_log:", logError);
              }
            } else {
              const errorText = await pushResponse.text();
              console.error(`❌ Push notification failed for ${notification.id}: ${errorText}`);
              pushSent = false;
              
              // Log failed push
              try {
                await supabase.from("push_log").insert({
                  player_id: playerIdsForPush[0],
                  status_code: pushStatusCode,
                  response_body: errorText,
                  status: "failed",
                });
              } catch (logError) {
                console.error("⚠️  Error logging failed push:", logError);
              }
            }
          } catch (pushError: any) {
            console.error(`💥 Error sending push notification for ${notification.id}:`, pushError);
            pushSent = false;
          }
        } else {
          console.log(`⚠️  Push not sent for ${notification.id}: no devices or OneSignal not configured`);
        }

        // Send email if configured
        if (recipientEmail && resendApiKey) {
          console.log(`📧 Sending email to ${recipientEmail} for notification ${notification.id}...`);

          // Prepare email content based on event type
          let subject = "";
          let htmlContent = "";

          switch (notification.event_name) {
            case "campaign_published":
              subject = "Kampaň byla publikována";
              htmlContent = `
                <h1>Vaše kampaň byla úspěšně publikována</h1>
                <p>Kampaň byla publikována a je nyní aktivní.</p>
                <p><strong>Detaily:</strong></p>
                <pre>${JSON.stringify(notification.payload, null, 2)}</pre>
              `;
              break;
            case "campaign_deleted":
              subject = "Kampaň byla smazána";
              htmlContent = `
                <h1>Kampaň byla smazána</h1>
                <p>Kampaň byla trvale odstraněna ze systému.</p>
                <p><strong>Detaily:</strong></p>
                <pre>${JSON.stringify(notification.payload, null, 2)}</pre>
              `;
              break;
            default:
              subject = `Notifikace: ${notification.event_name}`;
              htmlContent = `
                <h1>Systémová notifikace</h1>
                <p><strong>Událost:</strong> ${notification.event_name}</p>
                <p><strong>Detaily:</strong></p>
                <pre>${JSON.stringify(notification.payload, null, 2)}</pre>
              `;
          }

          try {
            // Send email via Resend
            const resendResponse = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "OneMil <noreply@opravo.cz>",
                to: [recipientEmail],
                subject: subject,
                html: htmlContent,
              }),
            });

            if (resendResponse.ok) {
              const emailResult = await resendResponse.json();
              console.log(`✅ Email sent successfully for ${notification.id}:`, emailResult);
              emailSent = true;
            } else {
              const errorText = await resendResponse.text();
              console.error(`❌ Email failed for ${notification.id}: ${errorText}`);
              emailSent = false;
            }
          } catch (emailError: any) {
            console.error(`💥 Error sending email for ${notification.id}:`, emailError);
            emailSent = false;
          }
        } else {
          console.log(`⚠️  Email not sent for ${notification.id}: no email or RESEND_API_KEY`);
        }

        // Update notification status based on what was successfully sent
        const finalStatus = (pushSent || emailSent) ? "sent" : "failed";
        const sentVia = pushSent && emailSent ? "email_and_push" : 
                        pushSent ? "push_only" : 
                        emailSent ? "email_only" : "none";

        await supabase
          .from("NotificationQueue")
          .update({ 
            status: finalStatus,
            payload: {
              ...notification.payload,
              sent_at: new Date().toISOString(),
              sent_via: sentVia
            }
          })
          .eq("id", notification.id);

        console.log(`✅ Notification ${notification.id} marked as ${finalStatus} (${sentVia})`);

        if (finalStatus === "sent") {
          results.sent++;
        } else {
          results.failed++;
        }

        results.details.push({
          notification_id: notification.id,
          status: finalStatus,
          sent_via: sentVia,
        });

      } catch (error: any) {
        console.error(`💥 Error processing notification ${notification.id}:`, error);
        
        // Update notification status to failed
        await supabase
          .from("NotificationQueue")
          .update({ 
            status: "failed",
            payload: {
              ...notification.payload,
              error: error.message,
              failed_at: new Date().toISOString()
            }
          })
          .eq("id", notification.id);

        results.failed++;
        results.details.push({
          notification_id: notification.id,
          status: "failed",
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        processed: notifications.length,
        sent: results.sent,
        failed: results.failed,
        details: results.details
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in process-notification-queue:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
