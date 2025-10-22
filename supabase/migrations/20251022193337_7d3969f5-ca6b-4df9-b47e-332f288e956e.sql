-- ============================================
-- Krok 1: Vyčištění testovacích dat
-- Označit všechny waiting požadavky bez promptu jako chybné
-- ============================================
UPDATE "AIRequests" 
SET 
  status = 'error', 
  response = '❌ Chyba: Požadavek byl vytvořen bez promptu. Zkuste to prosím znovu.',
  updated_at = NOW()
WHERE status = 'waiting' AND prompt IS NULL;

-- ============================================
-- Krok 2: Přidání NOT NULL constraint na prompt
-- Nejdříve aktualizovat všechny NULL hodnoty
-- ============================================
UPDATE "AIRequests" 
SET prompt = 'Chybějící prompt'
WHERE prompt IS NULL;

-- Nyní přidat NOT NULL constraint
ALTER TABLE "AIRequests" 
ALTER COLUMN prompt SET NOT NULL;

-- ============================================
-- Krok 3: Přidání check constraint pro minimální délku promptu
-- ============================================
ALTER TABLE "AIRequests"
ADD CONSTRAINT check_prompt_min_length 
CHECK (LENGTH(TRIM(prompt)) >= 10);