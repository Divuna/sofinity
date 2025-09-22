-- Fix OneMil ↔ Sofinity Integration FK Issues
-- Phase 1: Drop incorrect foreign key constraints

-- Drop the incorrect FK constraint on eventlogs that references profiles.user_id
ALTER TABLE eventlogs DROP CONSTRAINT IF EXISTS eventlogs_user_id_fkey;

-- Phase 2: Data cleanup - Remove duplicate profiles and get the correct profile ID
DO $$
DECLARE
    correct_profile_id uuid;
    auth_user_id uuid;
BEGIN
    -- Get the auth user ID for divispavel2@gmail.com
    SELECT id INTO auth_user_id 
    FROM auth.users 
    WHERE email = 'divispavel2@gmail.com';
    
    IF auth_user_id IS NOT NULL THEN
        -- Find the correct profile (the one that matches auth.users.id)
        SELECT id INTO correct_profile_id
        FROM profiles 
        WHERE user_id = auth_user_id
        LIMIT 1;
        
        IF correct_profile_id IS NOT NULL THEN
            -- Update all dependent tables to use the correct profile.id
            -- Update EventLogs
            UPDATE eventlogs 
            SET user_id = correct_profile_id
            WHERE user_id IN (
                SELECT id FROM profiles 
                WHERE email = 'divispavel2@gmail.com' 
                AND id != correct_profile_id
            );
            
            -- Update AIRequests
            UPDATE "AIRequests" 
            SET user_id = correct_profile_id
            WHERE user_id IN (
                SELECT id FROM profiles 
                WHERE email = 'divispavel2@gmail.com' 
                AND id != correct_profile_id
            );
            
            -- Update Campaigns
            UPDATE "Campaigns" 
            SET user_id = correct_profile_id
            WHERE user_id IN (
                SELECT id FROM profiles 
                WHERE email = 'divispavel2@gmail.com' 
                AND id != correct_profile_id
            );
            
            -- Update Notifications
            UPDATE "Notifications" 
            SET user_id = correct_profile_id
            WHERE user_id IN (
                SELECT id FROM profiles 
                WHERE email = 'divispavel2@gmail.com' 
                AND id != correct_profile_id
            );
            
            -- Update all other tables that might reference the wrong profile
            UPDATE "Contacts" 
            SET user_id = correct_profile_id
            WHERE user_id IN (
                SELECT id FROM profiles 
                WHERE email = 'divispavel2@gmail.com' 
                AND id != correct_profile_id
            );
            
            UPDATE "Emails" 
            SET user_id = correct_profile_id
            WHERE user_id IN (
                SELECT id FROM profiles 
                WHERE email = 'divispavel2@gmail.com' 
                AND id != correct_profile_id
            );
            
            UPDATE "Projects" 
            SET user_id = correct_profile_id
            WHERE user_id IN (
                SELECT id FROM profiles 
                WHERE email = 'divispavel2@gmail.com' 
                AND id != correct_profile_id
            );
            
            -- Now remove duplicate profile entries
            DELETE FROM profiles 
            WHERE email = 'divispavel2@gmail.com' 
            AND id != correct_profile_id;
            
            RAISE NOTICE 'Successfully cleaned up data for divispavel2@gmail.com using profile ID: %', correct_profile_id;
        ELSE
            RAISE NOTICE 'No valid profile found for divispavel2@gmail.com';
        END IF;
    ELSE
        RAISE NOTICE 'Auth user not found for divispavel2@gmail.com';
    END IF;
END $$;

-- Phase 3: Create correct foreign key constraints
-- Note: Most tables should reference profiles.id, not profiles.user_id

-- Add correct FK constraint for eventlogs to reference profiles.id
ALTER TABLE eventlogs 
ADD CONSTRAINT eventlogs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Ensure all other tables have correct FK constraints to profiles.id
-- (These should already exist but let's verify key ones)

-- AIRequests should reference profiles.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'AIRequests_user_id_fkey' 
        AND table_name = 'AIRequests'
    ) THEN
        ALTER TABLE "AIRequests" 
        ADD CONSTRAINT "AIRequests_user_id_fkey" 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Campaigns should reference profiles.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Campaigns_user_id_fkey' 
        AND table_name = 'Campaigns'
    ) THEN
        ALTER TABLE "Campaigns" 
        ADD CONSTRAINT "Campaigns_user_id_fkey" 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Phase 4: Validation
-- Check that all foreign keys are now valid
DO $$
DECLARE
    invalid_count integer;
BEGIN
    -- Check eventlogs
    SELECT COUNT(*) INTO invalid_count
    FROM eventlogs e
    LEFT JOIN profiles p ON e.user_id = p.id
    WHERE p.id IS NULL AND e.user_id IS NOT NULL;
    
    IF invalid_count > 0 THEN
        RAISE WARNING 'Found % invalid foreign keys in eventlogs', invalid_count;
    ELSE
        RAISE NOTICE 'All eventlogs foreign keys are valid';
    END IF;
    
    -- Check AIRequests
    SELECT COUNT(*) INTO invalid_count
    FROM "AIRequests" a
    LEFT JOIN profiles p ON a.user_id = p.id
    WHERE p.id IS NULL AND a.user_id IS NOT NULL;
    
    IF invalid_count > 0 THEN
        RAISE WARNING 'Found % invalid foreign keys in AIRequests', invalid_count;
    ELSE
        RAISE NOTICE 'All AIRequests foreign keys are valid';
    END IF;
    
    -- Check Campaigns
    SELECT COUNT(*) INTO invalid_count
    FROM "Campaigns" c
    LEFT JOIN profiles p ON c.user_id = p.id
    WHERE p.id IS NULL AND c.user_id IS NOT NULL;
    
    IF invalid_count > 0 THEN
        RAISE WARNING 'Found % invalid foreign keys in Campaigns', invalid_count;
    ELSE
        RAISE NOTICE 'All Campaigns foreign keys are valid';
    END IF;
END $$;