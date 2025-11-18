# OneMil Integration Guide: Receiving Messages from Sofinity

## Overview
This document describes how OneMil's `from_sofinity_message` edge function should be implemented to correctly receive admin/AI replies from Sofinity.

## Edge Function: `from_sofinity_message`

### Endpoint Configuration
- **Function Name**: `from_sofinity_message`
- **Method**: POST
- **Authentication**: Custom webhook token via `x-webhook-token` header
- **verify_jwt**: false (uses custom token authentication)

### Expected Payload Structure
```json
{
  "user_id": "uuid-string",
  "content": "Message text content",
  "sender": "admin" | "user",
  "is_ai": true | false,
  "ai_confidence": 0.0-1.0 | null
}
```

### Required Headers
```
Content-Type: application/json
x-webhook-token: <INTERNAL_WEBHOOK_TOKEN>
```

### Implementation Requirements

#### 1. Token Validation
```typescript
const webhookToken = req.headers.get('x-webhook-token');
const expectedToken = Deno.env.get('INTERNAL_WEBHOOK_TOKEN');

if (!webhookToken || webhookToken !== expectedToken) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}
```

#### 2. Payload Validation
```typescript
const { user_id, content, sender, is_ai, ai_confidence } = await req.json();

if (!user_id || !content || !sender) {
  return new Response(
    JSON.stringify({ error: 'Missing required fields' }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}
```

#### 3. Database Insert
Insert the message into OneMil's messages table:
```typescript
const { error } = await supabase
  .from('messages')  // or your messages table name
  .insert({
    user_id,
    content,
    sender,
    is_ai: is_ai || false,
    ai_confidence,
    source: 'sofinity',
    created_at: new Date().toISOString(),
  });

if (error) {
  throw error;
}
```

#### 4. Realtime Channel Trigger
Trigger the realtime channel to notify the user:
```typescript
const channel = supabase.channel(`user-thread-${user_id}`);

await channel.send({
  type: 'broadcast',
  event: 'new_message',
  payload: {
    user_id,
    content,
    sender,
    is_ai,
    created_at: new Date().toISOString(),
  },
});
```

#### 5. Success Response
```typescript
return new Response(
  JSON.stringify({ status: 'ok', message_received: true }),
  { 
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  }
);
```

### Complete Example Implementation

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-token',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  console.log('🔔 [from_sofinity_message] Incoming message from Sofinity');

  try {
    // Validate webhook token
    const webhookToken = req.headers.get('x-webhook-token');
    const expectedToken = Deno.env.get('INTERNAL_WEBHOOK_TOKEN');

    if (!webhookToken || !expectedToken || webhookToken !== expectedToken) {
      console.error('❌ [from_sofinity_message] Invalid webhook token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse and validate payload
    const payload = await req.json();
    const { user_id, content, sender, is_ai, ai_confidence } = payload;

    if (!user_id || !content || !sender) {
      console.error('❌ [from_sofinity_message] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, content, sender' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('📝 [from_sofinity_message] Inserting message:', {
      user_id,
      sender,
      is_ai,
      content_length: content.length,
    });

    // Insert message into database
    const { data: messageData, error: messageError } = await supabase
      .from('messages')  // Replace with your actual table name
      .insert({
        user_id,
        content,
        sender,
        is_ai: is_ai || false,
        ai_confidence,
        source: 'sofinity',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (messageError) {
      console.error('❌ [from_sofinity_message] Database error:', messageError);
      throw messageError;
    }

    console.log('✅ [from_sofinity_message] Message inserted:', messageData);

    // Trigger realtime channel
    console.log('📡 [from_sofinity_message] Broadcasting to channel:', `user-thread-${user_id}`);
    
    const channel = supabase.channel(`user-thread-${user_id}`);
    await channel.send({
      type: 'broadcast',
      event: 'new_message',
      payload: messageData,
    });

    console.log('✅ [from_sofinity_message] Message processed successfully');

    return new Response(
      JSON.stringify({ 
        status: 'ok',
        message_received: true,
        message_id: messageData.id,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('💥 [from_sofinity_message] Fatal error:', error);

    // Log error to database (optional)
    try {
      await supabase
        .from('error_logs')  // Replace with your error log table
        .insert({
          type: 'sofinity_message_error',
          error: JSON.stringify({
            message: error.message,
            stack: error.stack,
          }),
          created_at: new Date().toISOString(),
        });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ 
        status: 'error',
        message: error.message,
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
```

## Configuration in OneMil

### Environment Variables
Ensure the following environment variable is set in OneMil's edge function secrets:
- `INTERNAL_WEBHOOK_TOKEN`: Shared secret token for webhook authentication (same value as in Sofinity)

### Supabase Config
In OneMil's `supabase/config.toml`:
```toml
[functions.from_sofinity_message]
verify_jwt = false  # Uses custom token authentication
```

## Testing

### Test Webhook Call
```bash
curl -X POST https://your-onemill-project.supabase.co/functions/v1/from_sofinity_message \
  -H "Content-Type: application/json" \
  -H "x-webhook-token: your-internal-webhook-token" \
  -d '{
    "user_id": "test-user-id",
    "content": "Test message from Sofinity",
    "sender": "admin",
    "is_ai": false,
    "ai_confidence": null
  }'
```

### Expected Response
```json
{
  "status": "ok",
  "message_received": true,
  "message_id": "uuid-of-inserted-message"
}
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check that `INTERNAL_WEBHOOK_TOKEN` is set correctly in both Sofinity and OneMil
   - Ensure the token values match exactly

2. **400 Bad Request**
   - Verify the payload structure matches the expected format
   - Check that all required fields are present

3. **Realtime Channel Not Triggering**
   - Verify the channel name format: `user-thread-{user_id}`
   - Check that Supabase Realtime is enabled
   - Ensure the user is subscribed to the correct channel

4. **Database Insertion Fails**
   - Verify the table name and column names match your schema
   - Check RLS policies allow insertion from the edge function

## Security Considerations

1. **Token Security**
   - Never expose `INTERNAL_WEBHOOK_TOKEN` in client-side code
   - Rotate the token periodically
   - Use a strong, random token (at least 32 characters)

2. **Rate Limiting**
   - Consider implementing rate limiting to prevent abuse
   - Track webhook requests by IP or user_id

3. **Payload Validation**
   - Always validate all input fields
   - Sanitize content before storing in database
   - Implement maximum content length limits

## Monitoring

### Recommended Logging
- Log all incoming webhook requests
- Track success/failure rates
- Monitor message delivery latency
- Alert on repeated failures

### Metrics to Track
- Webhook request count
- Success rate
- Average processing time
- Error types and frequencies
