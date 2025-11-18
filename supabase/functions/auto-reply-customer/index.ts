import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  const sofinitySharedKey = Deno.env.get('SOFINITY_SHARED_KEY');
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  console.log('🤖 [auto-reply-customer] Starting AI auto-reply processing');

  try {
    const { ai_request_id } = await req.json();
    
    if (!ai_request_id) {
      throw new Error('Missing ai_request_id');
    }

    console.log(`📥 [auto-reply-customer] Processing AIRequest: ${ai_request_id}`);

    // Fetch the AIRequest
    const { data: aiRequest, error: fetchError } = await supabase
      .from('AIRequests')
      .select('*')
      .eq('id', ai_request_id)
      .eq('status', 'pending')
      .single();

    if (fetchError || !aiRequest) {
      console.error('❌ [auto-reply-customer] AIRequest not found or already processed:', fetchError);
      throw new Error('AIRequest not found');
    }

    console.log('📝 [auto-reply-customer] AIRequest details:', {
      id: aiRequest.id,
      user_id: aiRequest.user_id,
      prompt_length: aiRequest.prompt?.length
    });

    // Generate AI reply using Lovable AI
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `Jsi přátelský zákaznický asistent pro OneMil platformu. 
Odpovídáš na zprávy zákazníků v češtině, profesionálně a vstřícně.
Pokud nejsi si jistý odpovědí, upřímně to přiznej.
Vždy odpovídej stručně a jasně.
DŮLEŽITÉ: Vrať také skóre jistoty (0.0-1.0) jako číslo na konci odpovědi oddělené znaky ||.
Příklad formátu odpovědi: "Zde je vaše odpověď na dotaz.||0.85"`;

    console.log('🧠 [auto-reply-customer] Calling Lovable AI for reply generation');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: aiRequest.prompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ [auto-reply-customer] AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const fullResponse = aiData.choices?.[0]?.message?.content || '';
    console.log('✅ [auto-reply-customer] AI response received:', fullResponse.substring(0, 100));

    // Parse response and confidence score
    const parts = fullResponse.split('||');
    const replyContent = parts[0]?.trim() || fullResponse;
    const confidenceScore = parts[1] ? parseFloat(parts[1].trim()) : 0.5;

    console.log('📊 [auto-reply-customer] Confidence score:', confidenceScore);

    const metadata = aiRequest.metadata as any || {};
    const conversationId = metadata.conversation_id;
    const messageId = metadata.message_id;

    // Check confidence threshold
    if (confidenceScore >= 0.70) {
      console.log('✅ [auto-reply-customer] High confidence - sending automatic reply');

      // Insert AI reply into customer_messages
      const { data: replyMessage, error: replyError } = await supabase
        .from('customer_messages')
        .insert({
          user_id: aiRequest.user_id,
          sender: 'admin',
          content: replyContent,
          source_system: 'sofinity',
          is_ai: true,
          ai_confidence: confidenceScore,
          related_message_id: messageId,
          ai_classification: 'auto_reply'
        })
        .select()
        .single();

      if (replyError) {
        console.error('❌ [auto-reply-customer] Failed to insert reply:', replyError);
        throw replyError;
      }

      console.log('✅ [auto-reply-customer] Reply message inserted:', replyMessage.id);

      // Send reply to OneMil
      let sentToOneMil = false;
      if (sofinitySharedKey) {
        try {
          console.log('📤 [auto-reply-customer] Sending reply to OneMil...');
          
          const oneMillResponse = await fetch(`${supabaseUrl}/functions/v1/sofinity-message-intake`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-webhook-token': sofinitySharedKey,
            },
            body: JSON.stringify({
              user_id: aiRequest.user_id,
              content: replyContent,
              sender: 'admin',
              created_at: replyMessage.created_at,
            }),
          });

          if (oneMillResponse.ok) {
            sentToOneMil = true;
            console.log('✅ [auto-reply-customer] Reply sent to OneMil successfully');
          } else {
            const errorText = await oneMillResponse.text();
            console.error('❌ [auto-reply-customer] Failed to send to OneMil:', errorText);
            
            // Log error to sofinity_error_log
            await supabase.from('sofinity_error_log').insert({
              type: 'onemil_delivery_error',
              payload: {
                user_id: aiRequest.user_id,
                message_id: replyMessage.id,
                ai_request_id: aiRequest.id,
              },
              error: JSON.stringify({
                status: oneMillResponse.status,
                message: errorText,
              }),
            });
          }
        } catch (deliveryError: any) {
          console.error('❌ [auto-reply-customer] OneMil delivery exception:', deliveryError);
          
          // Log error to sofinity_error_log
          await supabase.from('sofinity_error_log').insert({
            type: 'onemil_delivery_error',
            payload: {
              user_id: aiRequest.user_id,
              message_id: replyMessage.id,
              ai_request_id: aiRequest.id,
            },
            error: JSON.stringify({
              message: deliveryError.message,
              stack: deliveryError.stack,
            }),
          });
        }
      } else {
        console.warn('⚠️ [auto-reply-customer] SOFINITY_SHARED_KEY not configured, skipping OneMil delivery');
      }

      // Update conversation
      if (conversationId) {
        const { error: updateError } = await supabase
          .from('customer_conversations')
          .update({
            last_message_at: replyMessage.created_at,
            last_message_preview: replyContent.substring(0, 100),
            ai_first_response: true,
            ai_last_classification: 'auto_reply_sent'
          })
          .eq('id', conversationId);

        if (updateError) {
          console.error('❌ [auto-reply-customer] Failed to update conversation:', updateError);
        } else {
          console.log('✅ [auto-reply-customer] Conversation updated');
        }
      }

      // Update AIRequest as completed
      await supabase
        .from('AIRequests')
        .update({
          status: 'completed',
          response: replyContent,
          metadata: { 
            ...metadata, 
            confidence_score: confidenceScore, 
            auto_sent: true,
            auto_sent_to_onemil: sentToOneMil,
            requires_admin: !sentToOneMil,
          }
        })
        .eq('id', aiRequest.id);

      console.log('🎉 [auto-reply-customer] Auto-reply process completed successfully');

    } else {
      console.log('⚠️ [auto-reply-customer] Low confidence - marking for admin review');

      // Update conversation to require admin
      if (conversationId) {
        const { error: updateError } = await supabase
          .from('customer_conversations')
          .update({
            status: 'requires_admin',
            ai_last_classification: 'low_confidence'
          })
          .eq('id', conversationId);

        if (updateError) {
          console.error('❌ [auto-reply-customer] Failed to update conversation status:', updateError);
        } else {
          console.log('✅ [auto-reply-customer] Conversation marked as requires_admin');
        }
      }

      // Update AIRequest with the generated response but mark as needing review
      await supabase
        .from('AIRequests')
        .update({
          status: 'completed',
          response: replyContent,
          metadata: { 
            ...metadata, 
            confidence_score: confidenceScore, 
            auto_sent: false,
            requires_admin: true
          }
        })
        .eq('id', aiRequest.id);

      console.log('📝 [auto-reply-customer] AIRequest marked for admin review');
    }

      return new Response(
      JSON.stringify({ 
        success: true, 
        ai_request_id: aiRequest.id,
        confidence_score: confidenceScore,
        auto_sent: confidenceScore >= 0.70,
        sent_to_onemil: confidenceScore >= 0.70 ? sentToOneMil : false,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('💥 [auto-reply-customer] Fatal error:', error);

    // Log error to database
    try {
      await supabase.from('sofinity_error_log').insert({
        type: 'auto_reply_error',
        payload: { ai_request_id: (await req.json())?.ai_request_id },
        error: JSON.stringify({
          message: error.message,
          stack: error.stack,
          name: error.name
        })
      });
    } catch (logError) {
      console.error('❌ [auto-reply-customer] Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
