import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SofinityStatusRequest {
  project_id?: string;
}

interface SofinityStatusResponse {
  isConnected: boolean;
  lastChecked: string;
  error?: string;
  httpStatus?: number;
  latency?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { project_id } = await req.json() as SofinityStatusRequest;

    console.log('🔍 [sofinity-status] Checking Sofinity event function availability', { project_id });

    // Test ping to sofinity-event function
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    const testPingUrl = `${supabaseUrl}/functions/v1/sofinity-event`;
    
    const testStart = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    try {
      const response = await fetch(testPingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-ping': 'true',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          project_id: project_id || 'test',
          event_name: 'test_ping',
          source_system: 'status_check',
          metadata: {
            check_timestamp: new Date().toISOString()
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const testLatency = Date.now() - testStart;

      console.log('📡 [sofinity-status] Ping response:', { 
        status: response.status, 
        latency: testLatency,
        ok: response.ok 
      });

      if (response.ok) {
        const result: SofinityStatusResponse = {
          isConnected: true,
          lastChecked: new Date().toISOString(),
          httpStatus: response.status,
          latency: testLatency
        };

        return new Response(
          JSON.stringify(result),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } else {
        const errorText = await response.text();
        console.error('❌ [sofinity-status] Non-OK response:', { 
          status: response.status, 
          errorText 
        });

        const result: SofinityStatusResponse = {
          isConnected: false,
          lastChecked: new Date().toISOString(),
          error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`,
          httpStatus: response.status,
          latency: testLatency
        };

        return new Response(
          JSON.stringify(result),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

    } catch (pingError) {
      clearTimeout(timeoutId);
      const testLatency = Date.now() - testStart;
      
      console.error('❌ [sofinity-status] Ping failed:', pingError);

      let errorMessage = 'Network error';
      if (pingError instanceof Error) {
        if (pingError.name === 'AbortError') {
          errorMessage = 'Request timeout (5s)';
        } else {
          errorMessage = pingError.message;
        }
      }

      const result: SofinityStatusResponse = {
        isConnected: false,
        lastChecked: new Date().toISOString(),
        error: errorMessage,
        latency: testLatency
      };

      return new Response(
        JSON.stringify(result),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    const totalLatency = Date.now() - startTime;
    console.error('❌ [sofinity-status] Unexpected error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    const result: SofinityStatusResponse = {
      isConnected: false,
      lastChecked: new Date().toISOString(),
      error: errorMessage,
      latency: totalLatency
    };

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
