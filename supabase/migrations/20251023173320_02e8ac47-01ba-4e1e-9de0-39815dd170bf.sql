-- Create backups storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for backups bucket
CREATE POLICY "Service role can manage backups"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'backups')
WITH CHECK (bucket_id = 'backups');

CREATE POLICY "Authenticated users can view backups"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'backups');

CREATE POLICY "Authenticated users can upload backups"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'backups');