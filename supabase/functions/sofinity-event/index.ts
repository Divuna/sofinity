import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

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
  metadata?: Record<string, any>;
  user_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      console.error("Method not allowed:", req.method);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Method not allowed" 
        }),
        {
          status: 405,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate API key for external calls
    const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
    const expectedApiKey = Deno.env.get("SOFINITY_API_KEY");
    
    if (!apiKey || apiKey !== expectedApiKey) {
      console.error("Invalid or missing API key");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Unauthorized" 
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const eventData: SofinityEventRequest = await req.json();

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

    console.log("Processing Sofinity event:", { 
      project_id: eventData.project_id, 
      event_name: eventData.event_name 
    });

    // Standardize the event name before processing
    const standardizeResponse = await supabase.functions.invoke('standardize-event', {
      body: {
        source_system: 'sofinity',
        original_event: eventData.event_name,
        project_id: eventData.project_id
      }
    });

    let standardizedEventName = eventData.event_name;
    if (standardizeResponse.data?.success) {
      standardizedEventName = standardizeResponse.data.standardized_event;
      console.log("Event standardized:", {
        original: eventData.event_name,
        standardized: standardizedEventName,
        was_mapped: standardizeResponse.data.was_mapped
      });
    } else {
      console.warn("Event standardization failed, using original name:", 
        standardizeResponse.error || "Unknown error");
    }

    // Get user agent and IP for audit trail
    const userAgent = req.headers.get("user-agent") || null;
    const clientIP = req.headers.get("x-forwarded-for") || 
                     req.headers.get("x-real-ip") || 
                     null;

    // Insert into EventLogs table (primary event storage) with standardized event name
    const eventLogData = {
      project_id: eventData.project_id,
      user_id: eventData.user_id || null,
      event_name: standardizedEventName,
      metadata: {
        ...eventData.metadata || {},
        original_event_name: eventData.event_name !== standardizedEventName ? eventData.event_name : undefined
      },
      contest_id: eventData.metadata?.contest_id || null
    };

    const { data: eventLogResult, error: eventLogError } = await supabase
      .from("EventLogs")
      .insert(eventLogData)
      .select()
      .single();

    if (eventLogError) {
      console.error("EventLogs insertion error:", eventLogError);
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

    // Insert into AIRequests table for campaign analysis with standardized event name
    const aiRequestData = {
      type: 'sofinity_integration',
      prompt: `Sofinity event: ${standardizedEventName}`,
      project_id: eventData.project_id,
      event_name: standardizedEventName,
      metadata: {
        ...eventData.metadata || {},
        original_event_name: eventData.event_name !== standardizedEventName ? eventData.event_name : undefined
      },
      user_id: eventData.user_id || null,
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

    // Insert into audit_logs table with standardized event name
    const auditData = {
      user_id: eventData.user_id || null,
      project_id: eventData.project_id,
      event_name: standardizedEventName,
      event_data: {
        ...eventData.metadata || {},
        original_event_name: eventData.event_name !== standardizedEventName ? eventData.event_name : undefined
      },
      ip_address: clientIP,
      user_agent: userAgent
    };

    const { data: auditResult, error: auditError } = await supabase
      .from("audit_logs")
      .insert(auditData)
      .select()
      .single();

    if (auditError) {
      console.error("Audit log insertion error:", auditError);
      // Continue execution even if audit log fails
    }

    console.log("Event processed successfully:", {
      event_log_id: eventLogResult.id,
      ai_request_id: aiRequestResult?.id,
      audit_log_id: auditResult?.id
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Event processed successfully",
        event_log_id: eventLogResult.id,
        ai_request_id: aiRequestResult?.id,
        audit_log_id: auditResult?.id
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in sofinity-event function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Internal server error",
        details: error.message
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);