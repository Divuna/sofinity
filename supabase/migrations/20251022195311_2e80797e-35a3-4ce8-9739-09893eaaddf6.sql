-- ============================================
-- Odstranění problematického triggeru a vyčištění duplicitních záznamů
-- ============================================

-- 1. Odstranit trigger, který vytváří duplicitní campaign_generator požadavky
DROP TRIGGER IF EXISTS trg_after_insert_airequests_create_campaign ON "AIRequests";

-- 2. Odstranit funkci
DROP FUNCTION IF EXISTS after_insert_airequests_create_campaign();

-- 3. Označit všechny čekající campaign_generator požadavky vytvořené triggerem jako chybné
UPDATE "AIRequests"
SET 
  status = 'error',
  response = '❌ Chyba: Tento požadavek byl vytvořen nesprávným triggerem a byl automaticky zrušen.',
  updated_at = NOW()
WHERE 
  type = 'campaign_generator' 
  AND status = 'waiting'
  AND prompt LIKE 'Zpracuj událost:%';