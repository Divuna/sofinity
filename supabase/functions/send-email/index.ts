import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

interface SendEmailRequest {
  email_id: string;
  recipient: string;
  subject?: string;
  content: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify user authentication
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { email_id, recipient, subject, content }: SendEmailRequest = await req.json();

    if (!email_id || !recipient || !content) {
      throw new Error('Email ID, recipient, and content are required');
    }

    console.log('Sending email:', { email_id, recipient, subject });

    // Verify the email belongs to the user
    const { data: email, error: emailError } = await supabaseClient
      .from('Emails')
      .select('*')
      .eq('id', email_id)
      .eq('user_id', user.id)
      .single();

    if (emailError || !email) {
      throw new Error('Email not found or access denied');
    }

    // Send email using Resend
    let emailResponse;
    try {
      emailResponse = await resend.emails.send({
        from: 'Sofinity <noreply@opravo.cz>',
        to: [recipient],
        subject: subject || `Email od ${email.project || 'Sofinity'}`,
        html: content
      });

      if (emailResponse.error) {
        throw new Error(emailResponse.error.message || 'Email provider error');
      }
    } catch (providerError) {
      console.error('Email provider error:', providerError);
      throw new Error(`Chyba při odesílání emailu: ${providerError.message}`);
    }

    // Update email status to 'sent'
    const { error: updateError } = await supabaseClient
      .from('Emails')
      .update({
        status: 'sent',
        updated_at: new Date().toISOString()
      })
      .eq('id', email_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to update email status:', updateError);
      // Don't fail the request if status update fails
    }

    // Log the sent email
    const emailLog = {
      user_id: user.id,
      campaign_id: null,
      recipient_email: recipient,
      subject: subject || `Email od ${email.project || 'Sofinity'}`,
      status: 'sent',
      sent_at: new Date().toISOString(),
      message_id: emailResponse.data?.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      payload: {
        email_id: email_id,
        response: emailResponse.data,
        recipient: recipient
      }
    };

    const { error: logError } = await supabaseClient
      .from('EmailLogs')
      .insert(emailLog);

    if (logError) {
      console.error('Failed to save email log:', logError);
      // Don't fail the request if logging fails
    }

    console.log('Email sent successfully:', emailResponse.data?.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'E-mail byl úspěšně odeslán',
        message_id: emailResponse.data?.id
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in send-email function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Došlo k neočekávané chybě',
        success: false 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);