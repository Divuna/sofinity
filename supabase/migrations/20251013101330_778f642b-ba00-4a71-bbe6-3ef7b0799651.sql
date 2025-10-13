-- Create EventTypes table for event name standardization
CREATE TABLE IF NOT EXISTS public."EventTypes" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system TEXT NOT NULL,
  original_event TEXT NOT NULL,
  standardized_event TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source_system, original_event)
);

-- Enable RLS on EventTypes
ALTER TABLE public."EventTypes" ENABLE ROW LEVEL SECURITY;

-- Service role can manage all EventTypes
CREATE POLICY "Service role can manage EventTypes"
ON public."EventTypes"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Users can view EventTypes
CREATE POLICY "Users can view EventTypes"
ON public."EventTypes"
FOR SELECT
TO authenticated
USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_types_lookup 
ON public."EventTypes" (source_system, original_event);

-- Insert some default mappings for OneMil and Opravo
INSERT INTO public."EventTypes" (source_system, original_event, standardized_event, description)
VALUES 
  ('onemill', 'prize_won', 'reward_distributed', 'User won a prize in contest'),
  ('onemill', 'coin_redeemed', 'points_redeemed', 'User redeemed coins for reward'),
  ('onemill', 'voucher_purchased', 'voucher_acquired', 'User purchased a voucher'),
  ('onemill', 'user_registered', 'user_registered', 'New user registration'),
  ('onemill', 'notification_sent', 'notification_sent', 'Notification sent to user'),
  ('onemill', 'contest_closed', 'contest_completed', 'Contest ended'),
  ('onemill', 'contest_created', 'contest_created', 'New contest created'),
  ('onemill', 'ticket_created', 'entry_created', 'User created contest entry'),
  ('opravo', 'job_created', 'service_request_created', 'New service request created'),
  ('opravo', 'offer_received', 'quote_received', 'Service provider sent quote'),
  ('opravo', 'job_completed', 'service_completed', 'Service request completed')
ON CONFLICT (source_system, original_event) DO NOTHING;