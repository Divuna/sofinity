-- Add project_id columns to existing tables
ALTER TABLE "Campaigns" ADD COLUMN project_id UUID REFERENCES "Projects"(id);
ALTER TABLE "Emails" ADD COLUMN project_id UUID REFERENCES "Projects"(id);
ALTER TABLE "AIRequests" ADD COLUMN project_id UUID REFERENCES "Projects"(id);

-- Create indexes for better performance
CREATE INDEX idx_campaigns_project_id ON "Campaigns"(project_id);
CREATE INDEX idx_emails_project_id ON "Emails"(project_id);
CREATE INDEX idx_ai_requests_project_id ON "AIRequests"(project_id);

-- Insert initial project data
INSERT INTO "Projects" (user_id, name, description, is_active, created_at) VALUES
(auth.uid(), 'Opravo', 'Platforma pro správu oprav a servisu', true, now()),
(auth.uid(), 'BikeShare24', 'Systém pro sdílení kol a mikrovolnost', true, now()),
(auth.uid(), 'CoDneska', 'Aplikace pro denní plánování a produktivitu', true, now());