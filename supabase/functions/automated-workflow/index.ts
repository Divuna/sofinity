import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONEMIL_PROJECT_ID = 'defababe-004b-4c63-9ff1-311540b0a3c9';

interface AutomationStep {
  step: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  details?: any;
  error?: string;
  timestamp: string;
}

interface AutomationReport {
  automationId: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'failed';
  steps: AutomationStep[];
  totalCampaigns: number;
  processedCampaigns: number;
  totalEmails: number;
  processedEmails: number;
  totalMediaGenerated: number;
  errors: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const automationId = crypto.randomUUID();
    const report: AutomationReport = {
      automationId,
      startTime: new Date().toISOString(),
      status: 'running',
      steps: [],
      totalCampaigns: 0,
      processedCampaigns: 0,
      totalEmails: 0,
      processedEmails: 0,
      totalMediaGenerated: 0,
      errors: []
    };

    console.log(`🤖 Starting automated OneMil workflow: ${automationId}`);

    // Step 1: Monitor for new campaigns
    const monitorStep: AutomationStep = {
      step: 'monitor_campaigns',
      status: 'running',
      timestamp: new Date().toISOString()
    };
    report.steps.push(monitorStep);

    const { data: campaigns, error: campaignsError } = await supabase
      .from('Campaigns')
      .select('*')
      .eq('project_id', ONEMIL_PROJECT_ID)
      .eq('status', 'draft')
      .order('created_at', { ascending: false });

    if (campaignsError) {
      monitorStep.status = 'failed';
      monitorStep.error = campaignsError.message;
      report.errors.push(`Campaign monitoring failed: ${campaignsError.message}`);
    } else {
      monitorStep.status = 'completed';
      monitorStep.details = { campaignsFound: campaigns?.length || 0 };
      report.totalCampaigns = campaigns?.length || 0;
      console.log(`📊 Found ${campaigns?.length || 0} draft campaigns`);
    }

    // Step 2: Auto-generate AI requests for campaigns without emails
    const aiGenerationStep: AutomationStep = {
      step: 'auto_generate_ai_requests',
      status: 'running',
      timestamp: new Date().toISOString()
    };
    report.steps.push(aiGenerationStep);

    if (campaigns && campaigns.length > 0) {
      for (const campaign of campaigns) {
        try {
          // Check if campaign already has emails
          const { data: existingEmails } = await supabase
            .from('Emails')
            .select('id')
            .eq('project_id', ONEMIL_PROJECT_ID)
            .contains('content', [campaign.name]);

          if (!existingEmails || existingEmails.length === 0) {
            // Create AI request for email generation
            const { error: aiRequestError } = await supabase
              .from('AIRequests')
              .insert({
                type: 'email_assistant',
                prompt: `Generate marketing email for campaign: ${campaign.name}. Targeting: ${campaign.targeting || 'General audience'}. Create engaging content for OneMil project.`,
                status: 'waiting',
                project_id: ONEMIL_PROJECT_ID,
                metadata: {
                  campaign_id: campaign.id,
                  automation_id: automationId,
                  auto_generated: true
                }
              });

            if (aiRequestError) {
              console.error(`❌ Failed to create AI request for campaign ${campaign.id}:`, aiRequestError);
              report.errors.push(`AI request creation failed for campaign ${campaign.name}: ${aiRequestError.message}`);
            } else {
              console.log(`✅ Created AI request for campaign: ${campaign.name}`);
            }
          }
        } catch (error: any) {
          console.error(`❌ Error processing campaign ${campaign.id}:`, error);
          report.errors.push(`Campaign processing error: ${error.message}`);
        }
      }
    }

    aiGenerationStep.status = 'completed';

    // Step 3: Process waiting AI requests
    const aiProcessingStep: AutomationStep = {
      step: 'process_ai_requests',
      status: 'running',
      timestamp: new Date().toISOString()
    };
    report.steps.push(aiProcessingStep);

    const { data: waitingRequests, error: requestsError } = await supabase
      .from('AIRequests')
      .select('*')
      .eq('status', 'waiting')
      .eq('project_id', ONEMIL_PROJECT_ID)
      .limit(10);

    if (requestsError) {
      aiProcessingStep.status = 'failed';
      aiProcessingStep.error = requestsError.message;
      report.errors.push(`AI requests fetch failed: ${requestsError.message}`);
    } else if (waitingRequests && waitingRequests.length > 0) {
      for (const request of waitingRequests) {
        try {
          // Process AI request
          const { data: aiResponse, error: aiError } = await supabase.functions.invoke('ai-assistant', {
            body: {
              type: request.type,
              data: {
                emailType: 'campaign',
                project: 'OneMil',
                purpose: 'Automated email generation',
                prompt: request.prompt
              }
            }
          });

          if (aiError) {
            console.error(`❌ AI processing failed for request ${request.id}:`, aiError);
            report.errors.push(`AI processing failed: ${aiError.message}`);
          } else {
            console.log(`✅ Processed AI request: ${request.id}`);
            report.processedEmails++;
          }
        } catch (error: any) {
          console.error(`❌ Error processing AI request ${request.id}:`, error);
          report.errors.push(`AI request processing error: ${error.message}`);
        }
      }
    }

    aiProcessingStep.status = 'completed';
    aiProcessingStep.details = { requestsProcessed: waitingRequests?.length || 0 };

    // Step 4: Auto-generate multimedia for draft emails
    const multimediaStep: AutomationStep = {
      step: 'auto_generate_multimedia',
      status: 'running',
      timestamp: new Date().toISOString()
    };
    report.steps.push(multimediaStep);

    const { data: draftEmails, error: draftsError } = await supabase
      .from('Emails')
      .select('*')
      .eq('status', 'draft')
      .eq('project', 'OneMil')
      .eq('project_id', ONEMIL_PROJECT_ID);

    if (draftsError) {
      multimediaStep.status = 'failed';
      multimediaStep.error = draftsError.message;
      report.errors.push(`Draft emails fetch failed: ${draftsError.message}`);
    } else if (draftEmails && draftEmails.length > 0) {
      report.totalEmails = draftEmails.length;
      
      for (const email of draftEmails) {
        try {
          // Check if email already has multimedia
          const { data: existingMedia } = await supabase
            .from('EmailMedia')
            .select('id')
            .eq('email_id', email.id);

          if (!existingMedia || existingMedia.length === 0) {
            // Generate multimedia
            const { data: mediaResponse, error: mediaError } = await supabase.functions.invoke('generate-media', {
              body: { email_id: email.id }
            });

            if (mediaError) {
              console.error(`❌ Media generation failed for email ${email.id}:`, mediaError);
              report.errors.push(`Media generation failed for email ${email.subject}: ${mediaError.message}`);
            } else {
              console.log(`✅ Generated multimedia for email: ${email.subject}`);
              report.totalMediaGenerated += mediaResponse?.mediaGenerated || 0;
              report.processedEmails++;
            }
          }
        } catch (error: any) {
          console.error(`❌ Error generating multimedia for email ${email.id}:`, error);
          report.errors.push(`Multimedia generation error: ${error.message}`);
        }
      }
    }

    multimediaStep.status = 'completed';
    multimediaStep.details = { emailsProcessed: report.processedEmails, mediaGenerated: report.totalMediaGenerated };

    // Step 5: Log automation results
    const auditStep: AutomationStep = {
      step: 'audit_logging',
      status: 'running',
      timestamp: new Date().toISOString()
    };
    report.steps.push(auditStep);

    try {
      await supabase
        .from('audit_logs')
        .insert({
          event_name: 'automated_workflow_completed',
          project_id: ONEMIL_PROJECT_ID,
          event_data: {
            automation_id: automationId,
            campaigns_processed: report.processedCampaigns,
            emails_processed: report.processedEmails,
            media_generated: report.totalMediaGenerated,
            errors_count: report.errors.length,
            steps_completed: report.steps.filter(s => s.status === 'completed').length
          }
        });

      auditStep.status = 'completed';
      console.log(`📝 Audit log created for automation: ${automationId}`);
    } catch (error: any) {
      auditStep.status = 'failed';
      auditStep.error = error.message;
      report.errors.push(`Audit logging failed: ${error.message}`);
    }

    // Finalize report
    report.endTime = new Date().toISOString();
    report.status = report.errors.length > 0 ? 'completed' : 'completed';
    report.processedCampaigns = campaigns?.length || 0;

    console.log(`🏁 Automated workflow completed: ${automationId}`);
    console.log(`📊 Summary: ${report.processedCampaigns} campaigns, ${report.processedEmails} emails, ${report.totalMediaGenerated} media files`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Automated workflow completed',
      report
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Error in automated workflow:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});