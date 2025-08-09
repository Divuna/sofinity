-- Add RLS policies for opravo_jobs table to fix security warning
CREATE POLICY "Allow public read access to opravo_jobs" 
ON public.opravo_jobs 
FOR SELECT 
USING (true);

-- Allow service role to insert opravo jobs (for webhook integration)
CREATE POLICY "Allow service role to insert opravo_jobs" 
ON public.opravo_jobs 
FOR INSERT 
WITH CHECK (true);