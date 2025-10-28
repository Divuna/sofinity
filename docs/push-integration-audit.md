# Push Integration Audit: Sofinity ↔ OneMil ↔ OneSignal

**Generated:** 2025-10-28  
**Scope:** Complete audit of push notification infrastructure

---

## 1. Edge Function: `sofinity-player-sync`

### 1.1 Purpose
External webhook endpoint for syncing OneSignal `player_id` from OneMil application to Sofinity database.

### 1.2 Environment Variables Required
```typescript
SUPABASE_URL              // Supabase project URL
SUPABASE_SERVICE_ROLE_KEY // Service role key for bypassing RLS
```

### 1.3 HTTP Headers & CORS
```typescript
// CORS Configuration
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type

// Client Identification Headers (read)
x-forwarded-for  // Client IP for rate limiting
x-real-ip        // Fallback IP header
user-agent       // Device identification
```

### 1.4 Authentication & Security

**⚠️ FINDING #1: No Authentication Required**
- This endpoint accepts **unauthenticated requests**
- Relies solely on rate limiting (60 req/min per IP)
- No API key, JWT, or webhook signature verification
- **Risk:** Anyone can send arbitrary `player_id` + `email` combinations

**Security Measures Present:**
- ✅ Rate limiting (60/min per IP)
- ✅ Email format validation (RFC 5322)
- ✅ Input sanitization
- ✅ Audit logging to `audit_logs` table
- ✅ Service role uses parameterized queries

**Recommendation:**
- Add webhook signature verification (HMAC-SHA256)
- Require API key in `Authorization` header
- Add IP whitelist for OneMil application servers

### 1.5 Data Flow

**For Authenticated Users (email exists in `profiles`):**
```
1. Lookup user_id from profiles table by email
2. Call RPC save_player_id(user_id, player_id, device_type, email)
3. RPC inserts/updates user_devices with ON CONFLICT
4. RPC updates profiles.onesignal_player_id
5. Log success to audit_logs
```

**For Anonymous Users (email not in `profiles`):**
```
1. User not found in profiles
2. Direct INSERT into user_devices with user_id = NULL
3. Relies on unique constraint: (email, player_id) WHERE user_id IS NULL
4. Log success to audit_logs (marked as anonymous)
```

---

## 2. Database Table: `user_devices`

### 2.1 Schema
```sql
CREATE TABLE public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULLABLE,  -- ⚠️ NULLABLE for anonymous entries
  player_id TEXT NOT NULL UNIQUE,
  device_type TEXT NOT NULL DEFAULT 'web',
  email TEXT NULLABLE,     -- ⚠️ NULLABLE but required for anonymous
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.2 Nullable Fields Analysis

| Field | Nullable | Purpose | Risk Assessment |
|-------|----------|---------|-----------------|
| `user_id` | ✅ YES | Allows anonymous entries from OneMil | **MEDIUM**: Orphaned records possible |
| `email` | ✅ YES | Optional for authenticated, required for anonymous | **HIGH**: Can lose contact info |
| `device_type` | ❌ NO | Always defaults to 'web' | ✅ Safe |
| `player_id` | ❌ NO | Primary identifier for OneSignal | ✅ Safe |

**⚠️ FINDING #2: Email Field Nullable**
- Anonymous entries require `email` but schema allows NULL
- Edge function enforces email presence but database doesn't
- **Risk:** Database integrity depends on application logic

**Recommendation:**
- Add CHECK constraint: `(user_id IS NOT NULL) OR (email IS NOT NULL)`
- Ensures every record is identifiable by either user_id or email

### 2.3 Unique Constraints

```sql
-- For authenticated users
CREATE UNIQUE INDEX user_devices_user_player_unique 
ON user_devices (user_id, player_id) 
WHERE user_id IS NOT NULL;

-- For anonymous users
CREATE UNIQUE INDEX user_devices_email_player_unique 
ON user_devices (email, player_id) 
WHERE user_id IS NULL AND email IS NOT NULL;
```

**✅ FINDING #3: Proper Anonymous Handling**
- Allows multiple devices per user (different player_ids)
- Prevents duplicate player_id for same user/email
- Correctly handles NULL user_id with partial unique index

### 2.4 RLS Policies

```sql
-- Policy 1: Users view their own devices
CREATE POLICY "Users can view their own devices"
  ON user_devices FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Service role full access
CREATE POLICY "Service role can manage all devices"
  ON user_devices FOR ALL
  USING (true)
  WITH CHECK (true);
```

**⚠️ FINDING #4: Missing INSERT Policy for Authenticated Users**
- No policy allows authenticated users to INSERT their own devices
- Only service role can INSERT
- Frontend RPC `save_player_id` works because it's SECURITY DEFINER
- **Impact:** Frontend cannot directly INSERT to user_devices (must use RPC)

**⚠️ FINDING #5: Anonymous Records Invisible**
- RLS policy filters by `auth.uid() = user_id`
- Anonymous entries have `user_id = NULL`
- **Result:** Anonymous devices are only visible to service role
- No way for anonymous user to later "claim" their device when they sign up

**Recommendations:**
```sql
-- Allow authenticated users to insert their own devices
CREATE POLICY "Users can insert own devices"
  ON user_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow linking anonymous devices by email after signup
CREATE FUNCTION claim_anonymous_device(p_email TEXT, p_new_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_devices 
  SET user_id = p_new_user_id, updated_at = now()
  WHERE email = p_email AND user_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 3. Frontend Integration: `src/main.tsx`

### 3.1 OneSignal Initialization
```typescript
await OneSignal.init({
  appId: "5e5539e1-fc71-4c4d-9fef-414293d83dbb",
  allowLocalhostAsSecureOrigin: true,
});
```

**✅ VERIFIED:** App ID matches `onesignal_app_id` in database settings table.

### 3.2 Player ID Sync to Sofinity

```typescript
OneSignal.User.PushSubscription.addEventListener('change', async (event) => {
  if (event.current.optedIn) {
    const userId = OneSignal.User.PushSubscription.id;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && userId) {
      const { error } = await supabase.rpc('save_player_id', {
        p_user_id: user.id,
        p_player_id: userId,
        p_device_type: 'web'
      });
    }
  }
});
```

### 3.3 Headers & Authentication Analysis

**✅ FINDING #6: Proper Authentication Present**
- Uses `supabase.auth.getUser()` to get authenticated session
- RPC call includes user's JWT token automatically via Supabase client
- Service role not needed because `save_player_id` is SECURITY DEFINER

**Headers Sent by Supabase Client:**
```
Authorization: Bearer <user-jwt-token>
apikey: <supabase-anon-key>
Content-Type: application/json
```

**⚠️ FINDING #7: No Call to `sofinity-player-sync` Edge Function**
- Frontend only calls RPC `save_player_id`
- `sofinity-player-sync` endpoint is **only** for external OneMil application
- No evidence of OneMil actually calling this endpoint in the codebase

**✅ FINDING #8: No Anonymous Handling in Frontend**
- Frontend requires authenticated user (`if (user && userId)`)
- Does nothing if user not authenticated
- **Expected:** OneMil app should call `sofinity-player-sync` for anonymous users

---

## 4. RPC Function: `save_player_id`

### 4.1 Function Signature
```sql
CREATE OR REPLACE FUNCTION save_player_id(
  p_user_id UUID,
  p_player_id TEXT,
  p_device_type TEXT DEFAULT 'web',
  p_email TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
```

### 4.2 Operations Performed
1. **Upsert to `user_devices`**
   ```sql
   INSERT INTO user_devices (user_id, player_id, device_type, email, created_at, updated_at)
   VALUES (p_user_id, p_player_id, p_device_type, p_email, now(), now())
   ON CONFLICT (player_id) DO UPDATE SET
     user_id = EXCLUDED.user_id,
     device_type = EXCLUDED.device_type,
     email = COALESCE(EXCLUDED.email, user_devices.email),
     updated_at = now();
   ```

2. **Update `profiles.onesignal_player_id`**
   ```sql
   UPDATE profiles 
   SET onesignal_player_id = p_player_id
   WHERE user_id = p_user_id;
   ```

**⚠️ FINDING #9: Potential Data Inconsistency**
- Same `player_id` stored in TWO places:
  - `user_devices.player_id` (normalized, multi-device support)
  - `profiles.onesignal_player_id` (legacy, single device)
- If user has multiple devices, `profiles.onesignal_player_id` gets overwritten
- **Risk:** Last device wins, losing previous device associations

**Recommendation:**
- Deprecate `profiles.onesignal_player_id` column
- Use `user_devices` as single source of truth
- Update push notification functions to query `user_devices` instead

---

## 5. Integration Gaps & Missing Pieces

### 5.1 OneMil → Sofinity Connection

**❌ MISSING:** No evidence of OneMil application calling `sofinity-player-sync`
- Edge function exists and is deployed
- Documentation exists (`docs/sofinity-player-sync-api.md`)
- **But:** No client code found that actually calls it

**Required OneMil Integration:**
```typescript
// OneMil app should call after OneSignal init
await fetch('https://rrmvxsldrjgbdxluklka.supabase.co/functions/v1/sofinity-player-sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: userEmail,
    player_id: oneSignalPlayerId,
    device_type: 'web'
  })
});
```

### 5.2 Push Notification Sending

**✅ VERIFIED:** Push sending mechanism exists
- Edge function: `create_notification`
- Uses `send_push_via_onesignal` database function
- Queries `profiles.onesignal_player_id` (not `user_devices`)

**⚠️ FINDING #10: Push Sending Uses Wrong Table**
- `send_push_via_onesignal` reads from `profiles.onesignal_player_id`
- Should query `user_devices` to support multi-device users
- Anonymous users cannot receive pushes (no profile entry)

---

## 6. Critical Security Findings Summary

| # | Severity | Finding | Impact |
|---|----------|---------|--------|
| 1 | 🔴 HIGH | No authentication on `sofinity-player-sync` | Anyone can inject fake player IDs |
| 2 | 🟡 MEDIUM | Email field nullable in `user_devices` | Can create orphaned anonymous records |
| 4 | 🟡 MEDIUM | No INSERT RLS policy for authenticated users | Depends on RPC, direct insert blocked |
| 5 | 🟠 LOW | Anonymous records invisible via RLS | Cannot claim devices after signup |
| 7 | 🔴 HIGH | No evidence of OneMil calling sync endpoint | Integration incomplete |
| 9 | 🟡 MEDIUM | `player_id` stored in two tables | Data inconsistency, last-write-wins |
| 10 | 🔴 HIGH | Push sending queries wrong table | Multi-device and anonymous users unsupported |

---

## 7. Action Items (Prioritized)

### 🔴 Critical (Do First)
1. **Add authentication to `sofinity-player-sync`**
   - Implement HMAC signature verification
   - Add API key requirement
   
2. **Verify OneMil integration**
   - Confirm OneMil app actually calls `sofinity-player-sync`
   - Test end-to-end flow from OneMil → Sofinity → OneSignal

3. **Fix push sending to support multi-device**
   - Update `send_push_via_onesignal` to query `user_devices`
   - Send to ALL user devices, not just last one

### 🟡 Important (Do Soon)
4. **Add CHECK constraint for user identification**
   ```sql
   ALTER TABLE user_devices 
   ADD CONSTRAINT require_user_or_email 
   CHECK ((user_id IS NOT NULL) OR (email IS NOT NULL));
   ```

5. **Create device claiming mechanism**
   - Add `claim_anonymous_device()` function
   - Call during user signup/login

6. **Deprecate `profiles.onesignal_player_id`**
   - Migrate all push code to use `user_devices`
   - Eventually drop column

### 🟢 Nice to Have
7. **Add RLS INSERT policy for authenticated users**
8. **Improve audit logging with structured events**
9. **Add device removal/cleanup for expired tokens**

---

## 8. Testing Checklist

- [ ] Verify OneMil calls `sofinity-player-sync` after OneSignal init
- [ ] Test anonymous user registration flow
- [ ] Test authenticated user device sync
- [ ] Test device claiming after signup
- [ ] Test push delivery to multiple devices
- [ ] Test rate limiting (61 requests in 1 minute)
- [ ] Test invalid email format rejection
- [ ] Test missing player_id rejection
- [ ] Verify audit logs capture all events
- [ ] Test RLS policies with different user contexts

---

**Audit Completed:** 2025-10-28  
**Next Review:** After implementing Critical action items
