import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('AI Assistant request body:', requestBody);

    if (!lovableApiKey) {
      throw new Error('Lovable API klíč není nastaven');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract user_id from JWT token if not provided in request
    let user_id = requestBody.user_id;
    if (!user_id) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const payload = JSON.parse(atob(token.split('.')[1]));
          user_id = payload.sub;
          console.log('Extracted user_id from JWT:', user_id);
        } catch (error) {
          console.error('Error extracting user_id from JWT:', error);
        }
      }
    }

    if (!user_id) {
      throw new Error('User ID není k dispozici. Přihlaste se znovu.');
    }

    const { type, data } = requestBody;
    let prompt = '';
    let systemMessage = '';

    if (type === 'email_assistant' || type === 'email') {
      systemMessage = `Jsi AI asistent pro email marketing. Vytváříš emaily v češtině.
      Odpovídej pouze ve formátu JSON s následujícími poli:
      {
        "type": "typ emailu",
        "content": "obsah emailu",
        "recipient": "cílová skupina",
        "project": "název projektu"
      }`;
      
      prompt = `Vytvoř ${data.emailType || 'propagační'} email pro projekt "${data.project}" 
      s účelem "${data.purpose}". Email musí být v češtině a profesionální.`;

    } else if (type === 'campaign_generator' || type === 'campaign') {
      systemMessage = `Jsi AI asistent pro marketing. Vytváříš marketingové kampaně v češtině. 
      Odpovídej pouze ve formátu JSON s následujícími poli:
      {
        "name": "název kampaně",
        "targeting": "cílení a demografie",
        "email": "obsah emailu",
        "post": "text příspěvku pro sociální sítě",
        "video": "návrh videa nebo popis"
      }`;
      
      prompt = `Vytvoř marketingovou kampaň pro projekt "${data.project}" s cílem "${data.goal || data.purpose}". 
      Kampaň musí být v češtině a přizpůsobená českému trhu.`;

    } else if (type === 'autoresponder') {
      systemMessage = `Jsi AI asistent pro automatické odpovědi. Vytváříš autoresponder v češtině.
      Odpovídej pouze ve formátu JSON s následujícími poli:
      {
        "question": "původní otázka nebo trigger",
        "response": "automatická odpověď",
        "channel": "kanál komunikace",
        "generated_by_ai": true
      }`;
      
      prompt = `Vytvoř automatickou odpověď pro otázku/trigger "${data.question || data.prompt}" 
      v přátelském a profesionálním stylu. Odpověď musí být v češtině a užitečná pro zákazníky.`;
    }

    console.log('Calling Lovable AI with prompt:', prompt);

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
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
      console.error('Lovable AI API error:', errorData);
      throw new Error(`Lovable AI API chyba: ${response.status} - ${errorData}`);
    }

    const aiResponse = await response.json();
    const generatedContent = aiResponse.choices[0].message.content;
    
    console.log('Lovable AI response:', generatedContent);

    // Parse JSON response
    let parsedContent;
    try {
      parsedContent = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content:', generatedContent);
      throw new Error('Chyba při zpracování AI odpovědi: Neplatný JSON formát');
    }

    // Save to database based on type
    let savedData;
    if (type === 'campaign_generator' || type === 'campaign') {
      const { data: campaignData, error: campaignError } = await supabase
        .from('Campaigns')
        .insert({
          name: parsedContent.name,
          targeting: parsedContent.targeting,
          email: parsedContent.email,
          post: parsedContent.post,
          video: parsedContent.video,
          project: data.project,
          project_id: 'defababe-004b-4c63-9ff1-311540b0a3c9', // OneMil project ID
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
      
    } else if (type === 'email_assistant' || type === 'email') {
      const { data: emailData, error: emailError } = await supabase
        .from('Emails')
        .insert({
          type: parsedContent.type,
          content: parsedContent.content,
          recipient: parsedContent.recipient,
          project: parsedContent.project,
          project_id: 'defababe-004b-4c63-9ff1-311540b0a3c9', // OneMil project ID
          subject: `AI Generated: ${parsedContent.type}`,
          status: 'draft',
          email_mode: 'test',
          user_id: user_id
        })
        .select()
        .single();

      if (emailError) {
        console.error('Email save error:', emailError);
        throw new Error('Chyba při ukládání emailu: ' + emailError.message);
      }
      savedData = emailData;

    } else if (type === 'autoresponder') {
      const { data: autoresponderData, error: autoresponderError } = await supabase
        .from('Autoresponses')
        .insert({
          question: parsedContent.question,
          response: parsedContent.response,
          channel: parsedContent.channel || 'web',
          generated_by_ai: parsedContent.generated_by_ai !== false,
          user_id: user_id
        })
        .select()
        .single();

      if (autoresponderError) {
        console.error('Autoresponder save error:', autoresponderError);
        throw new Error('Chyba při ukládání autoresponder: ' + autoresponderError.message);
      }
      savedData = autoresponderData;
    }

    // Log AI request
    await supabase
      .from('AIRequests')
      .insert({
        type: type,
        prompt: data.prompt || prompt,
        response: generatedContent,
        status: 'completed',
        user_id: user_id,
        project_id: 'defababe-004b-4c63-9ff1-311540b0a3c9' // OneMil project ID
      });

    console.log('Successfully saved:', savedData);

    return new Response(JSON.stringify({ 
      success: true, 
      data: savedData,
      aiContent: parsedContent 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in AI assistant:', error);
    return new Response(JSON.stringify({ 
      error: error?.message || 'Došlo k neočekávané chybě' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});