# 🔍 Push Integration Deep Audit (Sofinity Core)

**Datum:** 2025-10-28  
**Účel:** Detailní technický audit push infrastruktury se zaměřením na autentizaci, multi-device podporu a anonymní uživatele

---

## 1. 📋 Edge Function: `sofinity-player-sync`

### 1.1 Soubor
```
supabase/functions/sofinity-player-sync/index.ts
```

### 1.2 Env Variables (Required)
```typescript
SUPABASE_URL               // ✅ Načítá se z Deno.env
SUPABASE_SERVICE_ROLE_KEY  // ✅ Načítá se z Deno.env
```

### 1.3 HTTP Headers
**Přijímané (request):**
```typescript
// Řádky 1-30: CORS headers
'Access-Control-Allow-Origin': '*'
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'

// Řádky cca 40-50: Client identification (pro rate limiting)
'x-forwarded-for'  // IP adresa klienta
'x-real-ip'        // Fallback IP
'user-agent'       // Device fingerprint
```

**⚠️ KRITICKÝ PROBLÉM #1: CHYBÍ AUTENTIZACE**
- **Řádek:** Celá funkce (řádky 41-280)
- **Problém:** Endpoint **NEPOŽADUJE** žádnou autentizaci
- **Žádné z těchto headers není vyžadováno:**
  - `Authorization: Bearer <jwt-token>` ❌
  - `apikey: <supabase-anon-key>` ❌
  - Webhook signature (HMAC-SHA256) ❌
- **Důsledek:** Kdokoliv může poslat `POST` request s libovolným `email` + `player_id`

**Současná "ochrana":**
```typescript
// Řádky 24-39: Pouze rate limiting (60 req/min per IP)
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQUESTS = 60;
```

---

## 2. 📊 Tabulka: `user_devices`

### 2.1 Definice schématu
**Soubor:** `supabase/migrations/20251027174851_8cca523d-a5ae-4ac0-9f54-a4cf9dbbbfd2.sql`

```sql
-- Řádky 6-14
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- ⚠️ NOT NULL
  player_id TEXT NOT NULL UNIQUE,
  device_type TEXT NOT NULL DEFAULT 'web',
  email TEXT,                                                         -- ⚠️ NULLABLE
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**⚠️ KRITICKÝ PROBLÉM #2: NOT NULL user_id × ANONYMNÍ UŽIVATELÉ**
- **Řádek:** 8 (migrace)
- **Problém:** `user_id UUID NOT NULL` brání vložení anonymních záznamů
- **Důsledek:** `sofinity-player-sync` edge funkce **NEMŮŽE** uložit player_id pro anonymní uživatele (řádky 261-272 v edge funkci)
- **Fix potřebný:** Změnit na `user_id UUID NULL` + CHECK constraint

### 2.2 RLS Policies
**Soubor:** Stejná migrace, řádky 35-47

```sql
-- Řádek 35: RLS je ENABLED
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- Řádky 38-41: Policy #1 (SELECT)
CREATE POLICY "Users can view their own devices"
  ON public.user_devices FOR SELECT
  USING (auth.uid() = user_id);  -- ⚠️ Filtr jen na user_id

-- Řádky 43-47: Policy #2 (ALL operations pro service role)
CREATE POLICY "Service role can manage all devices"
  ON public.user_devices FOR ALL
  USING (true)
  WITH CHECK (true);
```

**⚠️ KRITICKÝ PROBLÉM #3: CHYBÍ INSERT POLICY PRO AUTHENTICATED USERS**
- **Řádky:** 38-47
- **Problém:** Neexistuje policy typu:
  ```sql
  CREATE POLICY "Users can insert own devices"
    ON user_devices FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  ```
- **Důsledek:** Frontend **NEMŮŽE** přímý INSERT do `user_devices`, musí volat RPC `save_player_id` (SECURITY DEFINER)

**⚠️ KRITICKÝ PROBLÉM #4: ANONYMNÍ ZÁZNAMY NEVIDITELNÉ**
- **Řádek:** 41
- **Problém:** `USING (auth.uid() = user_id)` filtruje jen na shodu s `user_id`
- **Důsledek:** Pokud by existoval záznam s `user_id = NULL`, uživatel ho **NEUVIDÍ** ani po přihlášení s tím samým `email`
- **Chybí funkce:** Mechanismus "claim device" – spojení anonymního záznamu s nově vytvořeným `auth.uid()`

---

## 3. 🔄 DB Writes: Cesta zápisu player_id

### 3.1 Frontend → RPC `save_player_id`
**Soubor:** `src/main.tsx` (řádky cca 187-200)

```typescript
// Frontend inicializuje OneSignal
await OneSignal.init({
  appId: "5e5539e1-fc71-4c4d-9fef-414293d83dbb",  // ✅ Sjednoceno s DB settings
});

// Při změně subscription
OneSignal.User.PushSubscription.addEventListener('change', async (event) => {
  if (event.current.optedIn) {
    const userId = OneSignal.User.PushSubscription.id;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && userId) {
      // ✅ Volá RPC s JWT tokenem (automaticky přes Supabase client)
      await supabase.rpc('save_player_id', {
        p_user_id: user.id,
        p_player_id: userId,
        p_device_type: 'web'
      });
    }
  }
});
```

**Headers posílané Supabase clientem:**
```
Authorization: Bearer <user-jwt-token>    // ✅ Automaticky
apikey: <supabase-anon-key>               // ✅ Automaticky
Content-Type: application/json
```

### 3.2 RPC Function: `save_player_id`
**Soubor:** `supabase/migrations/20251027174851_8cca523d-a5ae-4ac0-9f54-a4cf9dbbbfd2.sql` (řádky 100-127)

```sql
CREATE OR REPLACE FUNCTION public.save_player_id(
  p_user_id UUID, 
  p_player_id TEXT, 
  p_device_type TEXT DEFAULT 'web',
  p_email TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER          -- ⚠️ Runs as owner, bypasses RLS
SET search_path TO 'public'
AS $function$
BEGIN
  -- Řádky 113-120: Upsert do user_devices
  INSERT INTO public.user_devices (user_id, player_id, device_type, email, created_at, updated_at)
  VALUES (p_user_id, p_player_id, p_device_type, p_email, now(), now())
  ON CONFLICT (player_id)
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    device_type = EXCLUDED.device_type,
    email = COALESCE(EXCLUDED.email, user_devices.email),
    updated_at = now();
    
  -- Řádky 122-125: ⚠️ DUAL WRITE DO profiles.onesignal_player_id
  UPDATE public.profiles 
  SET onesignal_player_id = p_player_id
  WHERE user_id = p_user_id;
END;
$function$;
```

**⚠️ KRITICKÝ PROBLÉM #5: DUAL STORAGE**
- **Řádky:** 113-125
- **Problém:** Stejný `player_id` se ukládá na **DVĚ MÍSTA**:
  1. `user_devices.player_id` (normalizovaná tabulka, multi-device)
  2. `profiles.onesignal_player_id` (legacy sloupec, single device)
- **Důsledek:** Pokud má user více zařízení, v `profiles.onesignal_player_id` zůstane jen **poslední** (last-write-wins)
- **Multi-device breaking:** Push se pak pošle jen na jedno zařízení

---

## 4. 📤 Push Send Paths: Kde se čtou player IDs

### 4.1 Edge Function: `create_notification`
**Soubor:** `supabase/functions/create_notification/index.ts`

#### Řádky 61-68: Query na `profiles_notifications` view
```typescript
const { data: users, error: usersError } = await supabase
  .from('profiles_notifications')
  .select('user_id, onesignal_player_id')  // ⚠️ Čte z profiles!
  .eq('is_active', true)
  .eq('source_app', source_app);
```

**⚠️ KRITICKÝ PROBLÉM #6: PUSH READS WRONG TABLE**
- **Řádek:** 65
- **Problém:** SELECT čte `onesignal_player_id` z **view**, které mapuje na `profiles.onesignal_player_id`
- **Důsledek:** 
  - ❌ Multi-device uživatelé dostanou push jen na jedno zařízení (poslední registrované)
  - ❌ Anonymní uživatelé (pouze v `user_devices`) push **NEDOSTANOU VŮBEC**
- **Správné řešení:** Změnit query na:
  ```sql
  SELECT user_id, player_id FROM user_devices WHERE user_id IN (...)
  ```

#### Řádky 147-186: OneSignal API call
```typescript
if (user.onesignal_player_id) {  // ⚠️ Používá player_id z profiles
  const pushPayload: any = {
    app_id: oneSignalAppId,
    include_player_ids: [user.onesignal_player_id],  // ⚠️ Jen JEDEN player_id
    headings: { en: title },
    contents: { en: message },
    // ...
  };

  const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${oneSignalApiKey}`,  // ✅ OneSignal REST API Key
    },
    body: JSON.stringify(pushPayload),
  });
}
```

**Současný flow:**
```
create_notification
  ↓
profiles_notifications view
  ↓
profiles.onesignal_player_id (single device)
  ↓
OneSignal API (1 recipient)
```

**Správný flow:**
```
create_notification
  ↓
user_devices table
  ↓
player_id[] (all devices per user)
  ↓
OneSignal API (multiple recipients)
```

### 4.2 DB Function: `send_push_via_onesignal`
**Soubor:** Viditelné v context (DB functions sekce)

```sql
-- Definice v migrations (řádek viz. DB functions context)
SELECT onesignal_player_id INTO player_id 
FROM public.profiles 
WHERE user_id = target_user_id;  -- ⚠️ Opět profiles místo user_devices
```

**⚠️ STEJNÝ PROBLÉM jako v #6** – čte z `profiles` místo `user_devices`.

---

## 5. 🚨 Critical Findings Summary

| # | Severity | File:Line | Problém | Dopad |
|---|----------|-----------|---------|-------|
| **1** | 🔴 **CRITICAL** | `sofinity-player-sync/index.ts:41-280` | **Žádná autentizace** – endpoint je veřejný | Kdokoliv může injektovat fake player IDs |
| **2** | 🔴 **CRITICAL** | `migrations/.../8cca523d.sql:8` | `user_id NOT NULL` × anonymní users | Edge funkce nemůže uložit anonymy |
| **3** | 🟡 **HIGH** | `migrations/.../8cca523d.sql:38-47` | Chybí `INSERT` RLS policy pro auth users | Závislost na RPC, přímý insert blokován |
| **4** | 🟡 **HIGH** | `migrations/.../8cca523d.sql:41` | Anonymní záznamy neviditelné (`user_id = NULL`) | Nelze "claimovat" device po signup |
| **5** | 🔴 **CRITICAL** | `migrations/.../8cca523d.sql:113-125` | **Dual storage** (user_devices + profiles) | Last-write-wins, multi-device broken |
| **6** | 🔴 **CRITICAL** | `create_notification/index.ts:65, 147` | Push čte z `profiles.onesignal_player_id` | Multi-device + anonymní users nedostanou push |

---

## 6. ✅ Akční Checklist (Czech)

### 🔴 **KRITICKÉ (Implementovat NYNÍ)**

#### ☑️ **#1: Přidat autentizaci do `sofinity-player-sync`**
**Soubor:** `supabase/functions/sofinity-player-sync/index.ts`

**Změny:**
```typescript
// Řádek cca 60 (za parsování JSON body)
const authHeader = req.headers.get('authorization');
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized - missing or invalid Authorization header' }),
    { status: 401, headers: corsHeaders }
  );
}

// Validace JWT nebo API key
const token = authHeader.replace('Bearer ', '');
// Implementovat HMAC signature check nebo JWT verify
```

**Implementovat jednu z variant:**
- **Varianta A:** HMAC-SHA256 signature v custom header `X-Webhook-Signature`
- **Varianta B:** Vyžadovat Supabase JWT token (volající musí být authenticated)
- **Varianta C:** Sdílený API key v Authorization header

---

#### ☑️ **#2: Umožnit nullable `user_id` v `user_devices`**
**Soubor:** Nová migrace (vytvořit `supabase/migrations/YYYYMMDD_allow_anonymous_devices.sql`)

```sql
-- Změnit user_id na NULLABLE
ALTER TABLE public.user_devices 
ALTER COLUMN user_id DROP NOT NULL;

-- Přidat CHECK constraint pro zajištění identifikace
ALTER TABLE public.user_devices 
ADD CONSTRAINT require_user_or_email 
CHECK (
  (user_id IS NOT NULL) OR (email IS NOT NULL)
);

-- Vytvořit partial unique index pro anonymní uživatele
CREATE UNIQUE INDEX user_devices_email_player_unique 
ON public.user_devices (email, player_id) 
WHERE user_id IS NULL AND email IS NOT NULL;
```

**Testovat:**
```sql
-- Mělo by projít
INSERT INTO user_devices (user_id, player_id, device_type, email)
VALUES (NULL, 'test-anon-player-123', 'web', 'test@example.com');

-- Mělo by selhat (porušení CHECK)
INSERT INTO user_devices (user_id, player_id, device_type, email)
VALUES (NULL, 'test-invalid', 'web', NULL);
```

---

#### ☑️ **#3: Upravit push sending na `user_devices`**
**Soubor:** `supabase/functions/create_notification/index.ts`

**Řádek 61-68:** Změnit query
```typescript
// PŘED (řádek 63-67):
const { data: users, error: usersError } = await supabase
  .from('profiles_notifications')
  .select('user_id, onesignal_player_id')
  .eq('is_active', true)
  .eq('source_app', source_app);

// PO (multi-device support):
const { data: devices, error: devicesError } = await supabase
  .from('user_devices')
  .select('user_id, player_id, device_type')
  .not('player_id', 'is', null);

// Případně JOIN s profiles pro filtrování is_active / source_app
```

**Řádky 92-190:** Změnit loop
```typescript
// PŘED:
for (const user of users) {
  if (user.onesignal_player_id) { /* ... */ }
}

// PO:
for (const device of devices) {
  if (device.player_id) {
    // Posílat push na device.player_id
    // Seskupit devices podle user_id pro bulk send
  }
}
```

**Optimalizace:** Pro stejného uživatele s více zařízeními poslat jeden OneSignal request s `include_player_ids: [id1, id2, id3]`.

---

#### ☑️ **#4: Vytvořit funkci `claim_anonymous_device`**
**Soubor:** Nová migrace (vytvořit `supabase/migrations/YYYYMMDD_claim_device_function.sql`)

```sql
CREATE OR REPLACE FUNCTION public.claim_anonymous_device(
  p_email TEXT,
  p_new_user_id UUID
)
RETURNS INTEGER  -- Počet převedených záznamů
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Převést anonymní záznamy na authenticated
  UPDATE public.user_devices 
  SET 
    user_id = p_new_user_id,
    updated_at = now()
  WHERE 
    email = p_email 
    AND user_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Log do audit_logs
  IF updated_count > 0 THEN
    INSERT INTO public.audit_logs (event_name, user_id, event_data, created_at)
    VALUES (
      'device_claimed',
      p_new_user_id,
      jsonb_build_object(
        'email', p_email,
        'devices_claimed', updated_count
      ),
      now()
    );
  END IF;
  
  RETURN updated_count;
END;
$function$;
```

**Použití:** Zavolat při user signup/login (např. v trigger `handle_new_user` na `auth.users`):
```sql
-- V triggeru po INSERT do auth.users
PERFORM public.claim_anonymous_device(NEW.email, NEW.id);
```

---

### 🟡 **VYSOKÁ PRIORITA (Implementovat brzy)**

#### ☑️ **#5: Přidat RLS INSERT policy pro authenticated users**
**Soubor:** Nová migrace

```sql
CREATE POLICY "Users can insert own devices"
  ON public.user_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

#### ☑️ **#6: Deprecate `profiles.onesignal_player_id`**
**Proces:**
1. ✅ Všechny reads přesměrovat na `user_devices` (viz #3)
2. ✅ Odstranit řádek 122-125 z `save_player_id` funkce (přestat zapisovat do profiles)
3. ⏳ Po 30 dnech: `ALTER TABLE profiles DROP COLUMN onesignal_player_id;`

---

### 🟢 **NICE-TO-HAVE (Vylepšení)**

#### ☑️ **#7: Vylepšit audit logging**
- Structured events s JSON payload místo plain text
- Retention policy (archivace starších než 90 dní)

#### ☑️ **#8: Device cleanup (expired tokens)**
- Cron job pro smazání `user_devices` starších než 180 dní bez aktivity
- OneSignal webhook pro `unsubscribed` event → soft delete

#### ☑️ **#9: Monitoring dashboard**
- `/sofinity-push-sender` → zobrazit multi-device stats
- Alert při high failure rate

---

## 7. 🧪 Testing Checklist

Po implementaci oprav **otestovat**:

- [ ] **Auth test:** `sofinity-player-sync` bez `Authorization` header → 401
- [ ] **Auth test:** `sofinity-player-sync` s validním tokenem → 200
- [ ] **Anonymous sync:** POST s `{ email, player_id }` bez user_id → uloží se s `user_id = NULL`
- [ ] **Multi-device:** Registrovat 2 zařízení pro stejného usera → oba dostanou push
- [ ] **Device claim:** Signup nového usera s `email` → převezmou se anonymní devices
- [ ] **Push test:** Poslat z `/sofinity-push-sender` → zkontrolovat edge logy + OneSignal dashboard
- [ ] **RLS test:** Frontend volá `save_player_id` → projde (authenticated user)
- [ ] **Edge case:** Player ID s neplatným formátem → 400 error

---

## 8. 📊 Závěr

**Hlavní blokátory:**
1. ❌ Endpoint `sofinity-player-sync` je **bez autentizace** – bezpečnostní díra
2. ❌ `user_id NOT NULL` brání ukládání anonymních devices
3. ❌ Push sending čte z `profiles` místo `user_devices` – broken multi-device

**Po opravách:**
- ✅ Bezpečný webhook s HMAC/JWT autentizací
- ✅ Podpora multi-device (více zařízení na jednoho usera)
- ✅ Anonymní uživatelé mohou dostat push (před signup)
- ✅ Automatické "claimnutí" devices po registraci

**Next Steps:**
1. Implementovat kritické opravy (#1-#4)
2. Nasadit do preview a testovat
3. Sledovat edge function logy (`sofinity-player-sync`, `create_notification`)
4. Ověřit v OneSignal dashboard, že pushes dorazily

---

**Audit dokončen:** 2025-10-28  
**Následující review:** Po implementaci kritických změn
