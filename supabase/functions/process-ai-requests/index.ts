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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch waiting AIRequests with a limit to prevent overwhelming processing
    const { data: requests, error: fetchError } = await supabase
      .from('AIRequests')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error('Error fetching AIRequests:', fetchError);
      throw fetchError;
    }

    console.log(`Processing ${requests?.length || 0} waiting AIRequests`);

    const results = [];

    for (const request of requests || []) {
      try {
        console.log(`Processing AIRequest ${request.id} of type ${request.type}`);

        let aiResponse = null;
        let generatedContent = '';

        // Use Lovable AI if available, fallback to OpenAI
        const useOpenAI = !lovableApiKey && openAIApiKey;
        
        if (lovableApiKey || useOpenAI) {
          const apiUrl = lovableApiKey 
            ? 'https://ai.gateway.lovable.dev/v1/chat/completions'
            : 'https://api.openai.com/v1/chat/completions';
          
          const apiKey = lovableApiKey || openAIApiKey;
          const model = lovableApiKey ? 'google/gemini-2.5-flash' : 'gpt-4o-mini';

          // Generate system prompt based on request type
          let systemPrompt = 'You are an AI marketing assistant for Sofinity platform.';
          
          switch (request.type) {
            case 'campaign_generator':
              systemPrompt = 'You are an AI campaign generator. Create engaging marketing campaigns based on user events. Return JSON with "campaign_name", "targeting_strategy", and "content_ideas".';
              break;
            case 'evaluator':
              systemPrompt = 'You are an AI evaluator. Analyze user engagement events and provide insights. Return JSON with "summary", "insights", and "recommendations".';
              break;
            case 'autoresponder':
              systemPrompt = 'You are an AI email assistant. Generate personalized email responses. Return JSON with "subject", "body", and "tone".';
              break;
            default:
              systemPrompt = 'You are an AI assistant analyzing marketing events. Provide actionable insights in JSON format.';
          }

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: request.prompt || 'Analyze this event and provide marketing insights.' }
              ],
              temperature: 0.7,
              max_tokens: 500,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            aiResponse = data.choices?.[0]?.message?.content || null;
            generatedContent = aiResponse;
          } else {
            console.error(`AI API error for request ${request.id}:`, response.status);
          }
        }

        // Process based on request type
        if (request.type === 'campaign_generator') {
          // Create a Campaign
          const { error: campaignError } = await supabase
            .from('Campaigns')
            .insert({
              user_id: request.user_id,
              project_id: request.project_id,
              event_id: request.id,
              name: `AI Campaign: ${request.event_name || 'Generated'}`,
              targeting: aiResponse || request.metadata?.toString() || '{}',
              status: 'draft',
            });

          if (campaignError) {
            console.error(`Error creating campaign for request ${request.id}:`, campaignError);
          } else {
            console.log(`✅ Campaign created for request ${request.id}`);
          }
        } else if (request.type === 'autoresponder') {
          // Create an Email
          const { error: emailError } = await supabase
            .from('Emails')
            .insert({
              user_id: request.user_id,
              project_id: request.project_id,
              type: 'autoresponder',
              subject: `Auto-response: ${request.event_name || 'Event'}`,
              content: aiResponse || 'Thank you for your engagement. We appreciate your participation!',
              status: 'draft',
            });

          if (emailError) {
            console.error(`Error creating email for request ${request.id}:`, emailError);
          } else {
            console.log(`✅ Email created for request ${request.id}`);
          }
        }

        // Update AIRequest status to completed
        const { error: updateError } = await supabase
          .from('AIRequests')
          .update({
            status: 'completed',
            response: generatedContent || 'Processed successfully',
          })
          .eq('id', request.id);

        if (updateError) {
          console.error(`Error updating AIRequest ${request.id}:`, updateError);
        }

        results.push({
          id: request.id,
          type: request.type,
          status: 'completed',
          hasAIResponse: !!aiResponse,
        });

      } catch (error) {
        console.error(`Error processing AIRequest ${request.id}:`, error);
        results.push({
          id: request.id,
          type: request.type,
          status: 'error',
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in process-ai-requests:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
