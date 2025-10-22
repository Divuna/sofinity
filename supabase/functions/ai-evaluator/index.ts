import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Verify X-SOFINITY-CRON header
    const cronSecret = req.headers.get('X-SOFINITY-CRON');
    const expectedSecret = Deno.env.get('SOFINITY_CRON_SECRET');
    
    if (!cronSecret || cronSecret !== expectedSecret) {
      console.error('❌ Unauthorized: Invalid or missing X-SOFINITY-CRON header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Replay attack prevention
    const timestamp = req.headers.get('X-Timestamp');
    const nonce = req.headers.get('X-Nonce');
    
    if (!timestamp || !nonce) {
      console.error('❌ Bad Request: Missing timestamp or nonce');
      return new Response(
        JSON.stringify({ error: 'Missing timestamp or nonce' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestTime = new Date(timestamp);
    const now = new Date();
    const timeDiff = Math.abs(now.getTime() - requestTime.getTime()) / 1000;

    if (timeDiff > 300) {
      console.error('❌ Request rejected: Timestamp too old', timeDiff);
      return new Response(
        JSON.stringify({ error: 'Request timestamp too old' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { event_id, event_name, metadata, user_id, project_id } = await req.json();
    
    console.log('AI Evaluator triggered for event:', event_id, event_name);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for nonce replay
    const { data: existingNonce } = await supabase
      .from('cron_request_nonces')
      .select('id')
      .eq('nonce', nonce)
      .single();

    if (existingNonce) {
      console.error('❌ Replay attack detected: Nonce already used');
      return new Response(
        JSON.stringify({ error: 'Nonce already used' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store nonce
    await supabase
      .from('cron_request_nonces')
      .insert({
        nonce,
        timestamp: requestTime.toISOString(),
        function_name: 'ai-evaluator'
      });

    // Cleanup old nonces
    await supabase.rpc('cleanup_old_nonces');

    // Prepare context for AI analysis
    const context = `
Event Type: ${event_name}
Metadata: ${JSON.stringify(metadata, null, 2)}
Project ID: ${project_id}

Analyze this OneMil event and provide:
1. A brief summary (max 100 words) of what happened
2. A recommendation (max 100 words) for improving engagement or campaign effectiveness
3. Your confidence level (0.0 to 1.0) in this analysis
`;

    // Call OpenAI GPT-4
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant analyzing OneMil gamification events. Provide concise, actionable insights about user engagement, reward efficiency, and campaign success.'
          },
          {
            role: 'user',
            content: context
          }
        ],
        temperature: 0.7,
        max_completion_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Parse AI response to extract summary, recommendation, and confidence
    // Expected format: Summary: ... Recommendation: ... Confidence: ...
    let summary = '';
    let recommendation = '';
    let confidence = 0.75; // Default

    try {
      const summaryMatch = aiResponse.match(/Summary:?\s*(.+?)(?=Recommendation:|$)/is);
      const recommendationMatch = aiResponse.match(/Recommendation:?\s*(.+?)(?=Confidence:|$)/is);
      const confidenceMatch = aiResponse.match(/Confidence:?\s*([0-9.]+)/i);

      summary = summaryMatch ? summaryMatch[1].trim() : aiResponse.substring(0, 200);
      recommendation = recommendationMatch ? recommendationMatch[1].trim() : 'Continue monitoring user engagement patterns.';
      confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.75;
      
      // Ensure confidence is within bounds
      confidence = Math.max(0, Math.min(1, confidence));
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      summary = aiResponse.substring(0, 200);
      recommendation = 'Review event data for optimization opportunities.';
    }

    // Store reaction in database
    const { data: reactionData, error: dbError } = await supabase
      .from('Reactions')
      .insert({
        event_id,
        summary,
        recommendation,
        ai_confidence: confidence,
        user_id
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    console.log('AI evaluation stored successfully:', reactionData.id);

    // Return minimal response
    return new Response(
      JSON.stringify({ 
        ok: true, 
        job_id: reactionData.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-evaluator:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});