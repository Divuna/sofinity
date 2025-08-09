-- 1) Enable RLS on Opravo jobs to prevent public access
ALTER TABLE public.opravo_jobs ENABLE ROW LEVEL SECURITY;

-- 2) Prevent users from self-escalating roles in profiles
-- Remove ability for clients to insert arbitrary profiles (handled by trigger on user creation)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Block updates to the 'role' column from anon/authenticated users; they can still update other columns via existing policy
REVOKE UPDATE(role) ON TABLE public.profiles FROM anon, authenticated;