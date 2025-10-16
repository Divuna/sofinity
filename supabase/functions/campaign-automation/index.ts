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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { campaign_id, user_id } = await req.json();

    if (!campaign_id || !user_id) {
      throw new Error('Missing campaign_id or user_id');
    }

    console.log('Campaign automation triggered for campaign:', campaign_id);

    // Fetch campaign data
    const { data: campaign, error: campaignError } = await supabase
      .from('Campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError) throw campaignError;

    const results = {
      post_created: false,
      video_created: false,
      post_id: null as string | null,
      video_id: null as string | null,
    };

    // Generate AI content for post
    if (campaign.post || campaign.name) {
      try {
        const postPrompt = `Generate a social media post based on this campaign:
Title: ${campaign.name}
Content: ${campaign.post || ''}
Targeting: ${campaign.targeting || ''}

Generate:
1. Post text (engaging, conversational, max 280 characters)
2. 3-5 relevant hashtags

Format as JSON: { "text": "...", "hashtags": ["...", "..."] }`;

        let postText = campaign.post || campaign.name;
        let hashtags = '';

        // Try to use AI if available
        if (lovableApiKey) {
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: 'You are a social media content expert. Always respond with valid JSON.' },
                { role: 'user', content: postPrompt }
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const aiContent = aiData.choices?.[0]?.message?.content;
            
            try {
              const parsed = JSON.parse(aiContent);
              postText = parsed.text || postText;
              hashtags = parsed.hashtags?.join(' ') || '';
            } catch {
              console.log('Failed to parse AI response as JSON, using campaign content');
            }
          }
        }

        // Create post record with status 'concept'
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .insert({
            user_id: user_id,
            campaign_id: campaign_id,
            project_id: campaign.project_id,
            text: `${postText}\n\n${hashtags}`,
            channel: 'facebook',
            status: 'concept',
            format: 'post',
            publish_date: new Date().toISOString(),
          })
          .select()
          .single();

        if (!postError && postData) {
          results.post_created = true;
          results.post_id = postData.id;
          console.log('Post created:', postData.id);
        } else {
          console.error('Error creating post:', postError);
        }
      } catch (error) {
        console.error('Error generating post content:', error);
      }
    }

    // Create video record if video content exists
    if (campaign.video) {
      try {
        const videoPrompt = `Generate a video description based on this campaign:
Title: ${campaign.name}
Video Content: ${campaign.video}
Targeting: ${campaign.targeting || ''}

Generate a compelling video description (max 200 characters).`;

        let videoDescription = campaign.video;

        // Try to use AI if available
        if (lovableApiKey) {
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: 'You are a video marketing expert. Keep responses concise.' },
                { role: 'user', content: videoPrompt }
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const aiContent = aiData.choices?.[0]?.message?.content;
            videoDescription = aiContent || videoDescription;
          }
        }

        // Create video record with status 'concept'
        const { data: videoData, error: videoError } = await supabase
          .from('videos')
          .insert({
            user_id: user_id,
            campaign_id: campaign_id,
            title: campaign.name,
            description: videoDescription,
            status: 'concept',
            metadata: {
              original_content: campaign.video,
              targeting: campaign.targeting,
            },
          })
          .select()
          .single();

        if (!videoError && videoData) {
          results.video_created = true;
          results.video_id = videoData.id;
          console.log('Video record created:', videoData.id);
        } else {
          console.error('Error creating video:', videoError);
        }
      } catch (error) {
        console.error('Error generating video content:', error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Campaign automation completed',
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in campaign-automation function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
