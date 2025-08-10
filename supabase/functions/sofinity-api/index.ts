import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

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
    const expected = Deno.env.get("SOFINITY_API_KEY") ?? "";
    const norm = (s = "") => s.replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g, " ")
                             .replace(/\s+/g, " ").trim();
    const x = norm(req.headers.get("x-api-key") ?? "");
    const a = norm(req.headers.get("authorization") ?? "");
    const bearer = a.toLowerCase().startsWith("bearer ") ? a.slice(7) : "";
    const provided = x || bearer;
    if (!provided || provided !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

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
      const body = await req.json().catch(() => ({}));
      console.log("ingest", { 
        ts: new Date().toISOString(), 
        keys: Object.keys(body||{}), 
        size: JSON.stringify(body).length 
      });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "requested path is invalid" }), {
      status: 404, 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in sofinity-api function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});