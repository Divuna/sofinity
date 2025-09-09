-- 1. Rename table from UserPreferences to user_preferences
ALTER TABLE "UserPreferences" RENAME TO "user_preferences";

-- 2. Drop existing RLS policies (they reference the old table name)
DROP POLICY IF EXISTS "Users can insert their own preferences" ON "user_preferences";
DROP POLICY IF EXISTS "Users can update their own preferences" ON "user_preferences";
DROP POLICY IF EXISTS "Users can view their own preferences" ON "user_preferences";

-- 3. Create new RLS policies for user_preferences table
CREATE POLICY "Users can insert their own preferences" 
ON "user_preferences" 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
ON "user_preferences" 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own preferences" 
ON "user_preferences" 
FOR SELECT 
USING (auth.uid() = user_id);

-- 4. Create trigger function to auto-create user preferences
CREATE OR REPLACE FUNCTION public.create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id, email_mode, dark_mode, onboarding_complete)
  VALUES (NEW.id, 'test', false, false)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Create trigger to auto-create preferences for new users
CREATE TRIGGER on_auth_user_created_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_preferences();

-- 6. Update existing trigger function name if it exists
DROP TRIGGER IF EXISTS update_userpreferences_updated_at ON "user_preferences";
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON "user_preferences"
  FOR EACH ROW EXECUTE FUNCTION public.update_user_preferences_updated_at();