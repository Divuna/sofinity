import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data, user_id } = await req.json();
    console.log('AI Assistant request:', { type, data, user_id });

    if (!openAIApiKey) {
      throw new Error('OpenAI API klíč není nastaven');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let prompt = '';
    let systemMessage = '';

    if (type === 'campaign') {
      systemMessage = `Jsi AI asistent pro marketing. Vytváříš marketingové kampaně v češtině. 
      Odpovídej pouze ve formátu JSON s následujícími poli:
      {
        "name": "název kampaně",
        "targeting": "cílení a demografie",
        "email": "obsah emailu",
        "post": "text příspěvku pro sociální sítě",
        "video": "návrh videa nebo popis"
      }`;
      
      prompt = `Vytvoř marketingovou kampaň pro projekt "${data.project}" s cílem "${data.goal}". 
      Kampaň musí být v češtině a přizpůsobená českému trhu.`;
      
    } else if (type === 'email') {
      systemMessage = `Jsi AI asistent pro email marketing. Vytváříš emaily v češtině.
      Odpovídej pouze ve formátu JSON s následujícími poli:
      {
        "type": "typ emailu",
        "content": "obsah emailu",
        "recipient": "cílová skupina",
        "project": "název projektu"
      }`;
      
      prompt = `Vytvoř ${data.emailType} email pro projekt "${data.project}" 
      s účelem "${data.purpose}". Email musí být v češtině a profesionální.`;
    }

    console.log('Calling OpenAI with prompt:', prompt);

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API chyba: ${response.status}`);
    }

    const aiResponse = await response.json();
    const generatedContent = aiResponse.choices[0].message.content;
    
    console.log('OpenAI response:', generatedContent);

    // Parse JSON response
    let parsedContent;
    try {
      parsedContent = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Chyba při zpracování AI odpovědi');
    }

    // Save to database
    let savedData;
    if (type === 'campaign') {
      const { data: campaignData, error: campaignError } = await supabase
        .from('Campaigns')
        .insert({
          name: parsedContent.name,
          targeting: parsedContent.targeting,
          email: parsedContent.email,
          post: parsedContent.post,
          video: parsedContent.video,
          user_id: user_id,
          status: 'draft'
        })
        .select()
        .single();

      if (campaignError) {
        console.error('Campaign save error:', campaignError);
        throw new Error('Chyba při ukládání kampaně: ' + campaignError.message);
      }
      savedData = campaignData;
      
    } else if (type === 'email') {
      const { data: emailData, error: emailError } = await supabase
        .from('Emails')
        .insert({
          type: parsedContent.type,
          content: parsedContent.content,
          recipient: parsedContent.recipient,
          project: parsedContent.project,
          user_id: user_id
        })
        .select()
        .single();

      if (emailError) {
        console.error('Email save error:', emailError);
        throw new Error('Chyba při ukládání emailu: ' + emailError.message);
      }
      savedData = emailData;
    }

    // Log AI request
    await supabase
      .from('AIRequests')
      .insert({
        type: type,
        prompt: prompt,
        response: generatedContent,
        status: 'completed',
        user_id: user_id
      });

    console.log('Successfully saved:', savedData);

    return new Response(JSON.stringify({ 
      success: true, 
      data: savedData,
      aiContent: parsedContent 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI assistant:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Došlo k neočekávané chybě' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});