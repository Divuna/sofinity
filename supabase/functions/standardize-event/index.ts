import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StandardizeEventRequest {
  source_system: string;
  original_event: string;
  project_id?: string;
}

interface StandardizeEventResponse {
  success: boolean;
  standardized_event: string;
  was_mapped: boolean;
  original_event: string;
  error?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
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

    const requestData: StandardizeEventRequest = await req.json();

    if (!requestData.source_system || !requestData.original_event) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required fields: source_system and original_event" 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Standardizing event:", {
      source_system: requestData.source_system,
      original_event: requestData.original_event
    });

    // Look up the event mapping in EventTypes table
    const { data: eventMapping, error: lookupError } = await supabase
      .from("EventTypes")
      .select("standardized_event, description")
      .eq("source_system", requestData.source_system)
      .eq("original_event", requestData.original_event)
      .maybeSingle();

    if (lookupError) {
      console.error("Error looking up event mapping:", lookupError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to lookup event mapping",
          details: lookupError.message
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    let standardizedEvent: string;
    let wasMapped: boolean;

    if (eventMapping) {
      // Found a mapping, use the standardized event name
      standardizedEvent = eventMapping.standardized_event;
      wasMapped = true;
      console.log("Event mapped:", {
        original: requestData.original_event,
        standardized: standardizedEvent,
        description: eventMapping.description
      });
    } else {
      // No mapping found, use original event name and log to audit
      standardizedEvent = requestData.original_event;
      wasMapped = false;
      
      console.warn("Unmapped event detected:", {
        source_system: requestData.source_system,
        original_event: requestData.original_event
      });

      // Log unmapped event to audit_logs for tracking
      const { error: auditError } = await supabase
        .from("audit_logs")
        .insert({
          event_name: "unmapped_event_detected",
          project_id: requestData.project_id || null,
          event_data: {
            source_system: requestData.source_system,
            original_event: requestData.original_event,
            timestamp: new Date().toISOString(),
            severity: "info"
          }
        });

      if (auditError) {
        console.error("Failed to log unmapped event to audit:", auditError);
        // Continue execution even if audit logging fails
      }
    }

    const response: StandardizeEventResponse = {
      success: true,
      standardized_event: standardizedEvent,
      was_mapped: wasMapped,
      original_event: requestData.original_event
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in standardize-event function:", error);
    
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
