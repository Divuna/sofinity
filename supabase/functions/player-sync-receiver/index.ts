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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 60;
const RATE_LIMIT_WINDOW = 60 * 1000;

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // JWT authentication required
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error("❌ Chybí Authorization header");
    return new Response(
      JSON.stringify({ 
        status: "error",
        error: "Nepřihlášený - vyžadován Authorization header s Bearer tokenem"
      }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(',')[0] || 
                   req.headers.get("x-real-ip") || 
                   "unknown";

  if (!checkRateLimit(clientIp)) {
    console.warn(`⚠️ Překročen rate limit pro IP: ${clientIp}`);
    return new Response(
      JSON.stringify({ 
        status: "error", 
        error: "Překročen limit požadavků. Maximum 60 požadavků za minutu." 
      }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ status: "error", error: "Nepovolená metoda. Použij POST." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: PlayerSyncRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ status: "error", error: "Neplatný JSON" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, player_id, device_type = 'web' } = body;

    // Validace
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      return new Response(
        JSON.stringify({ status: "error", error: "Chybí nebo neplatný email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!player_id || typeof player_id !== 'string' || player_id.trim().length === 0) {
      return new Response(
        JSON.stringify({ status: "error", error: "Chybí nebo neplatný player_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!['web', 'mobile', 'tablet'].includes(device_type)) {
      return new Response(
        JSON.stringify({ 
          status: "error", 
          error: "Neplatný device_type. Musí být: web, mobile, nebo tablet" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Service role client pro vytvoření uživatele
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    
    // Anon client s JWT pro RLS
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    console.log("🔍 Hledám profil pro email:", email);

    // Zkontrolovat, jestli profil existuje
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();

    let userId: string | null = null;
    let profileCreated = false;

    if (profile) {
      userId = profile.user_id;
      console.log("✅ Profil nalezen:", userId);
    } else {
      console.log("⚠️ Profil neexistuje, vytvářím nový pro:", email);
      
      // Zkusit najít auth.users záznam
      const { data: authUsers } = await supabaseService.auth.admin.listUsers();
      const existingAuthUser = authUsers.users?.find(u => u.email === email);

      if (existingAuthUser) {
        userId = existingAuthUser.id;
        console.log("✅ Auth.users existuje, vytvářím profil:", userId);
        
        // Vytvořit profil pro existujícího auth uživatele
        const { error: profileInsertError } = await supabaseService
          .from('profiles')
          .insert({
            user_id: userId,
            email: email,
            name: email.split('@')[0],
            onboarding_complete: false
          });

        if (profileInsertError) {
          console.error("❌ Chyba při vytváření profilu:", profileInsertError);
          throw new Error(`Nepodařilo se vytvořit profil: ${profileInsertError.message}`);
        }

        profileCreated = true;
        console.log("✅ Profil vytvořen pro existujícího uživatele");
      } else {
        console.log("⚠️ Auth.users neexistuje, vytvářím nového uživatele");
        
        // Vytvořit nového auth uživatele (bez hesla - email only)
        const { data: newUser, error: createError } = await supabaseService.auth.admin.createUser({
          email: email,
          email_confirm: true,
          user_metadata: {
            source: 'onemil',
            auto_created: true
          }
        });

        if (createError || !newUser.user) {
          console.error("❌ Chyba při vytváření auth.users:", createError);
          throw new Error(`Nepodařilo se vytvořit uživatele: ${createError?.message}`);
        }

        userId = newUser.user.id;
        console.log("✅ Nový uživatel vytvořen:", userId);

        // Profil by měl být vytvořen automaticky triggerem, ale pro jistotu počkáme
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Ověřit, že profil existuje
        const { data: newProfile } = await supabaseService
          .from('profiles')
          .select('user_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (!newProfile) {
          // Vytvořit profil manuálně pokud trigger selhal
          await supabaseService
            .from('profiles')
            .insert({
              user_id: userId,
              email: email,
              name: email.split('@')[0],
              onboarding_complete: false
            });
        }

        profileCreated = true;
      }
    }

    // Zkontrolovat jestli existuje anonymní zařízení s tímto player_id nebo emailem
    console.log("🔍 Kontroluji existující anonymní zařízení...");
    const { data: existingDevice, error: deviceCheckError } = await supabaseService
      .from('user_devices')
      .select('id, player_id, email, user_id')
      .or(`player_id.eq.${player_id},email.eq.${email}`)
      .is('user_id', null)
      .maybeSingle();

    if (deviceCheckError) {
      console.error("❌ Chyba při kontrole zařízení:", deviceCheckError);
      throw new Error(`Nepodařilo se zkontrolovat zařízení: ${deviceCheckError.message}`);
    }

    let devicesUpdated = 0;

    if (existingDevice) {
      console.log("📱 Nalezeno anonymní zařízení, přiřazuji k uživateli:", existingDevice.id);
      
      // Aktualizovat existující anonymní zařízení
      const { error: updateError } = await supabaseService
        .from('user_devices')
        .update({
          user_id: userId,
          email: email,
          player_id: player_id,
          device_type: device_type,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingDevice.id);

      if (updateError) {
        console.error("❌ Chyba při aktualizaci zařízení:", updateError);
        
        await supabaseService
          .from('audit_logs')
          .insert({
            event_name: 'player_sync_receiver_failed',
            user_id: userId,
            event_data: {
              email,
              player_id,
              device_type,
              profile_created: profileCreated,
              error: updateError.message,
              timestamp: new Date().toISOString()
            }
          });

        throw new Error(`Nepodařilo se aktualizovat zařízení: ${updateError.message}`);
      }

      devicesUpdated = 1;
      console.info("✅ Player ID přiřazen k uživateli");
    } else {
      console.log("📱 Žádné anonymní zařízení nenalezeno, vytvářím nový záznam");
      
      // Vložit nové zařízení
      const { error: insertError } = await supabaseService
        .from('user_devices')
        .insert({
          user_id: userId,
          email: email,
          player_id: player_id,
          device_type: device_type,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error("❌ Chyba při vkládání zařízení:", insertError);
        
        await supabaseService
          .from('audit_logs')
          .insert({
            event_name: 'player_sync_receiver_failed',
            user_id: userId,
            event_data: {
              email,
              player_id,
              device_type,
              profile_created: profileCreated,
              error: insertError.message,
              timestamp: new Date().toISOString()
            }
          });

        throw new Error(`Nepodařilo se vložit zařízení: ${insertError.message}`);
      }

      console.info("✅ Player ID přiřazen k uživateli");
    }

    console.log("✅ Player_id úspěšně uložen", profileCreated ? "(nový profil vytvořen)" : "");

    // Log do audit_logs
    await supabaseService
      .from('audit_logs')
      .insert({
        event_name: 'player_sync_receiver_success',
        user_id: userId,
        event_data: {
          email,
          player_id,
          device_type,
          profile_created: profileCreated,
          devices_updated: devicesUpdated,
          timestamp: new Date().toISOString()
        },
        details: `✅ Player sync přijat: ${email} → ${player_id} (${device_type})${profileCreated ? ' [NOVÝ PROFIL]' : ''}${devicesUpdated > 0 ? ' [ZAŘÍZENÍ PŘIŘAZENO]' : ' [NOVÉ ZAŘÍZENÍ]'}`
      });

    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  ✅ Player Sync úspěšný                                      ║
╠═══════════════════════════════════════════════════════════════╣
║  Email:       ${email.padEnd(43)} ║
║  Player ID:   ${player_id.substring(0, 43).padEnd(43)} ║
║  Device:      ${device_type.padEnd(43)} ║
║  User ID:     ${userId.substring(0, 43).padEnd(43)} ║
║  Nový profil: ${(profileCreated ? 'ANO' : 'NE').padEnd(43)} ║
║  Aktualizováno: ${devicesUpdated.toString().padEnd(43)} ║
║  Timestamp:   ${new Date().toISOString().padEnd(43)} ║
╚═══════════════════════════════════════════════════════════════╝
    `);

    return new Response(
      JSON.stringify({ 
        status: "success", 
        user_id: userId,
        player_id: player_id,
        profile_created: profileCreated,
        devices_updated: devicesUpdated
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Neočekávaná chyba v player-sync-receiver:", error);
    return new Response(
      JSON.stringify({ 
        status: "error", 
        error: error instanceof Error ? error.message : "Interní chyba serveru"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
