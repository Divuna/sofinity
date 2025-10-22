import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { id, user_id, type, prompt } = await req.json();
    
    console.log('Sofinity Agent Dispatcher triggered:', { id, user_id, type });

    // Validate required parameters
    if (!id || !type || !prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: id, type, and prompt are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Define system prompts based on request type
    const systemPrompts: Record<string, string> = {
      campaign_generator: `You are a creative marketing campaign generator. Create compelling campaign content in Czech language that engages the target audience and drives action. Focus on clear messaging and strong calls-to-action.`,
      email_assistant: `You are an email content specialist. Generate professional, engaging email content in Czech language that is clear, concise, and effective for business communication.`,
      video_script: `You are a video script writer. Create engaging video scripts in Czech language with clear structure, compelling narrative, and strong visual descriptions.`,
      evaluator: `You are an AI evaluator analyzing marketing campaign performance. Provide objective analysis with actionable insights and recommendations in Czech language.`,
      default: `You are a helpful AI assistant. Provide clear, accurate, and useful responses in Czech language.`
    };

    const systemPrompt = systemPrompts[type] || systemPrompts.default;

    console.log('Calling OpenAI API with model gpt-4o for type:', type);

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', openAIResponse.status, errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    const generatedText = openAIData.choices[0].message.content;

    console.log('Generated response length:', generatedText.length);

    // Update AIRequests record
    const { error: updateError } = await supabase
      .from('AIRequests')
      .update({
        response: generatedText,
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating AIRequests:', updateError);
      throw new Error(`Failed to update AIRequests: ${updateError.message}`);
    }

    console.log('Successfully processed request:', id);

    return new Response(
      JSON.stringify({
        success: true,
        id,
        response: generatedText,
        type,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sofinity-agent-dispatcher:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
