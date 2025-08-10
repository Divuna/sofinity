import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Security settings
const ALLOWED_ORIGINS = [
  'https://rrmvxsldrjgbdxluklka.supabase.co',
  'http://localhost:5173',
  'http://localhost:3000'
];

const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60;
const requestCounts = new Map<string, { count: number; resetTime: number }>();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Will be set dynamically based on request
  'Access-Control-Allow-Headers': 'x-sofinity-key, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

const log = (severity: string, message: string, context?: Record<string, any>) => {
  const logEntry = {
    severity,
    ts: new Date().toISOString(),
    fn: 'opravo-status',
    message,
    latencyMs: context?.latencyMs,
    result: context?.result,
    clientIP: context?.clientIP,
    ...context
  };
  console.log(`[${severity}] ${message}`, context ? JSON.stringify(context) : '');
  return logEntry;
};

const checkRateLimit = (clientIP: string): { allowed: boolean; remaining: number } => {
  const now = Date.now();
  const key = clientIP;
  
  if (!requestCounts.has(key)) {
    requestCounts.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }
  
  const record = requestCounts.get(key)!;
  
  if (now > record.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }
  
  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count };
};

const getClientIP = (req: Request): string => {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  return forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
};

const validateOrigin = (req: Request): boolean => {
  const origin = req.headers.get('origin');
  if (!origin) return true; // Allow requests without origin (e.g., from server)
  return ALLOWED_ORIGINS.includes(origin);
};

serve(async (req) => {
  const startTime = Date.now();
  const clientIP = getClientIP(req);
  
  // Validate origin for CORS
  const origin = req.headers.get('origin');
  const dynamicCorsHeaders = {
    ...corsHeaders,
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: dynamicCorsHeaders });
  }

  // Check rate limit
  const rateLimitResult = checkRateLimit(clientIP);
  if (!rateLimitResult.allowed) {
    const latencyMs = Date.now() - startTime;
    log('WARN', 'Rate limit exceeded', { 
      clientIP, 
      latencyMs,
      result: 'rate_limited'
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)
      }),
      { 
        status: 429, 
        headers: { 
          ...dynamicCorsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(Date.now() + RATE_LIMIT_WINDOW_MS).toISOString()
        } 
      }
    );
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    const latencyMs = Date.now() - startTime;
    log('WARN', 'Method not allowed', { 
      method: req.method, 
      clientIP, 
      latencyMs,
      result: 'method_not_allowed'
    });
    
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { 
          ...dynamicCorsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
        } 
      }
    );
  }

  // Validate authorization using x-sofinity-key header
  const sofinityKey = req.headers.get('x-sofinity-key');
  const expectedKey = Deno.env.get('SOFINITY_API_KEY');
  
  if (!expectedKey) {
    const latencyMs = Date.now() - startTime;
    log('ERROR', 'SOFINITY_API_KEY not configured', { 
      clientIP, 
      latencyMs,
      result: 'server_error'
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Server configuration error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { 
          ...dynamicCorsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
        } 
      }
    );
  }

  if (!sofinityKey || sofinityKey !== expectedKey) {
    const latencyMs = Date.now() - startTime;
    log('WARN', 'Unauthorized access attempt', { 
      clientIP, 
      hasKey: !!sofinityKey,
      latencyMs,
      result: 'unauthorized'
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Unauthorized - Invalid or missing x-sofinity-key header',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 401, 
        headers: { 
          ...dynamicCorsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
        } 
      }
    );
  }

  try {
    log('INFO', 'Opravo status endpoint called', { clientIP });

    // Simulate status check with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout')), 5000);
    });

    const statusPromise = Promise.resolve({
      status: 'ok',
      service: 'opravo-api',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });

    const status = await Promise.race([statusPromise, timeoutPromise]);
    const latencyMs = Date.now() - startTime;

    log('INFO', 'Opravo status check successful', { 
      status: 'ok', 
      clientIP, 
      latencyMs,
      result: 'success'
    });

    return new Response(
      JSON.stringify(status),
      { 
        status: 200, 
        headers: { 
          ...dynamicCorsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
        } 
      }
    );

  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    
    log('ERROR', 'Error in opravo-status endpoint', { 
      error: errorMsg, 
      clientIP, 
      latencyMs,
      result: 'error'
    });

    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { 
          ...dynamicCorsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
        } 
      }
    );
  }
});