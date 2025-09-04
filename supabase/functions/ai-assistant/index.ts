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

// Helper function to parse raw prompt text into structured data
function parsePromptToData(prompt: string, type: string): any {
  console.log('Parsing prompt for type:', type, 'prompt:', prompt);
  
  const data: any = {};
  
  // Extract project name (look for patterns like "projekt: X" or "pro projekt X")
  const projectMatch = prompt.match(/(?:projekt|project)[:\s]*([^\n,.]+)/i);
  data.project = projectMatch ? projectMatch[1].trim() : 'Nespecifikovaný projekt';
  
  if (type === 'campaign_generator' || type === 'campaign') {
    // Extract goal/objective
    const goalMatch = prompt.match(/(?:cíl|účel|goal|objective)[:\s]*([^\n,.]+)/i);
    data.goal = goalMatch ? goalMatch[1].trim() : 'Zvýšení povědomí o značce';
    
    // If no specific parts found, use the whole prompt as goal
    if (!goalMatch && !projectMatch) {
      data.goal = prompt.trim();
      data.project = 'AI Generovaná kampaň';
    }
  } else if (type === 'email_assistant' || type === 'email') {
    // Extract email type
    const typeMatch = prompt.match(/(?:typ|type)[:\s]*([^\n,.]+)/i);
    data.emailType = typeMatch ? typeMatch[1].trim() : 'propagační';
    
    // Extract purpose
    const purposeMatch = prompt.match(/(?:účel|purpose|cíl)[:\s]*([^\n,.]+)/i);
    data.purpose = purposeMatch ? purposeMatch[1].trim() : prompt.trim();
    
    // If no specific parts found, use the whole prompt as purpose
    if (!purposeMatch && !typeMatch && !projectMatch) {
      data.purpose = prompt.trim();
      data.emailType = 'obecný';
      data.project = 'Email kampaň';
    }
  } else if (type === 'autoresponder') {
    // Extract question/trigger
    const questionMatch = prompt.match(/(?:otázka|question|trigger)[:\s]*([^\n]+)/i);
    data.question = questionMatch ? questionMatch[1].trim() : prompt.split('\n')[0] || prompt.trim();
    
    // Extract desired response style
    const styleMatch = prompt.match(/(?:styl|style|tón|tone)[:\s]*([^\n,.]+)/i);
    data.responseStyle = styleMatch ? styleMatch[1].trim() : 'přátelský a profesionální';
    
    // Use remaining text or full prompt as context
    data.context = prompt.trim();
  }
  
  console.log('Parsed data:', data);
  return data;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('AI Assistant request body:', requestBody);

    if (!openAIApiKey) {
      throw new Error('OpenAI API klíč není nastaven');
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

    // Support both old format {type, prompt} and new format {type, data, user_id}
    let type, data, rawPrompt;
    
    if (requestBody.data && typeof requestBody.data === 'object') {
      // New format: {type, data, user_id}
      type = requestBody.type;
      data = requestBody.data;
      rawPrompt = data.prompt || '';
    } else if (requestBody.prompt && typeof requestBody.prompt === 'string') {
      // Old format: {type, prompt}
      type = requestBody.type;
      rawPrompt = requestBody.prompt;
      
      // Parse the prompt to extract structured data
      data = parsePromptToData(rawPrompt, type);
    } else {
      throw new Error('Neplatný formát požadavku. Očekává se {type, data} nebo {type, prompt}.');
    }

    // Map frontend types to internal types
    const typeMapping = {
      'email_assistant': 'email',
      'campaign_generator': 'campaign',
      'autoresponder': 'autoresponder'
    };
    
    const internalType = typeMapping[type] || type;
    console.log('Mapped type:', type, '->', internalType);

    let prompt = '';
    let systemMessage = '';

    if (internalType === 'campaign') {
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
      
    } else if (internalType === 'email') {
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

    } else if (internalType === 'autoresponder') {
      systemMessage = `Jsi AI asistent pro automatické odpovědi. Vytváříš autoresponder v češtině.
      Odpovídej pouze ve formátu JSON s následujícími poli:
      {
        "question": "původní otázka nebo trigger",
        "response": "automatická odpověď",
        "channel": "kanál komunikace",
        "generated_by_ai": true
      }`;
      
      prompt = `Vytvoř automatickou odpověď pro otázku/trigger "${data.question}" 
      v ${data.responseStyle} stylu. Odpověď musí být v češtině a užitečná pro zákazníky.
      Kontext: ${data.context}`;
    }

    console.log('Calling OpenAI with prompt:', prompt);

    // Call OpenAI API with updated model and parameters
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',  // Updated to stable GPT-4.1 model
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_completion_tokens: 1000,  // Updated parameter name
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API chyba: ${response.status} - ${errorData}`);
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
      console.error('Raw content:', generatedContent);
      throw new Error('Chyba při zpracování AI odpovědi: Neplatný JSON formát');
    }

    // Save to database based on type
    let savedData;
    if (internalType === 'campaign') {
      const { data: campaignData, error: campaignError } = await supabase
        .from('Campaigns')
        .insert({
          name: parsedContent.name,
          targeting: parsedContent.targeting,
          email: parsedContent.email,
          post: parsedContent.post,
          video: parsedContent.video,
          project: data.project,
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

      // Send webhook to Make.com for campaign automation
      try {
        const webhookPayload = {
          name: campaignData.name,
          targeting: campaignData.targeting,
          email: campaignData.email,
          post: campaignData.post,
          video: campaignData.video,
          project: data.project,
          user_id: campaignData.user_id,
          campaign_id: campaignData.id,
          created_at: campaignData.created_at
        };

        const makeWebhookUrl = Deno.env.get('MAKE_WEBHOOK_URL');
        if (makeWebhookUrl) {
          console.log('Sending webhook to Make.com:', webhookPayload);
          
          const webhookResponse = await fetch(makeWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookPayload),
          });

          if (webhookResponse.ok) {
            console.log('Webhook sent successfully to Make.com');
          } else {
            console.error('Failed to send webhook to Make.com:', webhookResponse.status);
          }
        } else {
          console.log('Make webhook URL not configured, skipping webhook');
        }
      } catch (webhookError) {
        console.error('Error sending webhook to Make.com:', webhookError);
        // Don't fail the main request if webhook fails
      }
      
    } else if (internalType === 'email') {
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

    } else if (internalType === 'autoresponder') {
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

    // Log AI request with original prompt for history
    const promptForHistory = rawPrompt || prompt;
    await supabase
      .from('AIRequests')
      .insert({
        type: type, // Use original frontend type for consistency
        prompt: promptForHistory,
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