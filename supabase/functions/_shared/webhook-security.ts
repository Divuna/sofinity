import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TIMESTAMP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_REQUESTS_PER_MINUTE = 60; // Rate limit per endpoint

interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
  shouldLog?: boolean;
  rawBody?: string; // Return the raw body so it can be reused
  apiKeyUsed?: string; // API key provided by caller (if any), used for HMAC
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
    // Construct the signed payload: timestamp + raw body (no separator, matching OneMil)
    const signedPayload = `${timestamp}${rawBody}`;
    
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
    
    // Convert signatures to comparable formats
    const bytes = new Uint8Array(signatureBytes);
    const computedHex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const computedBase64 = btoa(String.fromCharCode(...bytes));

    // Normalize incoming signature
    let incoming = signature.trim();
    if (/^sha256=/i.test(incoming)) {
      incoming = incoming.split('=')[1];
    }
    const incomingHex = incoming.toLowerCase();
    const isHex64 = /^[0-9a-f]{64}$/.test(incomingHex);

    // Constant-time comparison to prevent timing attacks
    if (isHex64) {
      return constantTimeCompare(incomingHex, computedHex);
    } else {
      return constantTimeCompare(incoming, computedBase64);
    }
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
 * @param req - Request object
 * @param endpoint - Endpoint name for rate limiting
 * @param secret - Fallback secret if no API key in header or database
 * @param supabase - Optional Supabase client for database fallback
 */
export async function verifyWebhookRequest(
  req: Request,
  endpoint: string,
  secret: string,
  supabase?: SupabaseClient
): Promise<WebhookVerificationResult> {
  try {
    // Extract headers
    const signature = req.headers.get('x-signature');
    const timestamp = req.headers.get('x-timestamp');
    const idempotencyKey = req.headers.get('x-idempotency-key');
    
    // Log received headers for debugging
    console.log('🔍 Webhook request headers:', {
      has_signature: !!signature,
      has_timestamp: !!timestamp,
      has_idempotency: !!idempotencyKey,
      has_x_api_key: !!req.headers.get('x-api-key'),
      has_apikey: !!req.headers.get('apikey'),
      has_authorization: !!req.headers.get('authorization')
    });
    
    // Validate required headers
    if (!signature || !timestamp || !idempotencyKey) {
      console.error('❌ Missing required headers:', {
        signature: !!signature,
        timestamp: !!timestamp,
        idempotencyKey: !!idempotencyKey
      });
      return { valid: false, error: 'Unauthorized', shouldLog: false };
    }
    
    // Validate timestamp window
    if (!validateTimestamp(timestamp)) {
      console.error('❌ Invalid timestamp:', timestamp);
      return { valid: false, error: 'Unauthorized', shouldLog: false };
    }
    
    // Determine API key from headers (if provided)
    const xApiKey = req.headers.get('x-api-key');
    const sofinityKey = req.headers.get('x-sofinity-key');
    const apikey = req.headers.get('apikey');
    const authorization = req.headers.get('authorization');
    const bearer = authorization?.replace(/^[Bb]earer\s+/, '');
    
    console.log('🔑 API key detection:', {
      x_api_key: xApiKey ? `${xApiKey.substring(0, 8)}...` : 'none',
      x_sofinity_key: sofinityKey ? `${sofinityKey.substring(0, 8)}...` : 'none',
      apikey: apikey ? `${apikey.substring(0, 8)}...` : 'none',
      authorization: authorization ? `${authorization.substring(0, 15)}...` : 'none'
    });
    
    // Prefer explicit Sofinity key, then Bearer token, then X-API-KEY, then apikey.
    // Skip values that look like JWTs when other options exist (HMAC secrets are not JWTs).
    const isLikelyJwt = (val?: string) => !!val && val.split('.').length === 3;
    
    const candidates = [
      { source: 'x-sofinity-key', value: sofinityKey?.trim() },
      { source: 'authorization', value: bearer?.trim() },
      { source: 'x-api-key', value: xApiKey?.trim() },
      { source: 'apikey', value: apikey?.trim() },
    ].filter(c => !!c.value);
    
    // Choose first non-JWT candidate, or the first available if all look like JWTs
    const selected = candidates.find(c => !isLikelyJwt(c.value)) ?? candidates[0];
    let selected_source = selected?.source;
    const headerApiKey = selected?.value;
    let providedKey = headerApiKey;
    
    // Get raw body early for both API key detection and signature verification
    const rawBody = await req.text();
    console.log('📝 Request body length:', rawBody.length);
    
    // If no API key in headers, try to read from request body
    if (!providedKey && rawBody) {
      try {
        const bodyData = JSON.parse(rawBody);
        if (bodyData.sofinity_api_key) {
          providedKey = bodyData.sofinity_api_key.trim();
          selected_source = 'body';
          console.log('✅ Using sofinity_api_key from request body');
        }
      } catch (e) {
        console.log('⚠️ Could not parse body as JSON for API key extraction');
      }
    }
    
    // If no API key in headers/body and supabase client available, fetch from database
    if (!providedKey && supabase) {
      console.log('📊 No API key in headers, attempting database fallback...');
      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'sofinity_api_key')
          .maybeSingle();
        
        if (!settingsError && settingsData?.value) {
          providedKey = String(settingsData.value).trim();
          console.log('✅ Using sofinity_api_key from database for HMAC validation');
        } else {
          console.log('⚠️ No sofinity_api_key found in database');
        }
      } catch (dbError) {
        console.warn('❌ Failed to fetch sofinity_api_key from database:', dbError);
      }
    }

    // If still missing, try environment SOFINITY_API_KEY
    if (!providedKey) {
      console.log('🔄 Trying environment variable SOFINITY_API_KEY...');
      const envApiKey = Deno.env.get('SOFINITY_API_KEY');
      if (envApiKey) {
        providedKey = envApiKey.trim();
        console.log('✅ Using SOFINITY_API_KEY from environment for HMAC validation');
      } else {
        console.log('⚠️ SOFINITY_API_KEY not found in environment');
      }
    }
    
    // Final check - if still no key, use fallback secret
    if (!providedKey && secret) {
      console.log('🔄 Using fallback secret parameter');
      providedKey = secret;
    }
    
    if (!providedKey) {
      console.error('❌ No API key available from any source (headers, database, environment, fallback)');
      return { valid: false, error: 'Unauthorized', shouldLog: false };
    }
    
    console.log('🔐 Final key selection:', {
      from_source: selected_source || 'fallback',
      key_length: providedKey.length,
      key_preview: `${providedKey.substring(0, 8)}...`
    });

    // Use provided key (from header or database) or fall back to secret parameter
    const effectiveSecret = providedKey || secret;
    
    // Strict HMAC validation - signature must match exactly
    const signatureValid = await verifyWebhookSignature(
      rawBody,
      timestamp,
      signature,
      effectiveSecret
    );
    console.log('🔐 HMAC validation result:', signatureValid ? '✅ VALID' : '❌ INVALID');
    
    if (!signatureValid) {
      console.error('❌ HMAC signature validation failed', {
        endpoint,
        hasProvidedKey: !!providedKey,
        signatureLength: signature.length,
        timestampValid: validateTimestamp(timestamp)
      });
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
    
    // All checks passed - return body for reuse
    return { valid: true, rawBody, ...(providedKey ? { apiKeyUsed: providedKey } : {}) };
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