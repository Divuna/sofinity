-- OneMil ↔ Sofinity Integration Audit Fix
-- Create proper user and profile, remap all foreign key references

DO $$
DECLARE
    target_email TEXT := 'divispavel2@gmail.com';
    new_user_id UUID;
    old_test_user_id UUID := '00000000-0000-0000-0000-000000000001';
    eventlogs_updated INTEGER := 0;
    airequests_updated INTEGER := 0;
    notifications_updated INTEGER := 0;
    campaigns_updated INTEGER := 0;
    total_references INTEGER := 0;
BEGIN
    RAISE NOTICE '=== OneMil ↔ Sofinity Integration Audit Fix ===';
    
    -- Step 1: Create or get user with target email
    RAISE NOTICE 'Step 1: Creating/getting user with email: %', target_email;
    
    -- Check if user already exists
    SELECT id INTO new_user_id 
    FROM public.users 
    WHERE email = target_email;
    
    IF new_user_id IS NULL THEN
        -- Create new user
        INSERT INTO public.users (id, email, created_at)
        VALUES (gen_random_uuid(), target_email, now())
        RETURNING id INTO new_user_id;
        
        RAISE NOTICE 'Created new user with ID: %', new_user_id;
    ELSE
        RAISE NOTICE 'Found existing user with ID: %', new_user_id;
    END IF;
    
    -- Step 2: Create or update profile
    RAISE NOTICE 'Step 2: Creating/updating profile for user: %', new_user_id;
    
    -- Insert or update profile with all required NOT NULL fields
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
    
    RAISE NOTICE 'Profile created/updated for user: %', new_user_id;
    
    -- Step 3: Count current references to old test user
    RAISE NOTICE 'Step 3: Counting references to old test user: %', old_test_user_id;
    
    SELECT COUNT(*) INTO eventlogs_updated FROM "EventLogs" WHERE user_id = old_test_user_id;
    SELECT COUNT(*) INTO airequests_updated FROM "AIRequests" WHERE user_id = old_test_user_id;
    SELECT COUNT(*) INTO notifications_updated FROM "Notifications" WHERE user_id = old_test_user_id;
    SELECT COUNT(*) INTO campaigns_updated FROM "Campaigns" WHERE user_id = old_test_user_id;
    
    total_references := eventlogs_updated + airequests_updated + notifications_updated + campaigns_updated;
    
    RAISE NOTICE 'Found references - EventLogs: %, AIRequests: %, Notifications: %, Campaigns: %', 
        eventlogs_updated, airequests_updated, notifications_updated, campaigns_updated;
    RAISE NOTICE 'Total references to remap: %', total_references;
    
    -- Step 4: Remap all references from old test user to new user
    RAISE NOTICE 'Step 4: Remapping all references to new user: %', new_user_id;
    
    -- Update EventLogs
    UPDATE "EventLogs" 
    SET user_id = new_user_id 
    WHERE user_id = old_test_user_id;
    GET DIAGNOSTICS eventlogs_updated = ROW_COUNT;
    
    -- Update AIRequests
    UPDATE "AIRequests" 
    SET user_id = new_user_id 
    WHERE user_id = old_test_user_id;
    GET DIAGNOSTICS airequests_updated = ROW_COUNT;
    
    -- Update Notifications
    UPDATE "Notifications" 
    SET user_id = new_user_id 
    WHERE user_id = old_test_user_id;
    GET DIAGNOSTICS notifications_updated = ROW_COUNT;
    
    -- Update Campaigns
    UPDATE "Campaigns" 
    SET user_id = new_user_id 
    WHERE user_id = old_test_user_id;
    GET DIAGNOSTICS campaigns_updated = ROW_COUNT;
    
    RAISE NOTICE 'Remapped references - EventLogs: %, AIRequests: %, Notifications: %, Campaigns: %', 
        eventlogs_updated, airequests_updated, notifications_updated, campaigns_updated;
    
    -- Step 5: Verification Report
    RAISE NOTICE '=== VERIFICATION REPORT ===';
    RAISE NOTICE 'Target User Email: %', target_email;
    RAISE NOTICE 'New User ID: %', new_user_id;
    RAISE NOTICE 'Old Test User ID: %', old_test_user_id;
    RAISE NOTICE 'Total References Remapped: %', (eventlogs_updated + airequests_updated + notifications_updated + campaigns_updated);
    
    -- Check for any remaining orphaned references
    DECLARE
        orphaned_eventlogs INTEGER := 0;
        orphaned_airequests INTEGER := 0;
        orphaned_notifications INTEGER := 0;
        orphaned_campaigns INTEGER := 0;
        total_orphaned INTEGER := 0;
    BEGIN
        -- Check EventLogs
        SELECT COUNT(*) INTO orphaned_eventlogs
        FROM "EventLogs" el
        WHERE el.user_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = el.user_id);
        
        -- Check AIRequests
        SELECT COUNT(*) INTO orphaned_airequests
        FROM "AIRequests" ar
        WHERE ar.user_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = ar.user_id);
        
        -- Check Notifications
        SELECT COUNT(*) INTO orphaned_notifications
        FROM "Notifications" n
        WHERE n.user_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = n.user_id);
        
        -- Check Campaigns
        SELECT COUNT(*) INTO orphaned_campaigns
        FROM "Campaigns" c
        WHERE c.user_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = c.user_id);
        
        total_orphaned := orphaned_eventlogs + orphaned_airequests + orphaned_notifications + orphaned_campaigns;
        
        RAISE NOTICE 'Remaining Orphaned References:';
        RAISE NOTICE '- EventLogs: %', orphaned_eventlogs;
        RAISE NOTICE '- AIRequests: %', orphaned_airequests;
        RAISE NOTICE '- Notifications: %', orphaned_notifications;
        RAISE NOTICE '- Campaigns: %', orphaned_campaigns;
        RAISE NOTICE 'Total Orphaned: %', total_orphaned;
        
        IF total_orphaned = 0 THEN
            RAISE NOTICE 'SUCCESS: All foreign key references are now valid (100%% integrity)';
        ELSE
            RAISE NOTICE 'WARNING: % orphaned references still exist', total_orphaned;
        END IF;
    END;
    
    -- Final counts for OneMil test suite verification
    DECLARE
        total_eventlogs INTEGER := 0;
        total_airequests INTEGER := 0;
        total_notifications INTEGER := 0;
        total_campaigns INTEGER := 0;
        valid_eventlogs INTEGER := 0;
        valid_airequests INTEGER := 0;
        valid_notifications INTEGER := 0;
        valid_campaigns INTEGER := 0;
    BEGIN
        SELECT COUNT(*) INTO total_eventlogs FROM "EventLogs";
        SELECT COUNT(*) INTO total_airequests FROM "AIRequests";
        SELECT COUNT(*) INTO total_notifications FROM "Notifications";
        SELECT COUNT(*) INTO total_campaigns FROM "Campaigns";
        
        SELECT COUNT(*) INTO valid_eventlogs
        FROM "EventLogs" el
        WHERE el.user_id IS NULL OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = el.user_id);
        
        SELECT COUNT(*) INTO valid_airequests
        FROM "AIRequests" ar
        WHERE ar.user_id IS NULL OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = ar.user_id);
        
        SELECT COUNT(*) INTO valid_notifications
        FROM "Notifications" n
        WHERE n.user_id IS NULL OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = n.user_id);
        
        SELECT COUNT(*) INTO valid_campaigns
        FROM "Campaigns" c
        WHERE EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = c.user_id);
        
        RAISE NOTICE '=== ONEMIL TEST SUITE VERIFICATION ===';
        RAISE NOTICE 'EventLogs: %/% valid (%%)', valid_eventlogs, total_eventlogs, 
            CASE WHEN total_eventlogs > 0 THEN ROUND((valid_eventlogs::NUMERIC/total_eventlogs::NUMERIC)*100, 2) ELSE 100 END;
        RAISE NOTICE 'AIRequests: %/% valid (%%)', valid_airequests, total_airequests,
            CASE WHEN total_airequests > 0 THEN ROUND((valid_airequests::NUMERIC/total_airequests::NUMERIC)*100, 2) ELSE 100 END;
        RAISE NOTICE 'Notifications: %/% valid (%%)', valid_notifications, total_notifications,
            CASE WHEN total_notifications > 0 THEN ROUND((valid_notifications::NUMERIC/total_notifications::NUMERIC)*100, 2) ELSE 100 END;
        RAISE NOTICE 'Campaigns: %/% valid (%%)', valid_campaigns, total_campaigns,
            CASE WHEN total_campaigns > 0 THEN ROUND((valid_campaigns::NUMERIC/total_campaigns::NUMERIC)*100, 2) ELSE 100 END;
    END;
    
    RAISE NOTICE '=== INTEGRATION AUDIT FIX COMPLETED ===';
END $$;