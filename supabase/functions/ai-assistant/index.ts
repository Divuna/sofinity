import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIRequest {
  prompt: string;
  user_id?: string;
  project_id?: string;
  email_type?: string;
}

interface EmailDraft {
  subject: string;
  content: string;
  type: string;
  status: string;
  user_id: string;
  project_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the request body
    const { prompt, user_id, project_id = 'defababe-004b-4c63-9ff1-311540b0a3c9', email_type = 'newsletter' }: AIRequest = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing AI assistant request:', { prompt: prompt.substring(0, 100), user_id, project_id, email_type });

    // Get the Lovable AI API key
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Call Lovable AI Gateway for email generation
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert email marketing assistant for OneMil. Create professional, engaging email content.
            
            Format your response as JSON with this exact structure:
            {
              "subject": "Email subject line",
              "content": "Full email content in HTML format with proper styling"
            }
            
            Guidelines:
            - Subject should be catchy and relevant to OneMil brand
            - Content should be well-formatted HTML with inline CSS for email compatibility
            - Include proper email structure with header, body, and footer
            - Use professional tone but engaging language
            - Focus on OneMil's benefits and value proposition`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI API error:', aiResponse.status, await aiResponse.text());
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No content received from AI');
    }

    console.log('AI response received:', aiContent.substring(0, 200));

    // Parse the AI response to extract subject and content
    let emailData: { subject: string; content: string };
    try {
      // Try to parse as JSON first
      emailData = JSON.parse(aiContent);
    } catch {
      // Fallback: extract from text format
      const subjectMatch = aiContent.match(/(?:Subject|Předmět):\s*(.+)/i);
      const contentMatch = aiContent.match(/(?:Content|Obsah):\s*([\s\S]+)/i);
      
      emailData = {
        subject: subjectMatch?.[1]?.trim() || 'OneMil Email Campaign',
        content: contentMatch?.[1]?.trim() || aiContent
      };
    }

    // Validate extracted data
    if (!emailData.subject || !emailData.content) {
      throw new Error('Could not extract valid email data from AI response');
    }

    // Create email draft in database
    const emailDraft: EmailDraft = {
      subject: emailData.subject,
      content: emailData.content,
      type: email_type,
      status: 'draft',
      user_id: user_id || 'bbc1d329-fe8d-449e-9960-6633a647b65a',
      project_id: project_id,
    };

    const { data: emailRecord, error: emailError } = await supabase
      .from('Emails')
      .insert(emailDraft)
      .select()
      .single();

    if (emailError) {
      console.error('Database error creating email:', emailError);
      throw new Error(`Failed to save email draft: ${emailError.message}`);
    }

    console.log('Email draft created:', emailRecord.id);

    // Log the AI generation event to audit_logs
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        event_name: 'ai_email_generated',
        user_id: emailDraft.user_id,
        project_id: project_id,
        event_data: {
          email_id: emailRecord.id,
          prompt: prompt.substring(0, 500), // Truncate for storage
          subject: emailData.subject,
          ai_model: 'google/gemini-2.5-flash',
          generated_at: new Date().toISOString()
        }
      });

    if (auditError) {
      console.error('Failed to log audit event:', auditError);
      // Don't fail the request for audit log errors
    }

    return new Response(
      JSON.stringify({
        success: true,
        email: emailRecord,
        ai_response: {
          subject: emailData.subject,
          content: emailData.content
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in ai-assistant function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);