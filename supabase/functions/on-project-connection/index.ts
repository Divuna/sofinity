import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Project connection webhook triggered');
    
    const { project_id, project_name, connected, external_connection, timestamp } = await req.json();
    
    console.log('Project connection change:', {
      project_id,
      project_name,
      connected,
      external_connection,
      timestamp
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Send webhook to external system (Sofinity in this case)
    const webhookUrl = 'https://rrmvxsldrjgbdxluklka.supabase.co/functions/v1/project-status-change';
    
    const webhookPayload = {
      project_id,
      project_name,
      connected,
      timestamp
    };

    console.log('Sending webhook to:', webhookUrl);
    console.log('Webhook payload:', webhookPayload);

    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      });

      console.log('Webhook response status:', webhookResponse.status);
      
      if (webhookResponse.ok) {
        console.log('Webhook sent successfully');
      } else {
        console.error('Webhook failed:', await webhookResponse.text());
      }
    } catch (webhookError) {
      console.error('Error sending webhook:', webhookError);
    }

    // Optional: Log the connection change to a notifications table
    try {
      const notificationMessage = connected 
        ? `Projekt "${project_name}" byl propojen se Sofinity`
        : `Projekt "${project_name}" byl odpojen od Sofinity`;

      // Get project user_id for notification
      const { data: projectData } = await supabase
        .from('Projects')
        .select('user_id')
        .eq('id', project_id)
        .single();

      if (projectData?.user_id) {
        await supabase
          .from('Notifications')
          .insert({
            user_id: projectData.user_id,
            title: connected ? 'Projekt propojen' : 'Projekt odpojen',
            message: notificationMessage,
            type: 'system'
          });
      }
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Project connection webhook processed successfully',
        project_id,
        connected
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error processing project connection webhook:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process project connection webhook',
        details: (error as any)?.message || 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});