import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONEMILL_PROJECT_ID = "defababe-004b-4c63-9ff1-311540b0a3c9";

interface AIRequest {
  type: string;
  prompt: string;
  user_id?: string;
  project_id?: string;
}

interface EmailDraft {
  subject: string;
  content: string;
  type: string;
  user_id: string;
  project_id: string;
  status: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { type, prompt, user_id, project_id }: AIRequest = await req.json();

    console.log(`AI Assistant request: ${type} for project ${project_id || ONEMILL_PROJECT_ID}`);

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert email marketing assistant for OneMil project. Generate professional, engaging emails in Czech language. Always include a clear subject line and well-structured HTML content.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices[0].message.content;

    // Parse subject and content from AI response
    const subjectMatch = generatedContent.match(/Subject:\s*(.+)/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : 'OneMil Email Campaign';
    
    const contentMatch = generatedContent.match(/Content:\s*([\s\S]+)/i);
    const content = contentMatch ? contentMatch[1].trim() : generatedContent;

    // Save as draft to Emails table
    const emailDraft: EmailDraft = {
      subject,
      content,
      type: type || 'campaign',
      user_id: user_id || '00000000-0000-0000-0000-000000000000',
      project_id: project_id || ONEMILL_PROJECT_ID,
      status: 'draft'
    };

    const { data: savedEmail, error: emailError } = await supabaseClient
      .from('Emails')
      .insert(emailDraft)
      .select()
      .single();

    if (emailError) {
      console.error('Error saving email draft:', emailError);
      throw new Error(`Failed to save email draft: ${emailError.message}`);
    }

    // Log to audit_logs
    const { error: auditError } = await supabaseClient
      .from('audit_logs')
      .insert({
        event_name: 'ai_email_generated',
        user_id: user_id,
        project_id: project_id || ONEMILL_PROJECT_ID,
        event_data: {
          email_id: savedEmail.id,
          type: type,
          prompt_length: prompt.length,
          response_length: generatedContent.length
        }
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
    }

    console.log(`Email draft saved with ID: ${savedEmail.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        email_id: savedEmail.id,
        subject,
        content,
        message: 'Email draft generated and saved successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('AI Assistant error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});