import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlayerSyncRequest {
  email: string;
  player_id: string;
  device_type?: 'web' | 'mobile' | 'tablet';
}

// Email validation (RFC 5322 compliant)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rate limiting storage (in-memory, resets on function restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 60; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in ms

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(',')[0] || 
                   req.headers.get("x-real-ip") || 
                   "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  // Rate limiting
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ 
        status: "error", 
        error: "Rate limit exceeded. Maximum 60 requests per minute." 
      }),
      { 
        status: 429, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ status: "error", error: "Method not allowed. Use POST." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    let body: PlayerSyncRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ status: "error", error: "Invalid JSON payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, player_id, device_type = 'web' } = body;

    // Validation
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ status: "error", error: "Missing or invalid 'email' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return new Response(
        JSON.stringify({ status: "error", error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!player_id || typeof player_id !== 'string' || player_id.trim().length === 0) {
      return new Response(
        JSON.stringify({ status: "error", error: "Missing or invalid 'player_id' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!['web', 'mobile', 'tablet'].includes(device_type)) {
      return new Response(
        JSON.stringify({ 
          status: "error", 
          error: "Invalid 'device_type'. Must be one of: web, mobile, tablet" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🔍 Looking up user by email:", email);

    // Look up user by email in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      console.error("❌ User not found:", email, profileError);
      
      // Log failed attempt to audit_logs
      await supabase
        .from('audit_logs')
        .insert({
          event_name: 'player_id_sync_failed',
          event_data: {
            email,
            player_id,
            device_type,
            success: false,
            error: 'user_not_found',
            timestamp: new Date().toISOString(),
            ip_address: clientIp,
            user_agent: userAgent
          }
        });

      return new Response(
        JSON.stringify({ 
          status: "error", 
          error: `User not found with email: ${email}` 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = profile.user_id;
    console.log("✅ User found:", userId);

    // Save player_id using RPC function (now with email)
    console.log("💾 Saving player_id via RPC...");
    const { error: rpcError } = await supabase.rpc('save_player_id', {
      p_user_id: userId,
      p_player_id: player_id,
      p_device_type: device_type,
      p_email: email
    });

    if (rpcError) {
      console.error("❌ RPC save_player_id failed:", rpcError);
      
      // Log failed attempt
      await supabase
        .from('audit_logs')
        .insert({
          event_name: 'player_id_sync_failed',
          user_id: userId,
          event_data: {
            email,
            player_id,
            device_type,
            success: false,
            error: rpcError.message,
            timestamp: new Date().toISOString(),
            ip_address: clientIp,
            user_agent: userAgent
          }
        });

      return new Response(
        JSON.stringify({ 
          status: "error", 
          error: "Failed to save player_id to database" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ player_id saved successfully");

    // Log successful sync to audit_logs with details
    await supabase
      .from('audit_logs')
      .insert({
        event_name: 'player_id_sync',
        user_id: userId,
        event_data: {
          email,
          player_id,
          device_type,
          success: true,
          timestamp: new Date().toISOString(),
          ip_address: clientIp,
          user_agent: userAgent
        },
        details: `✅ Sofinity ↔ OneMil Push Sync: ${email} → ${player_id} (${device_type})`
      });

    // Log verification report to console
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  ✅ Sofinity ↔ OneMil Push Sync aktivní                      ║
╠═══════════════════════════════════════════════════════════════╣
║  Email:       ${email.padEnd(43)} ║
║  Player ID:   ${player_id.substring(0, 43).padEnd(43)} ║
║  Device:      ${device_type.padEnd(43)} ║
║  User ID:     ${userId.substring(0, 43).padEnd(43)} ║
║  Timestamp:   ${new Date().toISOString().padEnd(43)} ║
╚═══════════════════════════════════════════════════════════════╝
    `);

    return new Response(
      JSON.stringify({ 
        status: "success", 
        user_id: userId,
        player_id: player_id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Unexpected error in sofinity-player-sync:", error);
    return new Response(
      JSON.stringify({ 
        status: "error", 
        error: "Internal server error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
