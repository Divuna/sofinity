import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get project_id from request body
    const { project_id } = await req.json();

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: 'Missing project_id parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔗 [connect-sofinity] Connecting project to Sofinity', { 
      project_id, 
      user_id: user.id 
    });

    // Verify project exists and belongs to user
    const { data: project, error: projectError } = await supabaseClient
      .from('Projects')
      .select('id, name, user_id')
      .eq('id', project_id)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      console.error('❌ [connect-sofinity] Project not found or unauthorized', { 
        project_id, 
        user_id: user.id,
        error: projectError 
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Project not found or you do not have permission to modify it' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update project to set external_connection
    const { data: updatedProject, error: updateError } = await supabaseClient
      .from('Projects')
      .update({ external_connection: 'sofinity-integration' })
      .eq('id', project_id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ [connect-sofinity] Failed to update project', { 
        project_id, 
        error: updateError 
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to connect project to Sofinity',
          details: updateError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [connect-sofinity] Project connected successfully', {
      project_id,
      project_name: project.name,
      external_connection: 'sofinity-integration'
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Project "${project.name}" successfully connected to Sofinity`,
        project: updatedProject
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [connect-sofinity] Unexpected error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
