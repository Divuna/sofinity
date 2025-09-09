-- Add status field to existing Emails table
ALTER TABLE public."Emails" 
ADD COLUMN status text DEFAULT 'draft';

-- Create trigger for automatic updated_at timestamp updates (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_emails_updated_at'
    ) THEN
        CREATE TRIGGER update_emails_updated_at
        BEFORE UPDATE ON public."Emails"
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END$$;

-- Test inserts for verification
-- Test 1: Successful insert with authenticated user
INSERT INTO public."Emails" (user_id, type, project, recipient, content, status)
SELECT 
    auth.uid(),
    'newsletter',
    'Test Project',
    'test@example.com',
    'Test email content',
    'draft'
WHERE auth.uid() IS NOT NULL;

-- Test 2: This should fail - attempting insert without proper user_id
-- INSERT INTO public."Emails" (user_id, type, project, recipient, content, status)
-- VALUES (gen_random_uuid(), 'newsletter', 'Test Project', 'test@example.com', 'Test content', 'draft');

-- Verification SELECT
SELECT id, user_id, type, project, recipient, content, status, created_at, updated_at
FROM public."Emails"
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;