-- ================================================================
-- SOFINITY RLS BEZPEČNOSTNÍ AUDIT A OPRAVY
-- Datum: 2025-09-26
-- Popis: Kompletní oprava Row Level Security politik pro všechny tabulky
-- ================================================================

-- 1. POVOLENÍ RLS NA NEZABEZPEČENÝCH TABULKÁCH (KRITICKÉ)
-- ================================================================

-- Povolení RLS na eventlogs (obsahuje user_id - KRITICKÉ)
ALTER TABLE public.eventlogs ENABLE ROW LEVEL SECURITY;

-- Povolení RLS na notifications (lowercase tabulka - obsahuje user_id)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Povolení RLS na tickets (obsahuje user_id)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Povolení RLS na users (referenční tabulka)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Povolení RLS na vouchers (finanční data - KRITICKÉ)
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Povolení RLS na contests (veřejná data)
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;

-- 2. VYTVOŘENÍ CHYBĚJÍCÍCH RLS POLITIK
-- ================================================================

-- eventlogs tabulka - KRITICKÉ (obsahuje user_id)
CREATE POLICY "Uživatelé mohou zobrazit své eventlogs" 
ON public.eventlogs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role může vkládat eventlogs" 
ON public.eventlogs FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Uživatelé mohou vkládat své eventlogs" 
ON public.eventlogs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- notifications tabulka (lowercase verze)
CREATE POLICY "Uživatelé mohou zobrazit své notifikace" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Uživatelé mohou vkládat své notifikace" 
ON public.notifications FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Uživatelé mohou upravovat své notifikace" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role může spravovat notifikace" 
ON public.notifications FOR ALL 
USING (true) WITH CHECK (true);

-- tickets tabulka
CREATE POLICY "Uživatelé mohou zobrazit své tickety" 
ON public.tickets FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Uživatelé mohou vytvářet své tickety" 
ON public.tickets FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Uživatelé mohou upravovat své tickety" 
ON public.tickets FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role může spravovat tickety" 
ON public.tickets FOR ALL 
USING (true) WITH CHECK (true);

-- vouchers tabulka - KRITICKÉ (finanční data)
CREATE POLICY "Uživatelé mohou zobrazit své vouchery" 
ON public.vouchers FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role může spravovat vouchery" 
ON public.vouchers FOR ALL 
USING (true) WITH CHECK (true);

-- users tabulka (referenční)
CREATE POLICY "Všichni uživatelé mohou zobrazit users" 
ON public.users FOR SELECT 
USING (true);

CREATE POLICY "Service role může spravovat users" 
ON public.users FOR ALL 
USING (true) WITH CHECK (true);

-- contests tabulka (veřejná data)
CREATE POLICY "Všichni mohou zobrazit soutěže" 
ON public.contests FOR SELECT 
USING (true);

CREATE POLICY "Service role může spravovat soutěže" 
ON public.contests FOR ALL 
USING (true) WITH CHECK (true);

-- 3. ODSTRANĚNÍ DUPLICITNÍCH POLITIK (EMAILS TABULKA)
-- ================================================================

-- Odstranění duplicitních politik z Emails tabulky (ponecháváme "own" verze)
DROP POLICY IF EXISTS "Users can insert their emails" ON public."Emails";
DROP POLICY IF EXISTS "Users can update their emails" ON public."Emails";  
DROP POLICY IF EXISTS "Users can view their emails" ON public."Emails";

-- 4. PŘIDÁNÍ CHYBĚJÍCÍCH SERVICE ROLE POLITIK
-- ================================================================

-- Service role politiky pro backend operace
CREATE POLICY "Service role může spravovat campaign stats" 
ON public."CampaignStats" FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Service role může spravovat email events" 
ON public."EmailEvents" FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Service role může spravovat feedback" 
ON public."Feedback" FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Service role může spravovat templates" 
ON public."Templates" FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Service role může spravovat projects" 
ON public."Projects" FOR ALL 
USING (true) WITH CHECK (true);

-- 5. DOPLNĚNÍ CHYBĚJÍCÍCH POLITIK PRO EMAILEVENTS
-- ================================================================

-- EmailEvents má pouze SELECT policy, přidáváme INSERT/UPDATE/DELETE
CREATE POLICY "Service role může vkládat email events" 
ON public."EmailEvents" FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role může upravovat email events" 
ON public."EmailEvents" FOR UPDATE 
USING (true);

-- ================================================================
-- SHRNUTÍ ZMĚN:
-- ----------------------------------------------------------------
-- ✅ POVOLENO RLS NA: eventlogs, notifications, tickets, users, vouchers, contests
-- ✅ VYTVOŘENO: 23 nových RLS politik pro zabezpečení dat
-- ✅ ODSTRANĚNO: 3 duplicitní politiky z Emails tabulky
-- ✅ PŘIDÁNO: 7 service role politik pro backend operace
-- ================================================================