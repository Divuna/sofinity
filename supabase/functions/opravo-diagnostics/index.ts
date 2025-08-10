import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const host = req.headers.get('host') || url.host;

    if (req.method === 'GET') {
      // Health check endpoint
      return new Response(
        JSON.stringify({
          ok: true,
          name: "opravo-diagnostics",
          time: new Date().toISOString(),
          note: "healthcheck"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (req.method === 'POST') {
      // Self-test endpoint
      let body;
      try {
        body = await req.json();
      } catch {
        body = {};
      }

      const response = {
        ok: true,
        received: {
          app: body.app || null,
          action: body.action || null,
          safe: body.safe || null,
          timestamp: body.timestamp || null
        },
        host: host,
        status: "ready",
        tips: [
          "This endpoint only validates connectivity.",
          "No external calls are made here."
        ]
      };

      return new Response(
        JSON.stringify(response),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in opravo-diagnostics function:', error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: "Internal server error",
        message: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});