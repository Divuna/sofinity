import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { verifyWebhookRequest, createUnauthorizedResponse } from '../_shared/webhook-security.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let path = url.pathname.replace(/\/+$/,'');
    if (path === "" || path === "/") path = "/sofinity-api/ingest";

    if (req.method === "GET" && path.endsWith("/health")) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && path.endsWith("/ingest")) {
      // Verify webhook signature
      const secret = Deno.env.get('SOFINITY_WEBHOOK_SECRET') ?? '';
      const verification = await verifyWebhookRequest(req, 'sofinity-api', secret);
      
      if (!verification.valid) {
        return createUnauthorizedResponse(corsHeaders);
      }

      const body = await JSON.parse(await req.text()).catch(() => ({}));
      // Don't log request details
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return createUnauthorizedResponse(corsHeaders);
  } catch (error) {
    // Don't log error details
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});