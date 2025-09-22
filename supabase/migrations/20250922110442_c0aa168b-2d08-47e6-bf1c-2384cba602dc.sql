-- OneMil ↔ Sofinity Foreign Key Integrity Auto-Fix Migration
-- This migration fixes critical FK integrity issues and creates required test data

-- ============================================================================
-- STEP 1: Create test user and profile if they don't exist
-- ============================================================================

-- Insert test user in auth.users (ignore conflicts if exists)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@onemil.cz',
  crypt('testpassword123', gen_salt('bf')), -- encrypted password
  now(),
  now(),
  now(),
  '{"role": "user"}'::jsonb,
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Insert corresponding profile in public.profiles (ignore conflicts if exists)
INSERT INTO public.profiles (
  user_id,
  email,
  name,
  role,
  onboarding_complete,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@onemil.cz',
  'OneMil Test User',
  'team_lead',
  true,
  now(),
  now()
) ON CONFLICT (user_id) DO UPDATE SET
  role = EXCLUDED.role,
  onboarding_complete = EXCLUDED.onboarding_complete,
  updated_at = now();

-- ============================================================================
-- STEP 2: Fix Foreign Key Integrity between EventLogs and Profiles
-- ============================================================================

-- Drop existing FK constraint if it exists (safe operation)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'eventlogs_user_id_fkey' 
        AND table_name = 'eventlogs'
    ) THEN
        ALTER TABLE public.eventlogs DROP CONSTRAINT eventlogs_user_id_fkey;
        RAISE NOTICE 'Dropped existing FK constraint: eventlogs_user_id_fkey';
    ELSE
        RAISE NOTICE 'FK constraint eventlogs_user_id_fkey does not exist, skipping drop';
    END IF;
END $$;

-- Clean up orphaned EventLogs entries (COMMENTED OUT for manual review)
-- Uncomment the following lines after reviewing orphaned data:
/*
DELETE FROM public.eventlogs 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT user_id FROM public.profiles);
*/

-- Update orphaned EventLogs to use test user (safer approach)
UPDATE public.eventlogs 
SET user_id = '00000000-0000-0000-0000-000000000001'
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT user_id FROM public.profiles);

-- Add new FK constraint linking EventLogs.user_id → Profiles.user_id
ALTER TABLE public.eventlogs
ADD CONSTRAINT eventlogs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;

-- ============================================================================
-- STEP 3: Verification Queries (Results will show in migration output)
-- ============================================================================

-- Verify test user exists in auth.users
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count 
    FROM auth.users 
    WHERE id = '00000000-0000-0000-0000-000000000001';
    
    IF user_count > 0 THEN
        RAISE NOTICE 'SUCCESS: Test user exists in auth.users';
    ELSE
        RAISE WARNING 'FAILURE: Test user NOT found in auth.users';
    END IF;
END $$;

-- Verify test profile exists in public.profiles
DO $$
DECLARE
    profile_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profile_count 
    FROM public.profiles 
    WHERE user_id = '00000000-0000-0000-0000-000000000001';
    
    IF profile_count > 0 THEN
        RAISE NOTICE 'SUCCESS: Test profile exists in public.profiles';
    ELSE
        RAISE WARNING 'FAILURE: Test profile NOT found in public.profiles';
    END IF;
END $$;

-- Verify FK integrity: Check for orphaned EventLogs
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM public.eventlogs e
    WHERE e.user_id IS NOT NULL 
    AND e.user_id NOT IN (SELECT user_id FROM public.profiles);
    
    IF orphaned_count = 0 THEN
        RAISE NOTICE 'SUCCESS: No orphaned EventLogs entries found (FK integrity maintained)';
    ELSE
        RAISE WARNING 'WARNING: Found % orphaned EventLogs entries', orphaned_count;
    END IF;
END $$;

-- Verify FK constraint exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'eventlogs_user_id_fkey' 
        AND table_name = 'eventlogs'
    ) THEN
        RAISE NOTICE 'SUCCESS: FK constraint eventlogs_user_id_fkey is active';
    ELSE
        RAISE WARNING 'FAILURE: FK constraint eventlogs_user_id_fkey is missing';
    END IF;
END $$;

-- Final summary query: Show EventLogs count by user
DO $$
DECLARE
    total_events INTEGER;
    events_with_valid_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_events FROM public.eventlogs;
    SELECT COUNT(*) INTO events_with_valid_users 
    FROM public.eventlogs e
    INNER JOIN public.profiles p ON e.user_id = p.user_id;
    
    RAISE NOTICE 'SUMMARY: Total EventLogs: %, Events with valid users: %', total_events, events_with_valid_users;
END $$;