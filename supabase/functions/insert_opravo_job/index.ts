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

interface OpravoJobRequest {
  id: string;
  popis?: string;
  kategorie?: string;
  lokalita?: string;
  fotka?: string | string[];
  urgentni?: boolean;
  latitude?: number;
  longitude?: number;
  user_id?: string;
  created_at?: string;
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
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate Authorization header
    const authHeader = req.headers.get("Authorization");
    const sharedKey = Deno.env.get("OPRAVO_SHARED_KEY");

    if (!authHeader || authHeader !== `Bearer ${sharedKey}`) {
      console.error("Invalid or missing authorization");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Unauthorized" 
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const jobData: OpravoJobRequest = await req.json();

    // Validate required fields
    if (!jobData.id) {
      console.error("Missing required field: id");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required field: id" 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Processing Opravo job:", { id: jobData.id, kategorie: jobData.kategorie });

    // Prepare data for insertion, mapping fotka to fotky array
    const insertData = {
      id: jobData.id,
      popis: jobData.popis || null,
      kategorie: jobData.kategorie || null,
      lokalita: jobData.lokalita || null,
      fotky: jobData.fotka ? (Array.isArray(jobData.fotka) ? jobData.fotka : [jobData.fotka]) : null,
      urgentni: jobData.urgentni || false,
      latitude: jobData.latitude || null,
      longitude: jobData.longitude || null,
      created_at: jobData.created_at || new Date().toISOString(),
    };

    // Insert data into opravo_jobs table
    const { data, error } = await supabase
      .from("opravo_jobs")
      .insert(insertData)
      .select();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Database insertion failed",
          details: error.message
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Job inserted successfully:", data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Job inserted successfully",
        data: data
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in insert_opravo_job function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Internal server error",
        details: error.message
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);