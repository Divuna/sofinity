
-- Add project_id to Autoresponses
ALTER TABLE public."Autoresponses"
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public."Projects"(id);

-- Add project_id to Templates
ALTER TABLE public."Templates"
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public."Projects"(id);

-- Add project_id to customer_conversations
ALTER TABLE public.customer_conversations
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public."Projects"(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_autoresponses_project_id ON public."Autoresponses"(project_id);
CREATE INDEX IF NOT EXISTS idx_templates_project_id ON public."Templates"(project_id);
CREATE INDEX IF NOT EXISTS idx_customer_conversations_project_id ON public.customer_conversations(project_id);
