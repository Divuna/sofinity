-- 1. Add 'audit_alert' to Notifications type constraint (including all existing types)
ALTER TABLE public."Notifications" DROP CONSTRAINT IF EXISTS "Notifications_type_check";
ALTER TABLE public."Notifications" ADD CONSTRAINT "Notifications_type_check" 
  CHECK (type IN (
    'campaign_generator', 
    'evaluator', 
    'autoresponder', 
    'event_forward', 
    'email_assistant', 
    'audit_alert',
    'info',
    'success',
    'email_workflow_test'
  ));

-- 2. Update the audit trigger function to use 'audit_alert' type
CREATE OR REPLACE FUNCTION public.notify_low_integrity_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_id UUID;
  target_project UUID;
  ratio_text TEXT;
BEGIN
  -- Get first admin user
  SELECT id INTO admin_id
  FROM auth.users
  WHERE email ILIKE '%@%'
  ORDER BY created_at
  LIMIT 1;

  -- Extract project_id from audit details if available
  target_project := NULL;
  IF (NEW.details ? 'project_id') THEN
    target_project := (NEW.details->>'project_id')::UUID;
  END IF;

  ratio_text := TO_CHAR(NEW.valid_ratio, 'FM999.00');

  -- Only create notification if integrity drops below 95%
  IF (NEW.valid_ratio < 95) THEN
    INSERT INTO public."Notifications" (
      user_id,
      project_id,
      title,
      message,
      type
    )
    VALUES (
      admin_id,
      target_project,
      '⚠️ Nízká integrita dat v systému Sofinity',
      'Audit detekoval pokles integrity dat pod 95 % (' || ratio_text || ' %). Doporučeno provést kontrolu logů.',
      'audit_alert'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Create trigger on AuditHistory table
DROP TRIGGER IF EXISTS trigger_notify_low_integrity ON public."AuditHistory";
CREATE TRIGGER trigger_notify_low_integrity
  AFTER INSERT ON public."AuditHistory"
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_low_integrity_audit();