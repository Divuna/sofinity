import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-token',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  console.log('🔔 [sofinity-message-intake] Incoming request');
  
  let requestBody: any;
  
  try {
    // Log incoming headers
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log('📥 [sofinity-message-intake] Headers:', JSON.stringify(headers, null, 2));

    // Read and log incoming body
    const bodyText = await req.text();
    console.log('📥 [sofinity-message-intake] Body:', bodyText);
    
    try {
      requestBody = JSON.parse(bodyText);
      console.log('📥 [sofinity-message-intake] Parsed body:', JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
      console.error('❌ [sofinity-message-intake] JSON parse error:', parseError);
      throw new Error('Invalid JSON payload');
    }

    // Validate webhook token
    const webhookToken = req.headers.get('x-webhook-token');
    const expectedToken = Deno.env.get('INTERNAL_WEBHOOK_TOKEN');
    
    console.log('🔑 [sofinity-message-intake] Token validation:', {
      received: webhookToken ? 'present' : 'missing',
      expected: expectedToken ? 'configured' : 'not configured'
    });

    if (!webhookToken || !expectedToken || webhookToken !== expectedToken) {
      console.error('❌ [sofinity-message-intake] Token validation failed');
      throw new Error('Unauthorized: Invalid webhook token');
    }

    console.log('✅ [sofinity-message-intake] Token validated successfully');

    // Validate payload structure
    const { user_id, sender, content, created_at } = requestBody;
    
    if (!user_id || !sender || !content) {
      console.error('❌ [sofinity-message-intake] Missing required fields:', {
        user_id: !!user_id,
        sender: !!sender,
        content: !!content
      });
      throw new Error('Missing required fields: user_id, sender, content');
    }

    console.log('✅ [sofinity-message-intake] Payload validated');

    // Insert message into customer_messages
    console.log('💬 [sofinity-message-intake] Inserting message into customer_messages...');
    const { data: messageData, error: messageError } = await supabase
      .from('customer_messages')
      .insert({
        user_id,
        sender,
        content,
        source_system: 'onemill',
        created_at: created_at || new Date().toISOString(),
        read: false
      })
      .select()
      .single();

    if (messageError) {
      console.error('❌ [sofinity-message-intake] Message insert error:', messageError);
      throw messageError;
    }

    console.log('✅ [sofinity-message-intake] Message inserted:', messageData);

    // Check if conversation exists
    console.log('🔍 [sofinity-message-intake] Checking for existing conversation...');
    const { data: existingConversation, error: conversationCheckError } = await supabase
      .from('customer_conversations')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    if (conversationCheckError) {
      console.error('❌ [sofinity-message-intake] Conversation check error:', conversationCheckError);
      throw conversationCheckError;
    }

    if (existingConversation) {
      // Update existing conversation
      console.log('📝 [sofinity-message-intake] Updating existing conversation:', existingConversation.id);
      
      const unreadIncrement = sender === 'user' ? 1 : 0;
      const newUnreadCount = (existingConversation.unread_count || 0) + unreadIncrement;
      
      const { data: updatedConversation, error: updateError } = await supabase
        .from('customer_conversations')
        .update({
          last_message_at: messageData.created_at,
          last_message_preview: content.substring(0, 100),
          unread_count: newUnreadCount
        })
        .eq('id', existingConversation.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ [sofinity-message-intake] Conversation update error:', updateError);
        throw updateError;
      }

      console.log('✅ [sofinity-message-intake] Conversation updated:', updatedConversation);
    } else {
      // Create new conversation
      console.log('➕ [sofinity-message-intake] Creating new conversation...');
      
      const { data: newConversation, error: createError } = await supabase
        .from('customer_conversations')
        .insert({
          user_id,
          status: 'open',
          unread_count: sender === 'user' ? 1 : 0,
          last_message_at: messageData.created_at,
          last_message_preview: content.substring(0, 100)
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ [sofinity-message-intake] Conversation creation error:', createError);
        throw createError;
      }

      console.log('✅ [sofinity-message-intake] Conversation created:', newConversation);
    }

    console.log('🎉 [sofinity-message-intake] Message intake completed successfully');
    
    // If message is from OneMil and sender is user, create AIRequest for auto-reply
    if (sender === 'user') {
      console.log('👤 [sofinity-message-intake] User message detected, creating AIRequest for auto-reply');
      
      try {
        const { data: aiRequest, error: aiRequestError } = await supabase
          .from('AIRequests')
          .insert({
            type: 'customer_auto_reply',
            status: 'pending',
            prompt: content,
            user_id: user_id,
            metadata: {
              message_id: messageData.id,
              conversation_id: existingConversation?.id || newConversation?.id,
              source_system: 'onemill'
            }
          })
          .select()
          .single();

        if (aiRequestError) {
          console.error('❌ [sofinity-message-intake] AIRequest creation error:', aiRequestError);
        } else {
          console.log('✅ [sofinity-message-intake] AIRequest created:', aiRequest.id);
          
          // Trigger background processing with 2-5 second delay
          EdgeRuntime.waitUntil(
            (async () => {
              const delay = Math.floor(Math.random() * 3000) + 2000; // 2-5 seconds
              console.log(`⏳ [sofinity-message-intake] Waiting ${delay}ms before processing AI reply`);
              await new Promise(resolve => setTimeout(resolve, delay));
              
              // Call the auto-reply function
              await fetch(`${supabaseUrl}/functions/v1/auto-reply-customer`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseServiceRoleKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ai_request_id: aiRequest.id })
              });
            })()
          );
        }
      } catch (aiError) {
        console.error('💥 [sofinity-message-intake] Failed to create AIRequest:', aiError);
      }
    }
    
    return new Response(
      JSON.stringify({ status: 'ok' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('💥 [sofinity-message-intake] Fatal error:', error);
    
    // Log error to sofinity_error_log table
    try {
      console.log('📝 [sofinity-message-intake] Logging error to sofinity_error_log...');
      const { error: logError } = await supabase
        .from('sofinity_error_log')
        .insert({
          type: 'message_intake_error',
          payload: requestBody || {},
          error: JSON.stringify({
            message: error.message,
            stack: error.stack,
            name: error.name
          })
        });
      
      if (logError) {
        console.error('❌ [sofinity-message-intake] Error log insert failed:', logError);
      } else {
        console.log('✅ [sofinity-message-intake] Error logged to database');
      }
    } catch (logError) {
      console.error('💥 [sofinity-message-intake] Failed to log error to database:', logError);
    }

    return new Response(
      JSON.stringify({ 
        status: 'error',
        message: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
