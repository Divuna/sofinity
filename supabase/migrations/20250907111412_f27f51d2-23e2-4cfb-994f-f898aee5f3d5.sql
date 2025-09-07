-- Add missing columns to Feedback table for email feedback functionality
ALTER TABLE public."Feedback" 
ADD COLUMN email_id uuid,
ADD COLUMN feedback_type text,
ADD COLUMN source text DEFAULT 'email',
ADD COLUMN submitted_at timestamp with time zone DEFAULT now(),
ADD COLUMN ip_address text;

-- Create index for performance on email feedback queries
CREATE INDEX idx_feedback_email_id ON public."Feedback"(email_id);
CREATE INDEX idx_feedback_ip_email ON public."Feedback"(ip_address, email_id);

-- Update RLS policies to allow public access for email feedback
CREATE POLICY "Allow anonymous feedback submission for emails"
ON public."Feedback"
FOR INSERT
WITH CHECK (source = 'email' AND email_id IS NOT NULL);