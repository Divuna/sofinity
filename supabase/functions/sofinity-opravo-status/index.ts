import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
}

const log = (severity: string, message: string, context?: Record<string, any>) => {
  const logEntry = {
    severity,
    ts: new Date().toISOString(),
    fn: 'sofinity-opravo-status',
    message,
    ...context
  };
  console.log(`[${severity}] ${message}`, context ? JSON.stringify(context) : '');
  return logEntry;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  let result: {
    isConnected: boolean;
    lastChecked: string;
    error?: string;
  };

  try {
    log('INFO', 'Starting Opravo API status check');
    
    // Read configuration from environment
    const SOFINITY_BASE_URL = Deno.env.get('SOFINITY_BASE_URL') || 'https://api.sofinity.com';
    const SOFINITY_API_KEY = Deno.env.get('SOFINITY_API_KEY');
    
    if (!SOFINITY_API_KEY) {
      const error = 'SOFINITY_API_KEY not configured';
      log('ERROR', error);
      result = {
        isConnected: false,
        lastChecked: new Date().toISOString(),
        error: 'Opravo API klíč není nakonfigurován'
      };
    } else {
      log('INFO', 'Making request to Opravo API', { baseUrl: SOFINITY_BASE_URL });

      // Create abort controller with 5s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        log('WARN', 'Request timeout after 5s');
      }, 5000);

      try {
        const response = await fetch(`${SOFINITY_BASE_URL}/opravo-status`, {
          method: 'GET',
          headers: {
            'x-sofinity-key': SOFINITY_API_KEY,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const latencyMs = Date.now() - startTime;

        log('INFO', 'Received API response', {
          status: response.status,
          statusText: response.statusText,
          latencyMs
        });

        if (response.ok) {
          result = {
            isConnected: true,
            lastChecked: new Date().toISOString()
          };
          log('INFO', 'Opravo API is connected', { latencyMs, isConnected: true });
        } else {
          const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
          result = {
            isConnected: false,
            lastChecked: new Date().toISOString(),
            error: `Opravo API nedostupné: ${errorMsg}`
          };
          log('WARN', 'Opravo API returned error', { 
            status: response.status, 
            isConnected: false, 
            latencyMs,
            error: errorMsg 
          });
        }

      } catch (fetchError) {
        clearTimeout(timeoutId);
        const latencyMs = Date.now() - startTime;
        
        // Map common network errors to user-friendly messages
        let errorMessage = 'Neznámá chyba';
        if (fetchError instanceof Error) {
          const msg = fetchError.message.toLowerCase();
          if (msg.includes('network') || msg.includes('dns') || msg.includes('getaddrinfo')) {
            errorMessage = 'Opravo API nedostupné: Síťová chyba';
          } else if (msg.includes('timeout') || msg.includes('aborted')) {
            errorMessage = 'Opravo API nedostupné: Časový limit';
          } else if (msg.includes('econnrefused') || msg.includes('connection refused')) {
            errorMessage = 'Opravo API nedostupné: Spojení odmítnuto';
          } else if (msg.includes('tls') || msg.includes('ssl') || msg.includes('certificate')) {
            errorMessage = 'Opravo API nedostupné: TLS chyba';
          } else {
            errorMessage = `Opravo API nedostupné: ${fetchError.message}`;
          }
        }

        result = {
          isConnected: false,
          lastChecked: new Date().toISOString(),
          error: errorMessage
        };

        log('ERROR', 'Network error calling Opravo API', {
          isConnected: false,
          latencyMs,
          error: fetchError instanceof Error ? fetchError.message : 'Unknown error'
        });
      }
    }

  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    
    result = {
      isConnected: false,
      lastChecked: new Date().toISOString(),
      error: `Opravo API nedostupné: ${errorMsg}`
    };

    log('ERROR', 'Unexpected error in edge function', {
      isConnected: false,
      latencyMs,
      error: errorMsg
    });
  }

  // Always return 200 with standardized JSON response
  return new Response(
    JSON.stringify(result),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
});
