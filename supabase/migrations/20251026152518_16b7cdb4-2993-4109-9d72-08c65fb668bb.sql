-- Step 1: Drop outdated trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Create corrected handle_new_user() function (without role column)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert profile without 'role' column (which no longer exists)
  INSERT INTO public.profiles (user_id, email, name, onboarding_complete)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'Nový uživatel'),
    false
  );
  RETURN NEW;
END;
$$;

-- Step 3: Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Helper function for creating system user (returns instructions)
CREATE OR REPLACE FUNCTION public.create_system_user_support()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Check if user already exists
  SELECT id INTO new_user_id FROM auth.users WHERE email = 'support@opravo.cz';
  
  IF new_user_id IS NOT NULL THEN
    RETURN 'User support@opravo.cz already exists with ID: ' || new_user_id::text;
  END IF;

  -- Cannot directly insert into auth.users from migration, return instructions
  RETURN 'Please create user support@opravo.cz manually via Supabase Auth UI with these settings:
  - Email: support@opravo.cz
  - Auto Confirm Email: Yes
  - Metadata: {"system_user": true, "source": "onemil"}
  
  After creation, run: UPDATE public.profiles SET onesignal_player_id = ''your-player-id'' WHERE email = ''support@opravo.cz'';';
  
END;
$$;

-- Step 5: Helper function to ensure profile exists for existing auth.users
CREATE OR REPLACE FUNCTION public.ensure_profile_for_public_user(target_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auth_user_id UUID;
  profile_exists BOOLEAN;
BEGIN
  -- Find auth.users.id for the given email
  SELECT id INTO auth_user_id FROM auth.users WHERE email = target_email;
  
  IF auth_user_id IS NULL THEN
    RETURN 'User ' || target_email || ' does not exist in auth.users. Please create via Supabase Auth UI first.';
  END IF;
  
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = auth_user_id) INTO profile_exists;
  
  IF profile_exists THEN
    RETURN 'Profile for ' || target_email || ' already exists.';
  END IF;
  
  -- Create profile
  INSERT INTO public.profiles (user_id, email, name, onboarding_complete)
  VALUES (auth_user_id, target_email, target_email, true);
  
  RETURN 'Profile created for ' || target_email || ' (user_id: ' || auth_user_id::text || ')';
END;
$$;