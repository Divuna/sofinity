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
    console.log('🕐 Daily AI Scheduler started at', new Date().toISOString());

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !lovableApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get date range for last 24 hours
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Fetch campaign statistics from last 24 hours
    const { data: campaigns, error: campaignsError } = await supabase
      .from('Campaigns')
      .select(`
        id,
        name,
        status,
        user_id,
        project_id,
        created_at,
        CampaignStats (
          impressions,
          clicks,
          conversions,
          revenue
        )
      `)
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      throw campaignsError;
    }

    // Fetch feedback from last 24 hours
    const { data: feedback, error: feedbackError } = await supabase
      .from('Feedback')
      .select('rating, sentiment, comment, campaign_id, created_at')
      .gte('created_at', yesterday.toISOString());

    if (feedbackError) {
      console.error('Error fetching feedback:', feedbackError);
      throw feedbackError;
    }

    console.log(`📊 Analyzing ${campaigns?.length || 0} campaigns and ${feedback?.length || 0} feedback entries`);

    // Prepare data summary for AI analysis
    const campaignSummary = campaigns?.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      stats: c.CampaignStats?.[0] || { impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
    })) || [];

    const feedbackSummary = feedback?.reduce((acc, fb) => {
      acc.totalRating += fb.rating || 0;
      acc.count += 1;
      acc.sentiments[fb.sentiment] = (acc.sentiments[fb.sentiment] || 0) + 1;
      return acc;
    }, { totalRating: 0, count: 0, sentiments: {} as Record<string, number> }) || { totalRating: 0, count: 0, sentiments: {} };

    const avgRating = feedbackSummary.count > 0 ? feedbackSummary.totalRating / feedbackSummary.count : 0;

    // Prepare AI analysis prompt
    const analysisPrompt = `
Analyzuj výkon marketingových kampaní za posledních 24 hodin:

KAMPANĚ (${campaignSummary.length} celkem):
${campaignSummary.slice(0, 10).map(c => `
- ${c.name} (${c.status})
  • Impressions: ${c.stats.impressions}
  • Clicks: ${c.stats.clicks}
  • Conversions: ${c.stats.conversions}
  • Revenue: ${c.stats.revenue} Kč
  • CTR: ${c.stats.impressions > 0 ? ((c.stats.clicks / c.stats.impressions) * 100).toFixed(2) : 0}%
  • CVR: ${c.stats.clicks > 0 ? ((c.stats.conversions / c.stats.clicks) * 100).toFixed(2) : 0}%
`).join('\n')}

FEEDBACK (${feedbackSummary.count} celkem):
- Průměrné hodnocení: ${avgRating.toFixed(2)}/5
- Sentimenty: ${JSON.stringify(feedbackSummary.sentiments)}

Poskytni:
1. **Shrnutí výkonu** (2-3 věty) - jak si kampaně vedou celkově
2. **Klíčové metriky** - které kampaně jsou nejúspěšnější a proč
3. **Doporučení** (3-5 bodů) - konkrétní návrhy na zlepšení výkonu
4. **Varování** - pokud nějaká kampaň výrazně podvýkonuje

Odpověz profesionálně v češtině, stručně a s konkrétními čísly.
`;

    console.log('🤖 Calling Lovable AI for analysis...');

    // Call Lovable AI for analysis
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
            content: 'Jsi AI marketingový analytik pro platformu Sofinity. Tvým úkolem je vyhodnocovat výkon kampaní a poskytovat konkrétní, akční doporučení v češtině.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`Lovable AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const evaluation = aiData.choices?.[0]?.message?.content || 'Analýza nebyla dokončena.';

    console.log('✅ AI analysis completed');

    // Create AIRequests for each active project with campaigns
    const projectsWithCampaigns = [...new Set(campaigns?.map(c => c.project_id).filter(Boolean))];
    const createdRequests = [];

    for (const projectId of projectsWithCampaigns) {
      const projectCampaigns = campaigns.filter(c => c.project_id === projectId);
      const userId = projectCampaigns[0]?.user_id;

      if (!userId) continue;

      const projectSpecificPrompt = `Denní evaluace pro projekt ${projectId}:\n\n${evaluation}`;

      const { data: aiRequest, error: insertError } = await supabase
        .from('AIRequests')
        .insert({
          user_id: userId,
          project_id: projectId,
          type: 'evaluator',
          prompt: projectSpecificPrompt,
          status: 'completed',
          response: evaluation,
          metadata: {
            scheduled: true,
            timestamp: now.toISOString(),
            campaigns_analyzed: projectCampaigns.length,
            avg_rating: avgRating,
            total_feedback: feedbackSummary.count,
          },
        })
        .select()
        .single();

      if (insertError) {
        console.error(`Error creating AIRequest for project ${projectId}:`, insertError);
      } else {
        console.log(`✅ AIRequest created for project ${projectId}:`, aiRequest.id);
        createdRequests.push(aiRequest.id);
      }
    }

    // If no campaigns were analyzed, create a general evaluation
    if (createdRequests.length === 0 && campaigns && campaigns.length > 0) {
      const fallbackUserId = campaigns[0]?.user_id;
      if (fallbackUserId) {
        const { data: fallbackRequest, error: fallbackError } = await supabase
          .from('AIRequests')
          .insert({
            user_id: fallbackUserId,
            type: 'evaluator',
            prompt: `Denní evaluace:\n\n${evaluation}`,
            status: 'completed',
            response: evaluation,
            metadata: {
              scheduled: true,
              timestamp: now.toISOString(),
              campaigns_analyzed: campaigns.length,
              avg_rating: avgRating,
              total_feedback: feedbackSummary.count,
            },
          })
          .select()
          .single();

        if (!fallbackError) {
          createdRequests.push(fallbackRequest.id);
        }
      }
    }

    console.log('🎯 Daily scheduler completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now.toISOString(),
        campaigns_analyzed: campaigns?.length || 0,
        feedback_analyzed: feedback?.length || 0,
        ai_requests_created: createdRequests.length,
        request_ids: createdRequests,
        summary: {
          avg_rating: avgRating,
          total_projects: projectsWithCampaigns.length,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Error in fn_scheduler_daily:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
