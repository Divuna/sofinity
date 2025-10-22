import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyWebhookRequest, createUnauthorizedResponse } from '../_shared/webhook-security.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_EVENT_TYPES = ['delivered', 'bounced', 'opened', 'clicked'];
const MAX_EMAIL_LENGTH = 255;
const MAX_MESSAGE_ID_LENGTH = 255;

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailEventRequest {
  message_id: string;
  event_type: string;
  recipient_email: string;
  event_timestamp?: string;
  [key: string]: any;
}

// Sanitize string input
function sanitizeString(input: string, maxLength: number): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .trim()
    .substring(0, maxLength);
}

// Validate email event request
function validateEmailEvent(eventData: EmailEventRequest): { valid: boolean; error?: string } {
  if (!eventData.message_id || typeof eventData.message_id !== 'string') {
    return { valid: false, error: 'message_id is required and must be a string' };
  }

  if (eventData.message_id.length > MAX_MESSAGE_ID_LENGTH) {
    return { valid: false, error: `message_id must not exceed ${MAX_MESSAGE_ID_LENGTH} characters` };
  }

  if (!eventData.event_type || typeof eventData.event_type !== 'string') {
    return { valid: false, error: 'event_type is required and must be a string' };
  }

  if (!ALLOWED_EVENT_TYPES.includes(eventData.event_type)) {
    return { valid: false, error: `Nepovolený typ události: ${eventData.event_type}. Povolené typy: ${ALLOWED_EVENT_TYPES.join(', ')}` };
  }

  if (!eventData.recipient_email || typeof eventData.recipient_email !== 'string') {
    return { valid: false, error: 'recipient_email is required and must be a string' };
  }

  if (!EMAIL_REGEX.test(eventData.recipient_email)) {
    return { valid: false, error: 'recipient_email must be a valid email address' };
  }

  if (eventData.recipient_email.length > MAX_EMAIL_LENGTH) {
    return { valid: false, error: `recipient_email must not exceed ${MAX_EMAIL_LENGTH} characters` };
  }

  return { valid: true };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return createUnauthorizedResponse(corsHeaders);
  }

  // Verify webhook signature and security checks
  const secret = Deno.env.get('SOFINITY_WEBHOOK_SECRET') ?? '';
  const verification = await verifyWebhookRequest(req, 'email-events-ingest', secret);
  
  if (!verification.valid) {
    return createUnauthorizedResponse(corsHeaders);
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const eventData: EmailEventRequest = await JSON.parse(await req.text());
    
    console.log('Received email event:', { 
      message_id: eventData.message_id?.substring(0, 20),
      event_type: eventData.event_type 
    });

    // Validate input
    const validation = validateEmailEvent(eventData);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Sanitize inputs
    const sanitizedMessageId = sanitizeString(eventData.message_id, MAX_MESSAGE_ID_LENGTH);
    const sanitizedEmail = sanitizeString(eventData.recipient_email, MAX_EMAIL_LENGTH);

    // Look up the email by message_id
    const { data: emailRecord, error: emailError } = await supabaseClient
      .from('Emails')
      .select('id, user_id')
      .eq('message_id', sanitizedMessageId)
      .single();

    if (emailError || !emailRecord) {
      console.log(`Email not found for message_id: ${sanitizedMessageId}`);
      return new Response(
        JSON.stringify({ error: 'E-mail nebyl nalezen' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Parse event timestamp or use current time
    const eventTimestamp = eventData.event_timestamp 
      ? new Date(eventData.event_timestamp).toISOString()
      : new Date().toISOString();

    // Insert email event record (with optimistic insert - ignore duplicates)
    const { error: insertError } = await supabaseClient
      .from('EmailEvents')
      .insert({
        email_id: emailRecord.id,
        recipient_email: sanitizedEmail,
        event_type: eventData.event_type,
        event_timestamp: eventTimestamp,
        raw_data: eventData
      })
      .select()
      .single();

    // Also insert into EmailLogs for tracking
    const { error: logError } = await supabaseClient
      .from('EmailLogs')
      .insert({
        user_id: emailRecord.user_id,
        recipient_email: sanitizedEmail,
        status: eventData.event_type,
        type: 'webhook_event',
        subject: `Email ${eventData.event_type}`,
        recipient: sanitizedEmail,
        payload: eventData
      })
      .select()
      .single();

    // If there's a unique constraint violation (duplicate), we ignore it
    if (insertError && insertError.code === '23505') {
      console.log(`Duplicate email event ignored for message_id: ${sanitizedMessageId}, event_type: ${eventData.event_type}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Událost již byla zpracována (duplikát ignorován)' 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    if (insertError) {
      console.error('Error inserting email event:', insertError);
      throw insertError;
    }

    console.log(`Successfully processed email event: ${eventData.event_type} for message_id: ${sanitizedMessageId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Událost e-mailu byla úspěšně zpracována' 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    // Don't log error details, return generic error
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
