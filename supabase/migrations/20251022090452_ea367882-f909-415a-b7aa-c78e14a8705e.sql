-- ========================================
-- SECURITY FIX: Implement proper role-based access control
-- ========================================

-- 1. Drop dependent policies and views first
DROP POLICY IF EXISTS "Admins can view all opravo_jobs" ON public.opravo_jobs;
DROP VIEW IF EXISTS public.visible_profiles CASCADE;

-- 2. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 3. Create user_roles table with proper structure
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- 4. Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Create SECURITY DEFINER function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 6. Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT 
  user_id,
  CASE 
    WHEN role = 'admin' THEN 'admin'::public.app_role
    WHEN role = 'moderator' THEN 'moderator'::public.app_role
    ELSE 'user'::public.app_role
  END as role
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 7. Drop the role column from profiles
ALTER TABLE public.profiles DROP COLUMN role;

-- 8. Create RLS policy for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all roles"
ON public.user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 9. Recreate opravo_jobs admin policy using has_role
CREATE POLICY "Admins can view all opravo_jobs"
ON public.opravo_jobs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ========================================
-- SECURITY FIX: Add RLS policies to MarketingCampaigns
-- ========================================

ALTER TABLE public."MarketingCampaigns" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view campaigns for their projects"
ON public."MarketingCampaigns"
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public."Projects" p 
  WHERE p.id = "MarketingCampaigns".project_id 
  AND p.user_id = auth.uid()
));

CREATE POLICY "Users can insert campaigns for their projects"
ON public."MarketingCampaigns"
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public."Projects" p 
  WHERE p.id = "MarketingCampaigns".project_id 
  AND p.user_id = auth.uid()
));

CREATE POLICY "Users can update campaigns for their projects"
ON public."MarketingCampaigns"
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public."Projects" p 
  WHERE p.id = "MarketingCampaigns".project_id 
  AND p.user_id = auth.uid()
));

CREATE POLICY "Service role can manage all marketing campaigns"
ON public."MarketingCampaigns"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ========================================
-- SECURITY FIX: Restrict public access to Agents table
-- ========================================

DROP POLICY IF EXISTS "Users can view all agents" ON public."Agents";

CREATE POLICY "Authenticated users can view agents"
ON public."Agents"
FOR SELECT
TO authenticated
USING (active = true);

-- ========================================
-- SECURITY FIX: Restrict public access to CampaignStats
-- ========================================

DROP POLICY IF EXISTS "Users can view stats of their campaigns" ON public."CampaignStats";

CREATE POLICY "Users can view stats for their own campaigns"
ON public."CampaignStats"
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public."Campaigns" c
  WHERE c.id = "CampaignStats".campaign_id
  AND c.user_id = auth.uid()
));

-- ========================================
-- Log security migration
-- ========================================

INSERT INTO public.audit_logs (event_name, event_data, user_id)
VALUES (
  'security_migration_completed',
  jsonb_build_object(
    'migration', 'comprehensive_security_fixes',
    'timestamp', now(),
    'fixes', jsonb_build_array(
      'Created user_roles table with app_role enum',
      'Created has_role() SECURITY DEFINER function',
      'Migrated existing roles from profiles',
      'Removed role column from profiles',
      'Added RLS policies to MarketingCampaigns',
      'Restricted public access to Agents and CampaignStats',
      'Updated admin policies to use has_role function'
    )
  ),
  NULL
);