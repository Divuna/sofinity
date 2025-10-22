import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";
import { verifyWebhookRequest, createUnauthorizedResponse } from '../_shared/webhook-security.ts';

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

  if (req.method !== "POST") {
    return createUnauthorizedResponse(corsHeaders);
  }

  // Verify webhook signature and security checks
  const secret = Deno.env.get('SOFINITY_WEBHOOK_SECRET') ?? '';
  const verification = await verifyWebhookRequest(req, 'insert_opravo_job', secret);
  
  if (!verification.valid) {
    return createUnauthorizedResponse(corsHeaders);
  }

  try {
    const jobData: OpravoJobRequest = await JSON.parse(await req.text());

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