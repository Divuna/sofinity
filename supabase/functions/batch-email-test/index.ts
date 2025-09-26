import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BatchTestResult {
  emailId: string;
  recipient: string;
  project: string;
  originalStatus: string;
  newStatus: string;
  success: boolean;
  error?: string;
}

interface BatchTestResponse {
  totalEmails: number;
  processedEmails: number;
  successCount: number;
  errorCount: number;
  results: BatchTestResult[];
  startTime: string;
  endTime: string;
  duration: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = new Date();
    console.log('🚀 Starting batch email test at:', startTime.toISOString());

    // Initialize Supabase client with service role key for full access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Fetch all draft emails with user_id set
    console.log('📋 Fetching draft emails...');
    const { data: draftEmails, error: fetchError } = await supabase
      .from('Emails')
      .select(`
        id,
        user_id,
        recipient,
        project,
        status,
        subject,
        content,
        type
      `)
      .eq('status', 'draft')
      .not('user_id', 'is', null);

    if (fetchError) {
      console.error('❌ Error fetching draft emails:', fetchError);
      throw new Error(`Failed to fetch draft emails: ${fetchError.message}`);
    }

    console.log(`📊 Found ${draftEmails?.length || 0} draft emails to process`);

    const results: BatchTestResult[] = [];

    // Step 2: Process each email
    for (const email of draftEmails || []) {
      console.log(`🔄 Processing email ID: ${email.id}`);
      
      try {
        // Step 3: Update status to 'production' and simulate sending
        const { data: updatedEmail, error: updateError } = await supabase
          .from('Emails')
          .update({ 
            status: 'production',
            updated_at: new Date().toISOString()
          })
          .eq('id', email.id)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Failed to update email status: ${updateError.message}`);
        }

        // Create notification for autonomous workflow simulation
        const { error: notificationError } = await supabase
          .from('Notifications')
          .insert({
            user_id: email.user_id,
            type: 'success',
            title: 'Batch Test - Email Status Updated',
            message: `Email "${email.subject}" status changed from draft to production via batch test.`,
            read: false
          });

        if (notificationError) {
          console.warn(`⚠️ Failed to create notification for email ${email.id}:`, notificationError.message);
        }

        // Step 4: Log successful result
        const result: BatchTestResult = {
          emailId: email.id,
          recipient: email.recipient || 'N/A',
          project: email.project || 'N/A',
          originalStatus: email.status,
          newStatus: updatedEmail.status,
          success: true
        };

        results.push(result);
        console.log(`✅ Successfully processed email ${email.id}: ${email.recipient} (${email.project})`);

      } catch (error: any) {
        // Log failed result
        const result: BatchTestResult = {
          emailId: email.id,
          recipient: email.recipient || 'N/A',
          project: email.project || 'N/A',
          originalStatus: email.status,
          newStatus: 'error',
          success: false,
          error: error.message
        };

        results.push(result);
        console.error(`❌ Failed to process email ${email.id}:`, error.message);
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.length - successCount;

    // Final summary log
    console.log(`🏁 Batch test completed:`);
    console.log(`   - Total emails: ${results.length}`);
    console.log(`   - Successful: ${successCount}`);
    console.log(`   - Failed: ${errorCount}`);
    console.log(`   - Duration: ${duration}ms`);

    // Return comprehensive response
    const response: BatchTestResponse = {
      totalEmails: draftEmails?.length || 0,
      processedEmails: results.length,
      successCount,
      errorCount,
      results,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('❌ Batch email test failed:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Batch email test failed',
        message: error.message 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);