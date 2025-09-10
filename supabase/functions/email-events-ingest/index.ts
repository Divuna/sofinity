import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_EVENT_TYPES = ['delivered', 'bounced', 'opened', 'clicked'];

interface EmailEventRequest {
  message_id: string;
  event_type: string;
  recipient_email: string;
  event_timestamp?: string;
  [key: string]: any;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Pouze POST požadavky jsou povoleny' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const eventData: EmailEventRequest = await req.json();
    
    console.log('Received email event:', eventData);

    // Validate required fields
    if (!eventData.message_id || !eventData.event_type || !eventData.recipient_email) {
      return new Response(
        JSON.stringify({ error: 'Chybí povinné pole: message_id, event_type nebo recipient_email' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Validate event type
    if (!ALLOWED_EVENT_TYPES.includes(eventData.event_type)) {
      return new Response(
        JSON.stringify({ 
          error: `Nepovolený typ události: ${eventData.event_type}. Povolené typy: ${ALLOWED_EVENT_TYPES.join(', ')}` 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Look up the email by message_id
    const { data: emailRecord, error: emailError } = await supabaseClient
      .from('Emails')
      .select('id')
      .eq('message_id', eventData.message_id)
      .single();

    if (emailError || !emailRecord) {
      console.log(`Email not found for message_id: ${eventData.message_id}`);
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
        recipient_email: eventData.recipient_email,
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
        recipient_email: eventData.recipient_email,
        status: eventData.event_type,
        type: 'webhook_event',
        subject: `Email ${eventData.event_type}`,
        recipient: eventData.recipient_email,
        payload: eventData
      })
      .select()
      .single();

    // If there's a unique constraint violation (duplicate), we ignore it
    if (insertError && insertError.code === '23505') {
      console.log(`Duplicate email event ignored for message_id: ${eventData.message_id}, event_type: ${eventData.event_type}`);
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

    console.log(`Successfully processed email event: ${eventData.event_type} for message_id: ${eventData.message_id}`);

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
    console.error('Error in email-events-ingest function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Interní chyba serveru',
        details: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);