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
    fn: 'opravo-status',
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

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    log('INFO', 'Opravo status endpoint called');

    // Simulate a simple status check
    // In a real implementation, this could check actual Opravo API health
    const status = {
      status: 'ok',
      service: 'opravo-api',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };

    log('INFO', 'Opravo status check successful', { status: 'ok' });

    return new Response(
      JSON.stringify(status),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    
    log('ERROR', 'Error in opravo-status endpoint', { error: errorMsg });

    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});