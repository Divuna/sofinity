-- Create OpravoJobs table
CREATE TABLE public.OpravoJobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID,
  popis TEXT,
  vytvoreno TIMESTAMP WITH TIME ZONE,
  urgentni BOOLEAN DEFAULT false,
  lokalita TEXT,
  vybrany_opravar UUID,
  zadavatel_id UUID,
  status TEXT DEFAULT 'pending',
  project_id UUID REFERENCES public."Projects"(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL DEFAULT auth.uid()
);

-- Enable Row Level Security
ALTER TABLE public.OpravoJobs ENABLE ROW LEVEL SECURITY;

-- Create policies for OpravoJobs
CREATE POLICY "Users can view their own OpravoJobs" 
ON public.OpravoJobs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own OpravoJobs" 
ON public.OpravoJobs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own OpravoJobs" 
ON public.OpravoJobs 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create OpravoOffers table
CREATE TABLE public.OpravoOffers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id UUID,
  zakazka_id UUID,
  opravar_id UUID,
  cena NUMERIC,
  popis TEXT,
  finalizovana BOOLEAN DEFAULT false,
  vybrana BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL DEFAULT auth.uid()
);

-- Enable Row Level Security
ALTER TABLE public.OpravoOffers ENABLE ROW LEVEL SECURITY;

-- Create policies for OpravoOffers
CREATE POLICY "Users can view their own OpravoOffers" 
ON public.OpravoOffers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own OpravoOffers" 
ON public.OpravoOffers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own OpravoOffers" 
ON public.OpravoOffers 
FOR UPDATE 
USING (auth.uid() = user_id);