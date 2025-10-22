-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Agents table
CREATE TABLE IF NOT EXISTS public."Agents" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  gpt_id TEXT NOT NULL,
  role TEXT NOT NULL,
  persona TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add agent_id column to AIRequests table
ALTER TABLE public."AIRequests" 
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public."Agents"(id);

-- Enable Row Level Security on Agents table
ALTER TABLE public."Agents" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Agents table
CREATE POLICY "Users can view all agents"
ON public."Agents"
FOR SELECT
USING (true);

CREATE POLICY "Service role can manage agents"
ON public."Agents"
FOR ALL
USING (true)
WITH CHECK (true);

-- Insert four predefined agents
INSERT INTO public."Agents" (name, description, gpt_id, role, persona, active) VALUES
(
  'Sofi.Marketer',
  'Expert in campaign creation, targeting strategies, and conversion optimization',
  'gpt-marketer-001',
  'marketing',
  'I am Sofi.Marketer, your marketing automation expert. I specialize in creating high-converting campaigns, optimizing targeting strategies, and maximizing ROI through data-driven insights.',
  true
),
(
  'Sofi.Analyst',
  'Data analysis specialist focusing on campaign performance and predictive insights',
  'gpt-analyst-001',
  'analytics',
  'I am Sofi.Analyst, your data intelligence partner. I transform campaign data into actionable insights, identify trends, and provide predictive analytics to optimize your marketing performance.',
  true
),
(
  'Sofi.Writer',
  'Creative content generator for emails, social posts, and marketing copy',
  'gpt-writer-001',
  'content',
  'I am Sofi.Writer, your creative content specialist. I craft compelling email campaigns, engaging social media posts, and persuasive marketing copy that resonates with your audience.',
  true
),
(
  'Sofi.Support',
  'Customer service automation expert for autoresponses and support workflows',
  'gpt-support-001',
  'support',
  'I am Sofi.Support, your customer service automation expert. I create intelligent autoresponses, handle support inquiries, and ensure your customers receive timely, helpful assistance.',
  true
);

-- Log the agent setup in audit_logs
INSERT INTO public.audit_logs (
  event_name,
  user_id,
  event_data
) VALUES (
  'agents_table_created',
  NULL,
  jsonb_build_object(
    'agents_created', 4,
    'agent_names', ARRAY['Sofi.Marketer', 'Sofi.Analyst', 'Sofi.Writer', 'Sofi.Support'],
    'timestamp', now(),
    'message', 'ChatGPT agent integration successfully configured'
  )
);