import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TIMESTAMP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_REQUESTS_PER_MINUTE = 60; // Rate limit per endpoint

interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
  shouldLog?: boolean;
}

/**
 * Verify HMAC-SHA256 signature for webhook requests
 * @param rawBody - Raw request body as string
 * @param timestamp - Timestamp from request header
 * @param signature - Signature from X-Signature header
 * @param secret - Shared secret for verification
 */
export async function verifyWebhookSignature(
  rawBody: string,
  timestamp: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    // Construct the signed payload: timestamp + raw body
    const signedPayload = `${timestamp}.${rawBody}`;
    
    // Import Web Crypto API key
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Generate HMAC signature
    const signatureBytes = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signedPayload)
    );
    
    // Convert to hex string
    const computedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Constant-time comparison to prevent timing attacks
    return constantTimeCompare(signature, computedSignature);
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Validate timestamp is within acceptable window (±5 minutes)
 */
export function validateTimestamp(timestamp: string): boolean {
  try {
    const requestTime = new Date(timestamp).getTime();
    const now = Date.now();
    const diff = Math.abs(now - requestTime);
    
    return diff <= TIMESTAMP_WINDOW_MS;
  } catch {
    return false;
  }
}

/**
 * Check for replay attack using idempotency key
 * @param supabase - Supabase client
 * @param idempotencyKey - Unique idempotency key for the request
 * @param endpoint - Endpoint name
 * @param timestamp - Request timestamp
 * @param sourceIp - Source IP address
 */
export async function checkReplayAttack(
  supabase: SupabaseClient,
  idempotencyKey: string,
  endpoint: string,
  timestamp: string,
  sourceIp?: string
): Promise<{ isReplay: boolean; error?: string }> {
  try {
    // Try to insert the request record
    const { error: insertError } = await supabase
      .from('webhook_requests')
      .insert({
        idempotency_key: idempotencyKey,
        endpoint: endpoint,
        timestamp: timestamp,
        source_ip: sourceIp || null
      });
    
    // If unique constraint violation, it's a replay
    if (insertError) {
      if (insertError.code === '23505') {
        return { isReplay: true, error: 'Duplicate request detected' };
      }
      console.error('Error checking replay:', insertError);
      return { isReplay: false, error: 'Database error' };
    }
    
    return { isReplay: false };
  } catch (error) {
    console.error('Replay check failed:', error);
    return { isReplay: false, error: 'Internal error' };
  }
}

/**
 * Check rate limiting for the endpoint
 * @param supabase - Supabase client
 * @param endpoint - Endpoint name
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  endpoint: string
): Promise<{ limited: boolean; requestCount?: number }> {
  try {
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    
    // Count requests in the last minute
    const { count, error } = await supabase
      .from('webhook_requests')
      .select('*', { count: 'exact', head: true })
      .eq('endpoint', endpoint)
      .gte('timestamp', oneMinuteAgo);
    
    if (error) {
      console.error('Rate limit check error:', error);
      return { limited: false };
    }
    
    const requestCount = count || 0;
    return {
      limited: requestCount >= MAX_REQUESTS_PER_MINUTE,
      requestCount
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return { limited: false };
  }
}

/**
 * Complete webhook request verification
 * Performs signature, timestamp, replay, and rate limit checks
 */
export async function verifyWebhookRequest(
  req: Request,
  endpoint: string,
  secret: string
): Promise<WebhookVerificationResult> {
  try {
    // Extract headers
    const signature = req.headers.get('x-signature');
    const timestamp = req.headers.get('x-timestamp');
    const idempotencyKey = req.headers.get('x-idempotency-key');
    
    // Validate required headers
    if (!signature || !timestamp || !idempotencyKey) {
      return { valid: false, error: 'Unauthorized', shouldLog: false };
    }
    
    // Validate timestamp window
    if (!validateTimestamp(timestamp)) {
      return { valid: false, error: 'Unauthorized', shouldLog: false };
    }
    
    // Get raw body for signature verification
    const rawBody = await req.text();
    
    // Verify HMAC signature
    const signatureValid = await verifyWebhookSignature(
      rawBody,
      timestamp,
      signature,
      secret
    );
    
    if (!signatureValid) {
      return { valid: false, error: 'Unauthorized', shouldLog: false };
    }
    
    // Initialize Supabase client for replay and rate limit checks
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Check rate limiting
    const { limited, requestCount } = await checkRateLimit(supabase, endpoint);
    if (limited) {
      console.warn(`Rate limit exceeded for ${endpoint}: ${requestCount} requests/min`);
      return { valid: false, error: 'Unauthorized', shouldLog: false };
    }
    
    // Check for replay attack
    const sourceIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     req.headers.get('x-real-ip') ||
                     undefined;
    
    const { isReplay } = await checkReplayAttack(
      supabase,
      idempotencyKey,
      endpoint,
      timestamp,
      sourceIp
    );
    
    if (isReplay) {
      return { valid: false, error: 'Unauthorized', shouldLog: false };
    }
    
    // All checks passed - parse and return body
    return { valid: true };
  } catch (error) {
    console.error('Webhook verification error:', error);
    return { valid: false, error: 'Unauthorized', shouldLog: false };
  }
}

/**
 * Create a generic 401 response without details
 */
export function createUnauthorizedResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}