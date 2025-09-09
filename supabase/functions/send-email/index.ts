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

// Email validation and sanitization functions
function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validateEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function hasNonAsciiChars(email: string): boolean {
  return /[^\x00-\x7F]/.test(email);
}

function convertToPunycode(email: string): string {
  try {
    const [localPart, domain] = email.split('@');
    // For punycode conversion, we'd need a proper library, but for now just return original
    // This is a placeholder for actual punycode conversion
    return email;
  } catch {
    return email;
  }
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

    // Sanitize and validate recipient email
    const sanitizedRecipient = sanitizeEmail(recipient);
    
    console.log('📧 Email validation start:', {
      email_id,
      original_recipient: recipient,
      sanitized_recipient: sanitizedRecipient,
      subject
    });

    // Validate email format
    if (!validateEmailFormat(sanitizedRecipient)) {
      console.error('❌ Invalid email format:', sanitizedRecipient);
      throw new Error('Neplatný formát e-mailové adresy příjemce');
    }

    // Check for non-ASCII characters
    const hasNonAscii = hasNonAsciiChars(sanitizedRecipient);
    if (hasNonAscii) {
      console.warn('⚠️ Non-ASCII characters detected in email:', sanitizedRecipient);
    }

    console.log('✅ Email validation passed:', {
      sanitized_recipient: sanitizedRecipient,
      has_non_ascii: hasNonAscii
    });

    // Verify the email belongs to the user
    const { data: email, error: emailError } = await supabaseClient
      .from('Emails')
      .select('*')
      .eq('id', email_id)
      .eq('user_id', user.id)
      .single();

    if (emailError || !email) {
      throw new Error('E-mail nebyl nalezen nebo nemáte oprávnění');
    }

    // Send email using Resend with improved error handling
    let emailResponse;
    let finalRecipient = sanitizedRecipient;
    
    try {
      console.log('📮 Attempting to send email to:', finalRecipient);
      
      emailResponse = await resend.emails.send({
        from: 'Sofinity <noreply@opravo.cz>',
        to: [finalRecipient],
        subject: subject || `Email od ${email.project || 'Sofinity'}`,
        html: content
      });

      if (emailResponse.error) {
        throw new Error(emailResponse.error.message || 'Chyba poskytovatele e-mailu');
      }
      
      console.log('✅ Email sent successfully:', emailResponse.data?.id);

    } catch (providerError: any) {
      console.error('❌ Email provider error:', providerError);
      
      // Handle specific Resend errors
      const errorMessage = providerError.message || '';
      
      if (errorMessage.includes('Invalid `to` field')) {
        if (errorMessage.includes('non-ASCII characters')) {
          // Try fallback with punycode (placeholder for now)
          console.log('🔄 Attempting punycode fallback...');
          try {
            const punycodeRecipient = convertToPunycode(sanitizedRecipient);
            console.log('🔄 Trying punycode version:', punycodeRecipient);
            
            emailResponse = await resend.emails.send({
              from: 'Sofinity <noreply@opravo.cz>',
              to: [punycodeRecipient],
              subject: subject || `Email od ${email.project || 'Sofinity'}`,
              html: content
            });
            
            if (emailResponse.error) {
              throw new Error(emailResponse.error.message || 'Chyba poskytovatele e-mailu');
            }
            
            finalRecipient = punycodeRecipient;
            console.log('✅ Email sent with punycode fallback:', emailResponse.data?.id);
            
          } catch (fallbackError) {
            console.error('❌ Punycode fallback failed:', fallbackError);
            throw new Error(`Neplatná e-mailová adresa příjemce. Adresa obsahuje nepodporované znaky: ${sanitizedRecipient}`);
          }
        } else {
          throw new Error(`Neplatná e-mailová adresa příjemce: ${sanitizedRecipient}`);
        }
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
        throw new Error('Překročen limit odesílání e-mailů. Zkuste to později.');
      } else if (errorMessage.includes('authentication') || errorMessage.includes('API key')) {
        throw new Error('Chyba autentizace e-mailového servisu. Kontaktujte podporu.');
      } else {
        throw new Error(`Chyba při odesílání e-mailu: ${errorMessage}`);
      }
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

    // Log the email attempt (successful or failed)
    const emailLog = {
      user_id: user.id,
      campaign_id: null,
      recipient_email: finalRecipient,
      subject: subject || `Email od ${email.project || 'Sofinity'}`,
      status: 'sent',
      sent_at: new Date().toISOString(),
      message_id: emailResponse.data?.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      payload: {
        email_id: email_id,
        response: emailResponse.data,
        original_recipient: recipient,
        sanitized_recipient: sanitizedRecipient,
        final_recipient: finalRecipient,
        had_non_ascii: hasNonAscii,
        validation_passed: true
      }
    };

    const { error: logError } = await supabaseClient
      .from('EmailLogs')
      .insert(emailLog);

    if (logError) {
      console.error('Failed to save email log:', logError);
      // Don't fail the request if logging fails
    }

    console.log('✅ Email processed successfully:', emailResponse.data?.id);

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
    console.error('❌ Error in send-email function:', error);
    
    // Try to log failed attempt if we have the necessary data
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        const jwt = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseClient.auth.getUser(jwt);
        
        if (user) {
          const requestBody = await req.clone().json().catch(() => ({}));
          
          // Log failed attempt
          const failedEmailLog = {
            user_id: user.id,
            campaign_id: null,
            recipient_email: requestBody.recipient || 'unknown',
            subject: requestBody.subject || 'Email od Sofinity',
            status: 'failed',
            sent_at: new Date().toISOString(),
            message_id: `failed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            payload: {
              email_id: requestBody.email_id,
              error_message: error.message,
              error_type: 'send_failure',
              original_recipient: requestBody.recipient,
              timestamp: new Date().toISOString()
            }
          };
          
          await supabaseClient
            .from('EmailLogs')
            .insert(failedEmailLog)
            .catch(logError => console.error('Failed to log error:', logError));
        }
      }
    } catch (logError) {
      console.error('Failed to log failed email attempt:', logError);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Došlo k neočekávané chybě při odesílání e-mailu',
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