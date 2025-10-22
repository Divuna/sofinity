-- Remove the problematic trigger that tries to call edge function from database
-- This fails because database egress is blocked (requires paid plan)
DROP TRIGGER IF EXISTS trg_after_insert_airequests ON public."AIRequests";
DROP FUNCTION IF EXISTS public.after_insert_airequests_trigger();

-- The frontend (AIAssistant.tsx) now handles this workflow:
-- 1. INSERT into AIRequests with status='waiting'
-- 2. Immediately invoke sofinity-agent-dispatcher edge function
-- 3. Real-time subscription updates UI when status changes to 'completed'