import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";
import { verifyWebhookRequest, createUnauthorizedResponse } from '../_shared/webhook-security.ts';

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface SofinityEventRequest {
  project_id: string;
  event_name: string;
  source_system?: string; // e.g., 'onemill', 'opravo', 'bikeshare24', 'codneska'
  metadata?: Record<string, any>;
  user_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle test ping requests (allow without signature for monitoring)
  if (req.headers.get('x-test-ping') === 'true') {
    console.log('🏓 Test ping received');
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Sofinity event function is operational',
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (req.method !== "POST") {
    return createUnauthorizedResponse(corsHeaders);
  }

  // Verify webhook signature and security checks
  const secret = Deno.env.get('SOFINITY_WEBHOOK_SECRET') ?? '';
  const verification = await verifyWebhookRequest(req, 'sofinity-event', secret);
  
  if (!verification.valid) {
    return createUnauthorizedResponse(corsHeaders);
  }

  try {
    // Use the rawBody returned from verification (body already consumed during signature check)
    const eventData: SofinityEventRequest = JSON.parse(verification.rawBody || '{}');

    // Validate required fields
    if (!eventData.project_id || !eventData.event_name) {
      console.error("Missing required fields:", { project_id: eventData.project_id, event_name: eventData.event_name });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required fields: project_id and event_name" 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Handle missing user_id with safe placeholder
    const safeUserId = eventData.user_id || '00000000-0000-0000-0000-000000000000';
    const userIdWasPlaceholder = !eventData.user_id;

    if (userIdWasPlaceholder) {
      console.log("⚠️ Missing user_id - using safe placeholder UUID for event logging");
    }

    // Check if this is a test request
    const isTestRequest = req.headers.get('x-test-request') === 'true';

    // Known OneMil events for auto-detection
    const oneMilEvents = [
      'prize_won', 
      'coin_redeemed', 
      'voucher_purchased', 
      'user_registered', 
      'notification_sent', 
      'contest_closed'
    ];

    // Determine source system with automatic OneMil detection or test override
    let sourceSystem = eventData.source_system;
    
    if (isTestRequest) {
      sourceSystem = 'manual_test';
      console.log("🧪 Manual test mode activated");
    } else if (!sourceSystem) {
      // Auto-detect OneMil based on event name
      if (oneMilEvents.includes(eventData.event_name)) {
        sourceSystem = 'onemill';
        console.log("🔍 Auto-detected OneMil event:", {
          event_name: eventData.event_name,
          inferred_source: 'onemill'
        });
      } else {
        sourceSystem = 'sofinity';
      }
    }
    
    console.log("📥 Incoming Sofinity event:", { 
      source_system: sourceSystem,
      project_id: eventData.project_id, 
      original_event: eventData.event_name,
      timestamp: new Date().toISOString()
    });

    // Standardize the event name before processing
    console.log("🔄 Calling standardize-event function...", {
      source_system: sourceSystem,
      original_event: eventData.event_name
    });

    const standardizeResponse = await supabase.functions.invoke('standardize-event', {
      body: {
        source_system: sourceSystem,
        original_event: eventData.event_name,
        project_id: eventData.project_id
      }
    });

    let standardizedEventName = eventData.event_name;
    let wasMapped = false;

    if (standardizeResponse.data?.success) {
      standardizedEventName = standardizeResponse.data.standardized_event;
      wasMapped = standardizeResponse.data.was_mapped;
      
      console.log("✅ Event standardized successfully:", {
        source_system: sourceSystem,
        original_event: eventData.event_name,
        standardized_event: standardizedEventName,
        was_mapped: wasMapped,
        mapping_status: wasMapped ? "MAPPED" : "UNMAPPED (using original)"
      });
    } else {
      console.warn("⚠️ Event standardization failed, using original name:", {
        source_system: sourceSystem,
        original_event: eventData.event_name,
        error: standardizeResponse.error || "Unknown error"
      });
    }

    // Get user agent and IP for audit trail
    const userAgent = req.headers.get("user-agent") || null;
    const clientIP = req.headers.get("x-forwarded-for") || 
                     req.headers.get("x-real-ip") || 
                     null;
    
    // Sanitize IP: if multiple IPs (comma-separated), use only the first
    const sanitizedIP = clientIP ? clientIP.split(',')[0].trim() : null;

    // Insert into EventLogs table (primary event storage) with standardized event name
    const eventLogData = {
      project_id: eventData.project_id,
      user_id: safeUserId,
      event_name: standardizedEventName,
      source_system: sourceSystem, // Direct column, not in metadata
      metadata: {
        ...eventData.metadata || {},
        original_event_name: eventData.event_name !== standardizedEventName ? eventData.event_name : undefined,
        was_mapped: wasMapped,
        ...(isTestRequest && {
          test: true,
          note: "Supabase internal verification"
        })
      },
      contest_id: eventData.metadata?.contest_id || null
    };

    console.log("💾 Inserting into EventLogs:", {
      event_name: standardizedEventName,
      source_system: sourceSystem,
      project_id: eventData.project_id
    });

    let { data: eventLogResult, error: eventLogError } = await supabase
      .from("EventLogs")
      .insert(eventLogData)
      .select()
      .single();

    // Self-healing: If EventLogs insert fails due to missing user FK, create system profile
    if (eventLogError) {
      if (eventLogError.code === '23503' && eventLogError.message.includes('eventlogs_user_id_fkey')) {
        console.log("🔧 Self-healing: Creating missing system profile for placeholder user");
        
        // Check if system profile exists
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("user_id", "00000000-0000-0000-0000-000000000000")
          .single();

        if (!existingProfile) {
          // Create system profile
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              user_id: "00000000-0000-0000-0000-000000000000",
              email: "system@sofinity.local",
              role: "admin",
              name: "System User"
            });

          if (profileError) {
            console.error("❌ Failed to create system profile:", profileError);
          } else {
            console.log("✅ System profile created successfully");
            
            // Retry EventLogs insert
            const retryResult = await supabase
              .from("EventLogs")
              .insert(eventLogData)
              .select()
              .single();
            
            eventLogResult = retryResult.data;
            eventLogError = retryResult.error;
          }
        }
      }

      // If still erroring after self-heal attempt
      if (eventLogError) {
        console.error("❌ EventLogs insertion error:", eventLogError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Failed to insert event log",
            details: eventLogError.message
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    console.log("✅ EventLog created:", {
      event_log_id: eventLogResult.id,
      standardized_event: standardizedEventName,
      source_system: sourceSystem
    });

    // Process player_id for push notifications if present in metadata
    if (eventData.metadata?.player_id && safeUserId !== '00000000-0000-0000-0000-000000000000') {
      console.log("🔑 Detected player_id in event metadata, saving to user_devices", {
        user_id: safeUserId,
        player_id: eventData.metadata.player_id,
        device_type: eventData.metadata.device_type || 'mobile'
      });
      
      try {
        // Save to user_devices via RPC
        const { error: playerIdError } = await supabase.rpc('save_player_id', {
          p_user_id: safeUserId,
          p_player_id: eventData.metadata.player_id,
          p_device_type: eventData.metadata.device_type || 'mobile'
        });
        
        if (playerIdError) {
          console.error("❌ Failed to save player_id to user_devices:", playerIdError);
        } else {
          console.log("✅ player_id saved successfully to user_devices");
          
          // Also update profiles.onesignal_player_id for backward compatibility
          const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({ onesignal_player_id: eventData.metadata.player_id })
            .eq('user_id', safeUserId);
          
          if (profileUpdateError) {
            console.error("❌ Failed to update profiles.onesignal_player_id:", profileUpdateError);
          } else {
            console.log("✅ profiles.onesignal_player_id updated successfully");
          }
        }
      } catch (playerError) {
        console.error("❌ Error processing player_id:", playerError);
        // Continue processing - don't fail the entire event
      }
    } else if (eventData.metadata?.player_id && safeUserId === '00000000-0000-0000-0000-000000000000') {
      console.warn("⚠️ player_id detected but user_id is placeholder - cannot save to user_devices");
    }

    // Insert into AIRequests table for campaign analysis with standardized event name
    // Set type to 'evaluator' to comply with AIRequests_type_check constraint
    
    // Sanitize source_system: must be in ['sofinity', 'onemil', 'system'], otherwise default to 'sofinity'
    const validSources = ['sofinity', 'onemil', 'system'];
    const sanitizedSource = validSources.includes(sourceSystem) ? sourceSystem : 'sofinity';
    
    const aiRequestData = {
      type: 'evaluator',
      prompt: `Sofinity event: ${standardizedEventName}`,
      project_id: eventData.project_id,
      event_name: standardizedEventName,
      metadata: {
        ...eventData.metadata || {},
        source_system: sanitizedSource,
        original_event_name: eventData.event_name !== standardizedEventName ? eventData.event_name : undefined,
        client_ip: sanitizedIP
      },
      user_id: safeUserId,
      status: 'completed'
    };

    const { data: aiRequestResult, error: aiRequestError } = await supabase
      .from("AIRequests")
      .insert(aiRequestData)
      .select()
      .single();

    if (aiRequestError) {
      console.error("AIRequests insertion error:", aiRequestError);
      // Continue even if AIRequests fails - EventLog is primary
    }

    // Insert into audit_logs table with standardized event name and source detection
    const auditData = {
      user_id: safeUserId,
      project_id: eventData.project_id,
      event_name: standardizedEventName,
      event_data: {
        ...eventData.metadata || {},
        source_system: sourceSystem,
        original_event_name: eventData.event_name !== standardizedEventName ? eventData.event_name : undefined,
        was_mapped: wasMapped,
        standardization_timestamp: new Date().toISOString(),
        ...(userIdWasPlaceholder && {
          user_id_placeholder: true,
          user_id_note: "Missing user_id replaced with safe placeholder UUID"
        })
      },
      ip_address: sanitizedIP,
      user_agent: userAgent
    };

    console.log("📋 Audit log data:", {
      event_name: standardizedEventName,
      source_system: sourceSystem,
      was_mapped: wasMapped,
      has_original_name: eventData.event_name !== standardizedEventName
    });

    const { data: auditResult, error: auditError } = await supabase
      .from("audit_logs")
      .insert(auditData)
      .select()
      .single();

    if (auditError) {
      console.error("Audit log insertion error:", auditError);
      // Continue execution even if audit log fails
    }

    console.log("🎉 Event processed successfully:", {
      source_system: sourceSystem,
      original_event: eventData.event_name,
      standardized_event: standardizedEventName,
      was_mapped: wasMapped,
      event_log_id: eventLogResult.id,
      ai_request_id: aiRequestResult?.id,
      audit_log_id: auditResult?.id,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: isTestRequest ? "Test event accepted successfully" : "Event processed successfully",
        source_system: sourceSystem,
        original_event: eventData.event_name,
        standardized_event: standardizedEventName,
        was_mapped: wasMapped,
        event_log_id: eventLogResult.id,
        ai_request_id: aiRequestResult?.id,
        audit_log_id: auditResult?.id,
        ...(isTestRequest && { test_mode: true })
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    // Don't log error details
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Internal error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);