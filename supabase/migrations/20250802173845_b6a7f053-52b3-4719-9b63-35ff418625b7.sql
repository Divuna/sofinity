-- Add external_connection field to Projects table (case-sensitive)
ALTER TABLE public."Projects" 
ADD COLUMN external_connection TEXT DEFAULT NULL;