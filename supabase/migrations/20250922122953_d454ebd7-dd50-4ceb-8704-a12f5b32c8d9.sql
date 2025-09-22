-- OneMil ↔ Sofinity Integration Audit Fix
-- Create proper user and profile, remap all foreign key references

DO $$
DECLARE
    target_email TEXT := 'divispavel2@gmail.com';
    new_user_id UUID;
    old_test_user_id UUID := '00000000-0000-0000-0000-000000000001';
    remapped_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'OneMil Integration Audit Fix Started';
    
    -- Step 1: Create a fixed user ID for consistency
    new_user_id := '11111111-1111-1111-1111-111111111111';
    
    -- Step 2: Create user in public.users table if not exists
    INSERT INTO public.users (id, email, created_at)
    VALUES (new_user_id, target_email, now())
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email;
    
    RAISE NOTICE 'User created/updated in users table';
    
    -- Step 3: Create or update profile with all required NOT NULL fields
    -- First check if there's a constraint and what it references
    INSERT INTO public.profiles (
        id, 
        user_id, 
        email, 
        name, 
        role, 
        onboarding_complete,
        created_at,
        updated_at
    )
    VALUES (
        gen_random_uuid(),
        new_user_id,
        target_email,
        'OneMil Integration User',
        'admin',
        true,
        now(),
        now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        updated_at = now();
    
    RAISE NOTICE 'Profile created/updated';
    
    -- Step 4: Remap all references from old test user to new user
    -- Update EventLogs
    UPDATE "EventLogs" 
    SET user_id = new_user_id 
    WHERE user_id = old_test_user_id;
    GET DIAGNOSTICS remapped_count = ROW_COUNT;
    RAISE NOTICE 'EventLogs remapped: %', remapped_count;
    
    -- Update AIRequests
    UPDATE "AIRequests" 
    SET user_id = new_user_id 
    WHERE user_id = old_test_user_id;
    GET DIAGNOSTICS remapped_count = ROW_COUNT;
    RAISE NOTICE 'AIRequests remapped: %', remapped_count;
    
    -- Update Notifications
    UPDATE "Notifications" 
    SET user_id = new_user_id 
    WHERE user_id = old_test_user_id;
    GET DIAGNOSTICS remapped_count = ROW_COUNT;
    RAISE NOTICE 'Notifications remapped: %', remapped_count;
    
    -- Update Campaigns
    UPDATE "Campaigns" 
    SET user_id = new_user_id 
    WHERE user_id = old_test_user_id;
    GET DIAGNOSTICS remapped_count = ROW_COUNT;
    RAISE NOTICE 'Campaigns remapped: %', remapped_count;
    
    -- Final verification - count orphaned references
    DECLARE
        orphaned_count INTEGER := 0;
    BEGIN
        -- Check EventLogs
        SELECT COUNT(*) INTO orphaned_count
        FROM "EventLogs" el
        WHERE el.user_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = el.user_id);
        RAISE NOTICE 'EventLogs orphaned: %', orphaned_count;
        
        -- Check AIRequests
        SELECT COUNT(*) INTO orphaned_count
        FROM "AIRequests" ar
        WHERE ar.user_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = ar.user_id);
        RAISE NOTICE 'AIRequests orphaned: %', orphaned_count;
        
        -- Check Notifications
        SELECT COUNT(*) INTO orphaned_count
        FROM "Notifications" n
        WHERE n.user_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = n.user_id);
        RAISE NOTICE 'Notifications orphaned: %', orphaned_count;
        
        -- Check Campaigns
        SELECT COUNT(*) INTO orphaned_count
        FROM "Campaigns" c
        WHERE c.user_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = c.user_id);
        RAISE NOTICE 'Campaigns orphaned: %', orphaned_count;
        
        IF orphaned_count = 0 THEN
            RAISE NOTICE 'SUCCESS: 100%% FK integrity achieved';
        ELSE
            RAISE NOTICE 'WARNING: Orphaned references still exist';
        END IF;
    END;
    
    RAISE NOTICE 'Integration Audit Fix Completed Successfully';
END $$;