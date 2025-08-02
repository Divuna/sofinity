-- Add external_connection field to Projects table
ALTER TABLE public.Projects 
ADD COLUMN external_connection TEXT DEFAULT NULL;