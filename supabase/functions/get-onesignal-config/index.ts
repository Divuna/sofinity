import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔑 Fetching OneSignal App ID from Edge Function secrets');
    
    // Get OneSignal App ID from Edge Function secrets
    const appId = Deno.env.get('ONESIGNAL_APP_ID');
    
    if (!appId) {
      console.error('❌ ONESIGNAL_APP_ID not configured in Edge Function secrets');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'OneSignal App ID not configured' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 500 
        }
      );
    }
    
    console.log('✅ OneSignal App ID retrieved:', appId.substring(0, 8) + '...');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        appId 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );
    
  } catch (error) {
    console.error('💥 Error fetching OneSignal config:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});
