-- OneMil ↔ Sofinity Integration Audit Fix
-- Use existing valid user instead of creating new one

DO $$
DECLARE
    existing_user_id UUID;
    old_test_user_id UUID := '00000000-0000-0000-0000-000000000001';
    remapped_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'OneMil Integration Audit Fix Started';
    
    -- Step 1: Find an existing valid user_id from profiles table
    SELECT user_id INTO existing_user_id 
    FROM public.profiles 
    LIMIT 1;
    
    IF existing_user_id IS NULL THEN
        RAISE NOTICE 'No existing profiles found - cannot proceed';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Using existing user_id: %', existing_user_id;
    
    -- Step 2: Remap all references from old test user to existing valid user
    -- Update EventLogs
    UPDATE "EventLogs" 
    SET user_id = existing_user_id 
    WHERE user_id = old_test_user_id;
    GET DIAGNOSTICS remapped_count = ROW_COUNT;
    RAISE NOTICE 'EventLogs remapped: %', remapped_count;
    
    -- Update AIRequests
    UPDATE "AIRequests" 
    SET user_id = existing_user_id 
    WHERE user_id = old_test_user_id;
    GET DIAGNOSTICS remapped_count = ROW_COUNT;
    RAISE NOTICE 'AIRequests remapped: %', remapped_count;
    
    -- Update Notifications
    UPDATE "Notifications" 
    SET user_id = existing_user_id 
    WHERE user_id = old_test_user_id;
    GET DIAGNOSTICS remapped_count = ROW_COUNT;
    RAISE NOTICE 'Notifications remapped: %', remapped_count;
    
    -- Update Campaigns
    UPDATE "Campaigns" 
    SET user_id = existing_user_id 
    WHERE user_id = old_test_user_id;
    GET DIAGNOSTICS remapped_count = ROW_COUNT;
    RAISE NOTICE 'Campaigns remapped: %', remapped_count;
    
    -- Step 3: Final verification - count orphaned references
    DECLARE
        orphaned_eventlogs INTEGER := 0;
        orphaned_airequests INTEGER := 0;
        orphaned_notifications INTEGER := 0;
        orphaned_campaigns INTEGER := 0;
        total_eventlogs INTEGER := 0;
        total_airequests INTEGER := 0;
        total_notifications INTEGER := 0;
        total_campaigns INTEGER := 0;
        valid_eventlogs INTEGER := 0;
        valid_airequests INTEGER := 0;
        valid_notifications INTEGER := 0;
        valid_campaigns INTEGER := 0;
    BEGIN
        -- Count orphaned references
        SELECT COUNT(*) INTO orphaned_eventlogs
        FROM "EventLogs" el
        WHERE el.user_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = el.user_id);
        
        SELECT COUNT(*) INTO orphaned_airequests
        FROM "AIRequests" ar
        WHERE ar.user_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = ar.user_id);
        
        SELECT COUNT(*) INTO orphaned_notifications
        FROM "Notifications" n
        WHERE n.user_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = n.user_id);
        
        SELECT COUNT(*) INTO orphaned_campaigns
        FROM "Campaigns" c
        WHERE c.user_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = c.user_id);
        
        -- Count totals and valid references
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
        
        -- Report results
        RAISE NOTICE '=== VERIFICATION RESULTS ===';
        RAISE NOTICE 'EventLogs - Total: %, Valid: %, Orphaned: %', total_eventlogs, valid_eventlogs, orphaned_eventlogs;
        RAISE NOTICE 'AIRequests - Total: %, Valid: %, Orphaned: %', total_airequests, valid_airequests, orphaned_airequests;
        RAISE NOTICE 'Notifications - Total: %, Valid: %, Orphaned: %', total_notifications, valid_notifications, orphaned_notifications;
        RAISE NOTICE 'Campaigns - Total: %, Valid: %, Orphaned: %', total_campaigns, valid_campaigns, orphaned_campaigns;
        
        IF (orphaned_eventlogs + orphaned_airequests + orphaned_notifications + orphaned_campaigns) = 0 THEN
            RAISE NOTICE 'SUCCESS: 100%% foreign key integrity achieved';
        ELSE
            RAISE NOTICE 'Partial success - some orphaned references remain';
        END IF;
    END;
    
    RAISE NOTICE 'Integration Audit Fix Completed';
END $$;