import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OpravoEmailMetric {
  id: string;
  sent_at: string;
  status: string;
  opens: number;
  clicks: number;
  updated_at: string;
}

interface EmailMetric {
  external_email_id: string;
  sent_at: string;
  status: string;
  opens: number;
  clicks: number;
  updated_at: string;
  user_id: string;
}

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

    // Get Opravo API credentials
    const opravoApiKey = Deno.env.get('OPRAVO_API_KEY');
    const opravoBaseUrl = Deno.env.get('OPRAVO_BASE_URL');
    
    if (!opravoApiKey || !opravoBaseUrl) {
      throw new Error('Missing Opravo API credentials');
    }

    console.log('Starting Opravo email metrics sync...');

    // Get last sync watermark
    const { data: lastSync } = await supabase
      .from('AIRequests')
      .select('response')
      .eq('type', 'opravo_email_sync')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const lastSyncTime = lastSync?.response ? 
      JSON.parse(lastSync.response).last_updated_at : 
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Default to 24h ago

    console.log('Last sync time:', lastSyncTime);

    // Fetch email metrics from Opravo API
    const opravoResponse = await fetch(`${opravoBaseUrl}/api/emails/metrics?updated_since=${lastSyncTime}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${opravoApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!opravoResponse.ok) {
      throw new Error(`Opravo API error: ${opravoResponse.status} ${opravoResponse.statusText}`);
    }

    const opravoMetrics: OpravoEmailMetric[] = await opravoResponse.json();
    console.log(`Fetched ${opravoMetrics.length} email metrics from Opravo`);

    if (opravoMetrics.length === 0) {
      console.log('No new metrics to sync');
      return new Response(JSON.stringify({ 
        success: true, 
        synced: 0, 
        message: 'No new metrics to sync' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get service role user for system operations
    const systemUserId = '00000000-0000-0000-0000-000000000000'; // System user ID

    // Transform and upsert metrics
    const metricsToUpsert: EmailMetric[] = opravoMetrics.map(metric => ({
      external_email_id: metric.id,
      sent_at: metric.sent_at,
      status: metric.status,
      opens: metric.opens || 0,
      clicks: metric.clicks || 0,
      updated_at: metric.updated_at,
      user_id: systemUserId,
    }));

    // Batch upsert email metrics
    const { error: upsertError } = await supabase
      .from('emails_metrics')
      .upsert(metricsToUpsert, {
        onConflict: 'external_email_id',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      throw new Error(`Failed to upsert metrics: ${upsertError.message}`);
    }

    const latestUpdatedAt = Math.max(...opravoMetrics.map(m => new Date(m.updated_at).getTime()));
    const newWatermark = new Date(latestUpdatedAt).toISOString();

    // Log successful sync
    await supabase
      .from('AIRequests')
      .insert({
        type: 'opravo_email_sync',
        prompt: `Email metrics sync completed at ${new Date().toISOString()}`,
        response: JSON.stringify({
          success: true,
          synced_count: opravoMetrics.length,
          last_updated_at: newWatermark,
          sync_timestamp: new Date().toISOString(),
        }),
        status: 'completed',
        user_id: systemUserId,
      });

    console.log(`Successfully synced ${opravoMetrics.length} email metrics`);

    return new Response(JSON.stringify({
      success: true,
      synced: opravoMetrics.length,
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
            error: error.message,
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
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});