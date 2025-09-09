-- Fix constraint names after table rename from UserPreferences to user_preferences
-- This addresses the "relation userpreferences does not exist" error

-- 1. Rename the unique constraint on user_id
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS "UserPreferences_user_id_key";
ALTER TABLE user_preferences ADD CONSTRAINT "user_preferences_user_id_key" UNIQUE (user_id);

-- 2. Rename the primary key constraint if it exists with old name
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'UserPreferences_pkey' 
               AND table_name = 'user_preferences') THEN
        ALTER TABLE user_preferences DROP CONSTRAINT "UserPreferences_pkey";
        ALTER TABLE user_preferences ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY (id);
    END IF;
END $$;

-- 3. Check and fix any other constraints that might reference the old table name
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN 
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints 
        WHERE table_name = 'user_preferences' 
        AND constraint_name LIKE 'UserPreferences%'
    LOOP
        -- Log what we're fixing (this will appear in logs)
        RAISE NOTICE 'Found old constraint: %', constraint_record.constraint_name;
        
        -- Drop old constraint and recreate with proper name
        IF constraint_record.constraint_type = 'UNIQUE' AND constraint_record.constraint_name != 'UserPreferences_user_id_key' THEN
            EXECUTE format('ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS %I', constraint_record.constraint_name);
        END IF;
    END LOOP;
END $$;

-- 4. Ensure the trigger function exists and works correctly
CREATE OR REPLACE FUNCTION public.create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- Use INSERT ... ON CONFLICT to avoid duplicate key errors
  INSERT INTO public.user_preferences (user_id, email_mode, dark_mode, onboarding_complete)
  VALUES (NEW.id, 'test', false, false)
  ON CONFLICT (user_id) DO UPDATE SET
    updated_at = now()
  WHERE user_preferences.user_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Recreate the trigger to ensure it's working
DROP TRIGGER IF EXISTS on_auth_user_created_preferences ON auth.users;
CREATE TRIGGER on_auth_user_created_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_preferences();