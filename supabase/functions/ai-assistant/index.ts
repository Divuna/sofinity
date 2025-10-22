import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
interface AIRequest {
  prompt: string;
  user_id?: string;
  project_id?: string;
  email_type?: string;
  agent_name?: string;
}

interface Agent {
  id: string;
  name: string;
  gpt_id: string;
  role: string;
  persona: string;
  active: boolean;
}

interface EmailDraft {
  subject: string;
  content: string;
  type: string;
  status: string;
  user_id: string;
  project_id: string;
}

// Validation constants
const MAX_PROMPT_LENGTH = 2000;
const MAX_AGENT_NAME_LENGTH = 50;
const ALLOWED_EMAIL_TYPES = ['newsletter', 'campaign', 'notification', 'autoresponder'];

// Sanitize string input to prevent XSS
function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim();
}

// Validate inputs
function validateAIRequest(request: AIRequest): { valid: boolean; error?: string } {
  if (!request.prompt || typeof request.prompt !== 'string') {
    return { valid: false, error: 'Prompt is required and must be a string' };
  }

  if (request.prompt.length > MAX_PROMPT_LENGTH) {
    return { valid: false, error: `Prompt must not exceed ${MAX_PROMPT_LENGTH} characters` };
  }

  if (request.agent_name && request.agent_name.length > MAX_AGENT_NAME_LENGTH) {
    return { valid: false, error: `Agent name must not exceed ${MAX_AGENT_NAME_LENGTH} characters` };
  }

  if (request.email_type && !ALLOWED_EMAIL_TYPES.includes(request.email_type)) {
    return { valid: false, error: `Invalid email type. Allowed: ${ALLOWED_EMAIL_TYPES.join(', ')}` };
  }

  return { valid: true };
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
    // Get authenticated user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request
    const rawRequest = await req.json();
    const requestData: AIRequest = {
      prompt: rawRequest.prompt,
      user_id: user.id, // Use authenticated user ID
      project_id: rawRequest.project_id || 'defababe-004b-4c63-9ff1-311540b0a3c9',
      email_type: rawRequest.email_type || 'newsletter',
      agent_name: rawRequest.agent_name || 'Sofi.Writer'
    };

    // Validate input
    const validation = validateAIRequest(requestData);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs
    const sanitizedPrompt = sanitizeString(requestData.prompt);
    const sanitizedAgentName = sanitizeString(requestData.agent_name!);

    console.log('Processing AI assistant request:', { 
      prompt: sanitizedPrompt.substring(0, 100), 
      user_id: requestData.user_id, 
      agent_name: sanitizedAgentName 
    });

    // Fetch the agent from database
    const { data: agent, error: agentError } = await supabase
      .from('Agents')
      .select('*')
      .eq('name', sanitizedAgentName)
      .eq('active', true)
      .single();

    if (agentError || !agent) {
      console.error('Agent not found or inactive:', sanitizedAgentName, agentError);
      return new Response(
        JSON.stringify({ error: `Agent ${sanitizedAgentName} not found or inactive` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Using agent:', agent.name, 'with GPT ID:', agent.gpt_id);

    // Get the OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Call OpenAI ChatGPT API with the specific agent
    const aiResponse = await fetch(`https://api.openai.com/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `${agent.persona}
            
            CRITICAL: Return ONLY a valid JSON object with this exact structure:
            {"subject": "Email subject line", "content": "Full email content in HTML format"}
            
            Do NOT wrap your response in code blocks, markdown, or any other formatting.
            Do NOT include any text before or after the JSON object.
            
            Guidelines:
            - Subject should be catchy and relevant to OneMil brand
            - Content should be well-formatted HTML with inline CSS for email compatibility
            - Include proper email structure with header, body, and footer
            - Use professional tone but engaging language
            - Focus on OneMil's benefits and value proposition`
          },
          {
            role: 'user',
            content: sanitizedPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI API error:', aiResponse.status);
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
      // Strip JSON code fences if present
      let cleanedContent = aiContent.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Try to parse as JSON first
      emailData = JSON.parse(cleanedContent);
      
      // Validate required fields
      if (!emailData.subject || !emailData.content) {
        throw new Error('Missing required fields in AI response');
      }
    } catch (parseError) {
      console.log('JSON parsing failed, attempting fallback extraction:', parseError);
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
      subject: sanitizeString(emailData.subject).substring(0, 200),
      content: emailData.content,
      type: requestData.email_type!,
      status: 'draft',
      user_id: requestData.user_id!,
      project_id: requestData.project_id!,
    };

    const { data: emailRecord, error: emailError } = await supabase
      .from('Emails')
      .insert(emailDraft)
      .select()
      .single();

    if (emailError) {
      console.error('Database error creating email:', emailError);
      throw new Error('Failed to save email draft');
    }

    console.log('Email draft created:', emailRecord.id);

    // Update AIRequest with agent_id if there's a related request
    // This will be done by the calling code if needed

    // Log the AI generation event to audit_logs
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        event_name: 'ai_email_generated',
        user_id: emailDraft.user_id,
        project_id: requestData.project_id,
        event_data: {
          email_id: emailRecord.id,
          prompt: sanitizedPrompt.substring(0, 500), // Truncate for storage
          subject: emailData.subject,
          agent_name: agent.name,
          agent_gpt_id: agent.gpt_id,
          ai_model: 'gpt-4o-mini',
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
        email_id: emailRecord.id,
        subject: emailData.subject,
        content: emailData.content,
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
