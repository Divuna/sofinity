-- Add project_id filtering support to AI monitoring views
-- This migration recreates views to include project_id column for proper project isolation

-- ============================================================================
-- 1. Drop existing views (in reverse dependency order)
-- ============================================================================
DROP VIEW IF EXISTS public."AIRequests_DashboardView" CASCADE;
DROP VIEW IF EXISTS public."AIRequests_Trend7dView" CASCADE;
DROP VIEW IF EXISTS public."AIRequests_PerformanceView" CASCADE;
DROP VIEW IF EXISTS public."AIRequests_StatsView" CASCADE;

-- ============================================================================
-- 2. Recreate AIRequests_PerformanceView with project_id
-- ============================================================================
CREATE OR REPLACE VIEW public."AIRequests_PerformanceView" AS
SELECT 
  type,
  date_trunc('day'::text, created_at)::date AS day,
  project_id,
  count(*) AS total_requests,
  count(*) FILTER (WHERE status = 'completed'::text) AS completed_count,
  count(*) FILTER (WHERE status = 'error'::text) AS error_count,
  round(100.0 * count(*) FILTER (WHERE status = 'completed'::text)::numeric / NULLIF(count(*), 0)::numeric, 2) AS success_rate_pct,
  round(avg(EXTRACT(epoch FROM updated_at - created_at))) AS avg_completion_time_s,
  min(created_at) AS first_request_at,
  max(updated_at) AS last_request_at,
  string_agg(id::text, ', '::text ORDER BY created_at DESC) AS request_ids_desc
FROM public."AIRequests"
GROUP BY type, date_trunc('day'::text, created_at)::date, project_id
ORDER BY date_trunc('day'::text, created_at)::date DESC, type;

-- ============================================================================
-- 3. Recreate AIRequests_StatsView with project_id
-- ============================================================================
CREATE OR REPLACE VIEW public."AIRequests_StatsView" AS
WITH last_change AS (
  SELECT 
    "AIRequests_AuditLog".airequest_id,
    max("AIRequests_AuditLog".changed_at) FILTER (WHERE "AIRequests_AuditLog".new_status = 'completed'::text) AS completed_at,
    max("AIRequests_AuditLog".changed_at) FILTER (WHERE "AIRequests_AuditLog".new_status = 'error'::text) AS error_at
  FROM public."AIRequests_AuditLog"
  GROUP BY "AIRequests_AuditLog".airequest_id
), base AS (
  SELECT 
    r.id,
    r.type,
    r.status,
    r.created_at,
    r.project_id,
    lc.completed_at,
    lc.error_at
  FROM public."AIRequests" r
  LEFT JOIN last_change lc ON lc.airequest_id = r.id
)
SELECT 
  type,
  project_id,
  count(*) AS total_requests,
  count(*) FILTER (WHERE status = 'completed'::text) AS completed_count,
  count(*) FILTER (WHERE status = 'error'::text) AS error_count,
  round(100.0 * count(*) FILTER (WHERE status = 'completed'::text)::numeric / GREATEST(count(*), 1::bigint)::numeric, 2) AS success_rate_pct,
  min(created_at) AS first_request_at,
  max(created_at) AS last_request_at,
  COALESCE(avg(EXTRACT(epoch FROM completed_at - created_at))::bigint, 0::bigint) AS avg_completion_time_s,
  string_agg(id::text, ', '::text ORDER BY created_at DESC) AS request_ids_desc
FROM base b
GROUP BY type, project_id
ORDER BY max(created_at) DESC;

-- ============================================================================
-- 4. Recreate AIRequests_Trend7dView with project_id
-- ============================================================================
CREATE OR REPLACE VIEW public."AIRequests_Trend7dView" AS
WITH daily AS (
  SELECT 
    date_trunc('day'::text, "AIRequests".created_at)::date AS day,
    "AIRequests".type,
    "AIRequests".project_id,
    count(*) AS total_requests,
    count(*) FILTER (WHERE "AIRequests".status = 'completed'::text) AS completed_count,
    count(*) FILTER (WHERE "AIRequests".status = 'error'::text) AS error_count,
    round(100.0 * count(*) FILTER (WHERE "AIRequests".status = 'completed'::text)::numeric / NULLIF(count(*), 0)::numeric, 2) AS success_rate_pct,
    round(avg(EXTRACT(epoch FROM "AIRequests".updated_at - "AIRequests".created_at))) AS avg_completion_time_s
  FROM public."AIRequests"
  GROUP BY "AIRequests".type, date_trunc('day'::text, "AIRequests".created_at)::date, "AIRequests".project_id
)
SELECT 
  d1.day,
  d1.type,
  d1.project_id,
  round(avg(d2.success_rate_pct), 2) AS avg_success_7d_pct,
  round(avg(d2.avg_completion_time_s), 2) AS avg_time_7d_s,
  sum(d2.total_requests) AS total_requests_7d
FROM daily d1
JOIN daily d2 ON d2.type = d1.type 
  AND d2.project_id = d1.project_id
  AND d2.day >= (d1.day - '6 days'::interval) 
  AND d2.day <= d1.day
GROUP BY d1.day, d1.type, d1.project_id
ORDER BY d1.day DESC, d1.type;

-- ============================================================================
-- 5. Recreate AIRequests_DashboardView with project_id support
-- ============================================================================
CREATE OR REPLACE VIEW public."AIRequests_DashboardView" AS
SELECT 
  s.type,
  s.project_id,
  s.total_requests,
  s.completed_count,
  s.error_count,
  s.success_rate_pct,
  s.avg_completion_time_s,
  sv.airequest_id AS last_request_id,
  sv.current_status AS last_status,
  sv.changed_at AS last_change_at
FROM public."AIRequests_StatsView" s
LEFT JOIN LATERAL (
  SELECT 
    "AIRequests_StatusView".airequest_id,
    "AIRequests_StatusView".current_status,
    "AIRequests_StatusView".changed_at
  FROM public."AIRequests_StatusView"
  WHERE "AIRequests_StatusView".type = s.type
  ORDER BY "AIRequests_StatusView".changed_at DESC NULLS LAST
  LIMIT 1
) sv ON true
ORDER BY s.success_rate_pct DESC;

-- ============================================================================
-- 6. Grant SELECT permissions to authenticated users
-- ============================================================================
GRANT SELECT ON public."AIRequests_DashboardView" TO authenticated;
GRANT SELECT ON public."AIRequests_StatsView" TO authenticated;
GRANT SELECT ON public."AIRequests_PerformanceView" TO authenticated;
GRANT SELECT ON public."AIRequests_Trend7dView" TO authenticated;