import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the API key from environment and verify authentication
    const expected = Deno.env.get('SOFINITY_INTERNAL_API_KEY') ?? '';
    const h = req.headers;
    const keyFromX   = h.get('x-api-key') ?? '';
    const authHeader = h.get('authorization') ?? '';
    const keyFromAuth = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : '';
    const provided = keyFromX || keyFromAuth;
    if (!provided || provided !== expected) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse URL to get the path
    const url = new URL(req.url);
    const path = url.pathname;

    // Route handling
    if (req.method === 'GET' && path.endsWith('/health')) {
      return new Response(
        JSON.stringify({ ok: true }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'POST' && path.endsWith('/ingest')) {
      // Parse JSON body
      const body = await req.json();
      
      // Log minimal info about the request
      console.log('Sofinity API ingest request received:', {
        timestamp: new Date().toISOString(),
        bodyKeys: Object.keys(body || {}),
        bodySize: JSON.stringify(body).length
      });

      return new Response(
        JSON.stringify({ ok: true }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Return 404 for all other paths
    return new Response(
      JSON.stringify({ error: 'requested path is invalid' }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in sofinity-api function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});