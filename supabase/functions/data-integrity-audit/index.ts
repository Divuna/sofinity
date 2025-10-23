import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuditResult {
  table: string;
  total: number;
  missing: number;
  backfilled: number;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const results: AuditResult[] = [];

    // 1. Backfill AIRequests project_id from Campaigns
    console.log('Backfilling AIRequests project_id from Campaigns...');
    const aiRequestsResult: AuditResult = {
      table: 'AIRequests',
      total: 0,
      missing: 0,
      backfilled: 0,
      errors: []
    };

    try {
      const { count: totalAI } = await supabase
        .from('AIRequests')
        .select('*', { count: 'exact', head: true });
      aiRequestsResult.total = totalAI || 0;

      const { count: missingAI } = await supabase
        .from('AIRequests')
        .select('*', { count: 'exact', head: true })
        .is('project_id', null);
      aiRequestsResult.missing = missingAI || 0;

      // Backfill from Campaigns
      const { data: aiRequests } = await supabase
        .from('AIRequests')
        .select('id, ai_request_id')
        .is('project_id', null);

      if (aiRequests) {
        for (const air of aiRequests) {
          const { data: campaign } = await supabase
            .from('Campaigns')
            .select('project_id')
            .eq('ai_request_id', air.id)
            .single();

          if (campaign?.project_id) {
            await supabase
              .from('AIRequests')
              .update({ project_id: campaign.project_id })
              .eq('id', air.id);
            aiRequestsResult.backfilled++;
          }
        }
      }
    } catch (error: any) {
      aiRequestsResult.errors.push(error.message);
    }
    results.push(aiRequestsResult);

    // 2. Backfill Campaigns project_id from EventLogs
    console.log('Backfilling Campaigns project_id from EventLogs...');
    const campaignsResult: AuditResult = {
      table: 'Campaigns',
      total: 0,
      missing: 0,
      backfilled: 0,
      errors: []
    };

    try {
      const { count: totalCampaigns } = await supabase
        .from('Campaigns')
        .select('*', { count: 'exact', head: true });
      campaignsResult.total = totalCampaigns || 0;

      const { count: missingCampaigns } = await supabase
        .from('Campaigns')
        .select('*', { count: 'exact', head: true })
        .is('project_id', null);
      campaignsResult.missing = missingCampaigns || 0;

      const { data: campaigns } = await supabase
        .from('Campaigns')
        .select('id, event_id, user_id')
        .is('project_id', null);

      if (campaigns) {
        for (const camp of campaigns) {
          if (camp.event_id) {
            const { data: event } = await supabase
              .from('EventLogs')
              .select('project_id')
              .eq('id', camp.event_id)
              .single();

            if (event?.project_id) {
              await supabase
                .from('Campaigns')
                .update({ project_id: event.project_id })
                .eq('id', camp.id);
              campaignsResult.backfilled++;
            }
          }
        }
      }
    } catch (error: any) {
      campaignsResult.errors.push(error.message);
    }
    results.push(campaignsResult);

    // 3. Backfill Emails project_id from user's first project
    console.log('Backfilling Emails project_id from Projects...');
    const emailsResult: AuditResult = {
      table: 'Emails',
      total: 0,
      missing: 0,
      backfilled: 0,
      errors: []
    };

    try {
      const { count: totalEmails } = await supabase
        .from('Emails')
        .select('*', { count: 'exact', head: true });
      emailsResult.total = totalEmails || 0;

      const { count: missingEmails } = await supabase
        .from('Emails')
        .select('*', { count: 'exact', head: true })
        .is('project_id', null);
      emailsResult.missing = missingEmails || 0;

      const { data: emails } = await supabase
        .from('Emails')
        .select('id, user_id')
        .is('project_id', null);

      if (emails) {
        for (const email of emails) {
          const { data: project } = await supabase
            .from('Projects')
            .select('id')
            .eq('user_id', email.user_id)
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

          if (project?.id) {
            await supabase
              .from('Emails')
              .update({ project_id: project.id })
              .eq('id', email.id);
            emailsResult.backfilled++;
          }
        }
      }
    } catch (error: any) {
      emailsResult.errors.push(error.message);
    }
    results.push(emailsResult);

    // 4. Backfill Notifications project_id
    console.log('Backfilling Notifications project_id...');
    const notificationsResult: AuditResult = {
      table: 'Notifications',
      total: 0,
      missing: 0,
      backfilled: 0,
      errors: []
    };

    try {
      const { count: totalNotifs } = await supabase
        .from('Notifications')
        .select('*', { count: 'exact', head: true });
      notificationsResult.total = totalNotifs || 0;

      const { count: missingNotifs } = await supabase
        .from('Notifications')
        .select('*', { count: 'exact', head: true })
        .is('project_id', null);
      notificationsResult.missing = missingNotifs || 0;

      const { data: notifications } = await supabase
        .from('Notifications')
        .select('id, user_id')
        .is('project_id', null);

      if (notifications) {
        for (const notif of notifications) {
          const { data: project } = await supabase
            .from('Projects')
            .select('id')
            .eq('user_id', notif.user_id)
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

          if (project?.id) {
            await supabase
              .from('Notifications')
              .update({ project_id: project.id })
              .eq('id', notif.id);
            notificationsResult.backfilled++;
          }
        }
      }
    } catch (error: any) {
      notificationsResult.errors.push(error.message);
    }
    results.push(notificationsResult);

    // 5. Backfill audit_logs project_id
    console.log('Backfilling audit_logs project_id...');
    const auditLogsResult: AuditResult = {
      table: 'audit_logs',
      total: 0,
      missing: 0,
      backfilled: 0,
      errors: []
    };

    try {
      const { count: totalAudit } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true });
      auditLogsResult.total = totalAudit || 0;

      const { count: missingAudit } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .is('project_id', null);
      auditLogsResult.missing = missingAudit || 0;

      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('id, user_id')
        .is('project_id', null);

      if (auditLogs) {
        for (const log of auditLogs) {
          if (log.user_id) {
            const { data: project } = await supabase
              .from('Projects')
              .select('id')
              .eq('user_id', log.user_id)
              .order('created_at', { ascending: true })
              .limit(1)
              .single();

            if (project?.id) {
              await supabase
                .from('audit_logs')
                .update({ project_id: project.id })
                .eq('id', log.id);
              auditLogsResult.backfilled++;
            }
          }
        }
      }
    } catch (error: any) {
      auditLogsResult.errors.push(error.message);
    }
    results.push(auditLogsResult);

    // Calculate summary
    const totalRecords = results.reduce((sum, r) => sum + r.total, 0);
    const totalMissing = results.reduce((sum, r) => sum + r.missing, 0);
    const totalBackfilled = results.reduce((sum, r) => sum + r.backfilled, 0);
    const validRatio = totalRecords > 0 ? ((totalRecords - totalMissing + totalBackfilled) / totalRecords) * 100 : 100;

    const summaryText = `Audit completed: ${totalBackfilled} records backfilled across ${results.length} tables. Valid ratio: ${validRatio.toFixed(2)}%`;

    // Save to AuditHistory
    if (userId) {
      await supabase.from('AuditHistory').insert({
        run_at: new Date().toISOString(),
        summary_text: summaryText,
        valid_ratio: validRatio,
        total_tables: results.length,
        created_by: userId,
        details: { results }
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: summaryText,
        valid_ratio: validRatio,
        total_tables: results.length,
        results,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in data-integrity-audit:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
