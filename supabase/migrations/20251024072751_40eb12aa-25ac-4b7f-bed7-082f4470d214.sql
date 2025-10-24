-- Phase 3: Database Constraints
-- Add CHECK constraints to enforce project_id IS NOT NULL on all new records
-- Grandfathers existing NULL records created before 2025-10-24

-- Constraint for AIRequests table
ALTER TABLE public."AIRequests" 
ADD CONSTRAINT "airequests_project_id_required" 
CHECK (
  project_id IS NOT NULL 
  OR created_at < '2025-10-24 00:00:00+00'::timestamptz
);

-- Constraint for Campaigns table
ALTER TABLE public."Campaigns" 
ADD CONSTRAINT "campaigns_project_id_required" 
CHECK (
  project_id IS NOT NULL 
  OR created_at < '2025-10-24 00:00:00+00'::timestamptz
);

-- Constraint for Emails table
ALTER TABLE public."Emails" 
ADD CONSTRAINT "emails_project_id_required" 
CHECK (
  project_id IS NOT NULL 
  OR created_at < '2025-10-24 00:00:00+00'::timestamptz
);

-- Add helpful comments explaining the constraints
COMMENT ON CONSTRAINT "airequests_project_id_required" ON public."AIRequests" 
IS 'Enforces non-NULL project_id for all records created after 2025-10-24. Existing NULL values are grandfathered.';

COMMENT ON CONSTRAINT "campaigns_project_id_required" ON public."Campaigns" 
IS 'Enforces non-NULL project_id for all records created after 2025-10-24. Existing NULL values are grandfathered.';

COMMENT ON CONSTRAINT "emails_project_id_required" ON public."Emails" 
IS 'Enforces non-NULL project_id for all records created after 2025-10-24. Existing NULL values are grandfathered.';