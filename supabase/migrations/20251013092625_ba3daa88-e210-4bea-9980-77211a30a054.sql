-- Create Reactions table for AI evaluations
CREATE TABLE IF NOT EXISTS public."Reactions" (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public."EventLogs"(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  ai_confidence NUMERIC(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public."Reactions" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Reactions
CREATE POLICY "Users can view their own reactions"
  ON public."Reactions"
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reactions"
  ON public."Reactions"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage reactions"
  ON public."Reactions"
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_reactions_event_id ON public."Reactions"(event_id);
CREATE INDEX idx_reactions_user_id ON public."Reactions"(user_id);
CREATE INDEX idx_reactions_created_at ON public."Reactions"(created_at DESC);