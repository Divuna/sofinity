# Sofinity Player Sync API

## Overview

The `sofinity-player-sync` Edge Function allows external applications (like OneMil) to send OneSignal `player_id` data directly to Sofinity. This enables push notification delivery without requiring modifications to existing event flows.

---

## Endpoint

```
POST https://rrmvxsldrjgbdxluklka.supabase.co/functions/v1/sofinity-player-sync
```

**Authentication:** Not required (public endpoint)

**Rate Limit:** 60 requests per minute per IP address

---

## Request Format

### Headers
```
Content-Type: application/json
```

### Body (JSON)
```json
{
  "email": "user@example.com",
  "player_id": "abc123-def456-ghi789",
  "device_type": "web"
}
```

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ Yes | User's email address (must exist in Sofinity) |
| `player_id` | string | ✅ Yes | OneSignal player/subscription ID |
| `device_type` | string | ❌ No | Device type: `web`, `mobile`, or `tablet` (default: `web`) |

---

## Response Format

### Success Response (200 OK)
```json
{
  "status": "success",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "player_id": "abc123-def456-ghi789"
}
```

### Error Responses

#### 400 Bad Request - Invalid Input
```json
{
  "status": "error",
  "error": "Invalid email format"
}
```

**Common validation errors:**
- `"Missing or invalid 'email' field"`
- `"Invalid email format"`
- `"Missing or invalid 'player_id' field"`
- `"Invalid 'device_type'. Must be one of: web, mobile, tablet"`
- `"Invalid JSON payload"`

#### 404 Not Found - User Not Found
```json
{
  "status": "error",
  "error": "User not found with email: user@example.com"
}
```

#### 429 Too Many Requests - Rate Limit Exceeded
```json
{
  "status": "error",
  "error": "Rate limit exceeded. Maximum 60 requests per minute."
}
```

#### 500 Internal Server Error
```json
{
  "status": "error",
  "error": "Internal server error"
}
```

---

## Integration Examples

### JavaScript/TypeScript (OneMil App)
```typescript
// After user registration or login
const playerId = await OneSignal.User.PushSubscription.id;

try {
  const response = await fetch('https://rrmvxsldrjgbdxluklka.supabase.co/functions/v1/sofinity-player-sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: user.email,
      player_id: playerId,
      device_type: 'mobile'
    })
  });

  const result = await response.json();
  
  if (response.ok) {
    console.log('✅ Player ID synced successfully:', result);
  } else {
    console.error('❌ Failed to sync player ID:', result.error);
  }
} catch (error) {
  console.error('❌ Network error:', error);
}
```

### cURL (Testing)
```bash
curl -X POST https://rrmvxsldrjgbdxluklka.supabase.co/functions/v1/sofinity-player-sync \
  -H "Content-Type: application/json" \
  -d '{
    "email": "support@opravo.cz",
    "player_id": "test-player-123",
    "device_type": "web"
  }'
```

### Python
```python
import requests

response = requests.post(
    'https://rrmvxsldrjgbdxluklka.supabase.co/functions/v1/sofinity-player-sync',
    json={
        'email': 'user@example.com',
        'player_id': 'abc123-def456',
        'device_type': 'mobile'
    }
)

if response.status_code == 200:
    print('✅ Success:', response.json())
else:
    print('❌ Error:', response.json())
```

---

## Security Considerations

### ✅ Security Features
- **Input Validation**: All inputs are validated and sanitized
- **Rate Limiting**: 60 requests per minute per IP to prevent abuse
- **Audit Logging**: All sync attempts are logged to `audit_logs` table
- **Email Verification**: Only syncs for users that exist in Sofinity
- **CORS Enabled**: Allows cross-origin requests from web apps

### ⚠️ Important Notes
- No authentication required (public endpoint by design)
- Email addresses are validated but not sanitized for SQL injection (handled by Supabase client)
- Rate limit is per IP address (may affect users behind shared IPs)
- All requests are logged with IP address and user agent for auditing

---

## Data Flow

```
OneMil App
    ↓
POST /sofinity-player-sync
    ↓
Validate email + player_id
    ↓
Lookup user in profiles table
    ↓
Call save_player_id(user_id, player_id, device_type)
    ↓
Update user_devices + profiles.onesignal_player_id
    ↓
Log to audit_logs
    ↓
Return success/error response
```

---

## Database Changes

When a `player_id` is successfully synced:

1. **`user_devices` table**: Insert/update with UPSERT logic
   ```sql
   INSERT INTO user_devices (user_id, player_id, device_type)
   VALUES (user_id, player_id, device_type)
   ON CONFLICT (player_id) DO UPDATE SET ...
   ```

2. **`profiles.onesignal_player_id`**: Updated for backward compatibility

3. **`audit_logs` table**: Event logged with full details
   ```json
   {
     "event_name": "player_id_sync",
     "user_id": "uuid",
     "event_data": {
       "email": "user@example.com",
       "player_id": "abc123",
       "device_type": "mobile",
       "success": true,
       "timestamp": "2025-01-27T10:30:00Z",
       "ip_address": "192.168.1.1",
       "user_agent": "Mozilla/5.0..."
     }
   }
   ```

---

## Testing

### Test 1: Valid Request
```bash
curl -X POST https://rrmvxsldrjgbdxluklka.supabase.co/functions/v1/sofinity-player-sync \
  -H "Content-Type: application/json" \
  -d '{"email":"support@opravo.cz","player_id":"test-123","device_type":"web"}'
```
**Expected:** `200 OK` with success response

### Test 2: Invalid Email
```bash
curl -X POST https://rrmvxsldrjgbdxluklka.supabase.co/functions/v1/sofinity-player-sync \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email","player_id":"test-123","device_type":"web"}'
```
**Expected:** `400 Bad Request` with validation error

### Test 3: User Not Found
```bash
curl -X POST https://rrmvxsldrjgbdxluklka.supabase.co/functions/v1/sofinity-player-sync \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@example.com","player_id":"test-123","device_type":"web"}'
```
**Expected:** `404 Not Found` with user not found error

### Test 4: Verify Data Persistence
After a successful sync, check the database:
```sql
SELECT * FROM user_devices WHERE player_id = 'test-123';
SELECT onesignal_player_id FROM profiles WHERE email = 'support@opravo.cz';
```

---

## Monitoring

### Query Recent Sync Attempts
```sql
SELECT 
  event_name,
  user_id,
  event_data->>'email' as email,
  event_data->>'player_id' as player_id,
  event_data->>'success' as success,
  created_at
FROM audit_logs
WHERE event_name IN ('player_id_sync', 'player_id_sync_failed')
ORDER BY created_at DESC
LIMIT 50;
```

### Check Success Rate (Last 24 Hours)
```sql
SELECT 
  COUNT(*) FILTER (WHERE event_name = 'player_id_sync') as successful,
  COUNT(*) FILTER (WHERE event_name = 'player_id_sync_failed') as failed,
  ROUND(
    COUNT(*) FILTER (WHERE event_name = 'player_id_sync')::numeric / 
    NULLIF(COUNT(*)::numeric, 0) * 100, 
    2
  ) as success_rate_percent
FROM audit_logs
WHERE event_name IN ('player_id_sync', 'player_id_sync_failed')
  AND created_at > now() - interval '24 hours';
```

---

## Troubleshooting

### Problem: "User not found" error
**Solution:** Verify the user exists in `profiles` table with the correct email

### Problem: Rate limit exceeded
**Solution:** Wait 1 minute or implement exponential backoff in client

### Problem: "Failed to save player_id to database"
**Solution:** Check Supabase Edge Function logs for RPC errors

### Problem: Player ID not appearing in `user_devices`
**Solution:** Verify `save_player_id` RPC function exists and is working

---

## OneMil Integration Checklist

- [ ] Initialize OneSignal SDK in OneMil app
- [ ] Capture `player_id` after user registration/login
- [ ] Send `player_id` to `sofinity-player-sync` endpoint
- [ ] Handle errors gracefully (don't block registration)
- [ ] Implement retry logic with exponential backoff
- [ ] Test with `support@opravo.cz` before production
- [ ] Monitor success rate in `audit_logs` table
- [ ] Verify push notifications are delivered successfully

---

## Support

For issues or questions:
1. Check Edge Function logs: [Supabase Dashboard → Functions → sofinity-player-sync → Logs](https://supabase.com/dashboard/project/rrmvxsldrjgbdxluklka/functions/sofinity-player-sync/logs)
2. Query `audit_logs` table for sync attempts
3. Verify OneSignal configuration in OneMil app
4. Contact Sofinity development team
