-- Clean up Emails table RLS policies
-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert their own Emails" ON public."Emails";
DROP POLICY IF EXISTS "Users can insert their own emails" ON public."Emails";
DROP POLICY IF EXISTS "Users can manage their own emails" ON public."Emails";
DROP POLICY IF EXISTS "Users can update their own emails" ON public."Emails";
DROP POLICY IF EXISTS "Users can view their own Emails" ON public."Emails";
DROP POLICY IF EXISTS "Users can view their own emails" ON public."Emails";
DROP POLICY IF EXISTS "Service role can manage all emails" ON public."Emails";

-- Create clean, non-conflicting RLS policies for Emails table
-- Users can view their own emails
CREATE POLICY "emails_select_own" 
ON public."Emails" 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own emails
CREATE POLICY "emails_insert_own" 
ON public."Emails" 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own emails
CREATE POLICY "emails_update_own" 
ON public."Emails" 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own emails
CREATE POLICY "emails_delete_own" 
ON public."Emails" 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Service role has full CRUD access for backend operations
CREATE POLICY "emails_service_role_all" 
ON public."Emails" 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);