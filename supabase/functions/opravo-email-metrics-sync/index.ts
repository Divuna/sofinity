import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate custom header
    const functionSecret = Deno.env.get('FUNCTION_SECRET');
    const providedKey = req.headers.get('X-FUNC-KEY');
    
    if (!functionSecret || !providedKey || providedKey !== functionSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // We don't need Opravo API credentials anymore since we read directly from EmailLogs
    console.log('Starting email metrics sync from EmailLogs table...');

    // Get last sync watermark
    const { data: lastSync, error: syncError } = await supabase
      .from('AIRequests')
      .select('response')
      .eq('type', 'opravo_email_sync')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (syncError) {
      console.error('Error fetching last sync:', syncError);
    }

    const lastSyncTime = lastSync?.response ? 
      JSON.parse(lastSync.response).last_updated_at : 
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Default to 24h ago

    console.log('Last sync time:', lastSyncTime);

    // Fetch email metrics directly from EmailLogs table
    console.log(`Fetching email logs updated since: ${lastSyncTime}`);
    const { data: emailLogs, error: emailLogsError } = await supabase
      .from('EmailLogs')
      .select('*')
      .gte('updated_at', lastSyncTime)
      .order('updated_at', { ascending: false });

    if (emailLogsError) {
      console.error('Error fetching email logs:', emailLogsError);
      throw new Error(`Failed to fetch email logs: ${emailLogsError.message}`);
    }

    console.log(`Fetched ${emailLogs?.length || 0} email log entries`);

    if (!emailLogs || emailLogs.length === 0) {
      console.log('No new email metrics to sync');
      return new Response(JSON.stringify({ 
        success: true, 
        synced: 0, 
        message: 'No new email metrics to sync' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get service role user for system operations
    const systemUserId = '00000000-0000-0000-0000-000000000000'; // System user ID

    // Aggregate metrics by message_id for summary
    const metricsMap = new Map();
    
    emailLogs.forEach(log => {
      const key = log.message_id || `log-${log.id}`;
      if (!metricsMap.has(key)) {
        metricsMap.set(key, {
          message_id: key,
          sent_count: 0,
          open_count: 0,
          click_count: 0,
          latest_updated_at: log.updated_at,
          recipients: new Set()
        });
      }
      
      const metric = metricsMap.get(key);
      metric.sent_count++;
      if (log.opened_at) metric.open_count++;
      if (log.clicked_at) metric.click_count++;
      if (log.recipient_email) metric.recipients.add(log.recipient_email);
      
      // Keep track of latest update
      if (new Date(log.updated_at) > new Date(metric.latest_updated_at)) {
        metric.latest_updated_at = log.updated_at;
      }
    });

    const aggregatedMetrics = Array.from(metricsMap.values()).map(metric => ({
      ...metric,
      recipients: Array.from(metric.recipients)
    }));

    console.log(`Aggregated ${aggregatedMetrics.length} unique message metrics`);

    const latestUpdatedAt = Math.max(...emailLogs.map(log => new Date(log.updated_at).getTime()));
    const newWatermark = new Date(latestUpdatedAt).toISOString();

    // Log successful sync
    await supabase
      .from('AIRequests')
      .insert({
        type: 'opravo_email_sync',
        prompt: `Email metrics sync completed at ${new Date().toISOString()}`,
        response: JSON.stringify({
          success: true,
          synced_count: emailLogs.length,
          aggregated_metrics: aggregatedMetrics.length,
          last_updated_at: newWatermark,
          sync_timestamp: new Date().toISOString(),
        }),
        status: 'completed',
        user_id: systemUserId,
      });

    console.log(`Successfully synced ${emailLogs.length} email log entries into ${aggregatedMetrics.length} aggregated metrics`);

    return new Response(JSON.stringify({
      success: true,
      synced: emailLogs.length,
      aggregated_metrics: aggregatedMetrics.length,
      last_updated_at: newWatermark,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Sync error:', error);

    // Log error to AIRequests
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase
        .from('AIRequests')
        .insert({
          type: 'opravo_email_sync',
          prompt: `Email metrics sync failed at ${new Date().toISOString()}`,
          response: JSON.stringify({
            success: false,
            error: (error as any)?.message || 'Unknown error',
            sync_timestamp: new Date().toISOString(),
          }),
          status: 'failed',
          user_id: '00000000-0000-0000-0000-000000000000',
        });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(JSON.stringify({
      success: false,
      error: (error as any)?.message || 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});