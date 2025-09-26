import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONEMIL_PROJECT_ID = 'defababe-004b-4c63-9ff1-311540b0a3c9';

interface MonitoringReport {
  timestamp: string;
  newCampaigns: number;
  newCustomers: number;
  triggeredWorkflows: number;
  pendingAIRequests: number;
  draftEmails: number;
  emailsWithoutMedia: number;
  actions: string[];
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

    const report: MonitoringReport = {
      timestamp: new Date().toISOString(),
      newCampaigns: 0,
      newCustomers: 0,
      triggeredWorkflows: 0,
      pendingAIRequests: 0,
      draftEmails: 0,
      emailsWithoutMedia: 0,
      actions: [],
      errors: []
    };

    console.log('🔍 Starting automated monitoring...');

    // Monitor new campaigns (created in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: newCampaigns, error: campaignsError } = await supabase
      .from('Campaigns')
      .select('*')
      .eq('project_id', ONEMIL_PROJECT_ID)
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });

    if (campaignsError) {
      report.errors.push(`Campaign monitoring failed: ${campaignsError.message}`);
    } else {
      report.newCampaigns = newCampaigns?.length || 0;
      console.log(`📈 Found ${report.newCampaigns} new campaigns`);
    }

    // Monitor new contacts/customers (created in last hour)
    const { data: newContacts, error: contactsError } = await supabase
      .from('Contacts')
      .select('*')
      .eq('project_id', ONEMIL_PROJECT_ID)
      .gte('created_at', oneHourAgo);

    if (contactsError) {
      report.errors.push(`Contacts monitoring failed: ${contactsError.message}`);
    } else {
      report.newCustomers = newContacts?.length || 0;
      console.log(`👥 Found ${report.newCustomers} new customers`);
    }

    // Check pending AI requests
    const { data: pendingRequests, error: requestsError } = await supabase
      .from('AIRequests')
      .select('*')
      .eq('status', 'waiting')
      .eq('project_id', ONEMIL_PROJECT_ID);

    if (requestsError) {
      report.errors.push(`AI requests monitoring failed: ${requestsError.message}`);
    } else {
      report.pendingAIRequests = pendingRequests?.length || 0;
      console.log(`🤖 Found ${report.pendingAIRequests} pending AI requests`);
    }

    // Check draft emails without multimedia
    const { data: draftEmails, error: draftsError } = await supabase
      .from('Emails')
      .select(`
        *,
        EmailMedia (id)
      `)
      .eq('status', 'draft')
      .eq('project', 'OneMil')
      .eq('project_id', ONEMIL_PROJECT_ID);

    if (draftsError) {
      report.errors.push(`Draft emails monitoring failed: ${draftsError.message}`);
    } else {
      report.draftEmails = draftEmails?.length || 0;
      report.emailsWithoutMedia = draftEmails?.filter(email => !email.EmailMedia || email.EmailMedia.length === 0).length || 0;
      console.log(`📧 Found ${report.draftEmails} draft emails, ${report.emailsWithoutMedia} without multimedia`);
    }

    // Trigger automation if new campaigns or customers found, or if there are pending tasks
    const shouldTriggerAutomation = report.newCampaigns > 0 || 
                                   report.newCustomers > 0 || 
                                   report.pendingAIRequests > 0 || 
                                   report.emailsWithoutMedia > 0;

    if (shouldTriggerAutomation) {
      try {
        console.log('🚀 Triggering automated workflow...');
        
        const { data: workflowResponse, error: workflowError } = await supabase.functions.invoke('automated-workflow', {
          body: {
            trigger: 'monitoring',
            context: {
              newCampaigns: report.newCampaigns,
              newCustomers: report.newCustomers,
              pendingRequests: report.pendingAIRequests,
              emailsWithoutMedia: report.emailsWithoutMedia
            }
          }
        });

        if (workflowError) {
          report.errors.push(`Workflow trigger failed: ${workflowError.message}`);
          console.error('❌ Failed to trigger workflow:', workflowError);
        } else {
          report.triggeredWorkflows = 1;
          report.actions.push('Triggered automated workflow');
          console.log('✅ Automated workflow triggered successfully');
        }
      } catch (error: any) {
        report.errors.push(`Workflow trigger error: ${error.message}`);
        console.error('❌ Error triggering workflow:', error);
      }
    } else {
      report.actions.push('No automation needed - no new data or pending tasks');
      console.log('ℹ️ No automation needed at this time');
    }

    // Auto-create AI requests for new campaigns without emails
    if (newCampaigns && newCampaigns.length > 0) {
      for (const campaign of newCampaigns) {
        try {
          // Check if campaign already has AI requests
          const { data: existingRequests } = await supabase
            .from('AIRequests')
            .select('id')
            .eq('project_id', ONEMIL_PROJECT_ID)
            .contains('metadata', { campaign_id: campaign.id });

          if (!existingRequests || existingRequests.length === 0) {
            const { error: aiRequestError } = await supabase
              .from('AIRequests')
              .insert({
                type: 'email_assistant',
                prompt: `Auto-generate marketing email for new campaign: "${campaign.name}". Project: OneMil. Targeting: ${campaign.targeting || 'General audience'}. Create professional and engaging email content.`,
                status: 'waiting',
                project_id: ONEMIL_PROJECT_ID,
                metadata: {
                  campaign_id: campaign.id,
                  auto_generated: true,
                  trigger: 'monitoring'
                }
              });

            if (aiRequestError) {
              report.errors.push(`Failed to create AI request for campaign: ${aiRequestError.message}`);
            } else {
              report.actions.push(`Created AI request for campaign: ${campaign.name}`);
              console.log(`✅ Created AI request for new campaign: ${campaign.name}`);
            }
          }
        } catch (error: any) {
          report.errors.push(`Error processing new campaign: ${error.message}`);
        }
      }
    }

    // Auto-create welcome emails for new customers
    if (newContacts && newContacts.length > 0) {
      for (const contact of newContacts) {
        try {
          const { error: welcomeRequestError } = await supabase
            .from('AIRequests')
            .insert({
              type: 'email_assistant',
              prompt: `Generate welcome email for new customer: ${contact.name || contact.email}. Project: OneMil. Create warm and welcoming onboarding email.`,
              status: 'waiting',
              project_id: ONEMIL_PROJECT_ID,
              metadata: {
                contact_id: contact.id,
                email_type: 'welcome',
                auto_generated: true,
                trigger: 'monitoring'
              }
            });

          if (welcomeRequestError) {
            report.errors.push(`Failed to create welcome email request: ${welcomeRequestError.message}`);
          } else {
            report.actions.push(`Created welcome email request for: ${contact.name || contact.email}`);
            console.log(`✅ Created welcome email request for new customer: ${contact.name || contact.email}`);
          }
        } catch (error: any) {
          report.errors.push(`Error processing new customer: ${error.message}`);
        }
      }
    }

    // Log monitoring activity
    try {
      await supabase
        .from('audit_logs')
        .insert({
          event_name: 'automated_monitoring_completed',
          project_id: ONEMIL_PROJECT_ID,
          event_data: {
            monitoring_report: report,
            automation_triggered: shouldTriggerAutomation
          }
        });

      console.log('📝 Monitoring audit log created');
    } catch (error: any) {
      report.errors.push(`Audit logging failed: ${error.message}`);
    }

    console.log('🔍 Monitoring completed');
    console.log(`📊 Summary: ${report.newCampaigns} new campaigns, ${report.newCustomers} new customers, ${report.triggeredWorkflows} workflows triggered`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Automated monitoring completed',
      report
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Error in automated monitoring:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});