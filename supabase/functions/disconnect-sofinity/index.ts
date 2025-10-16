import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    console.log('🔌 [disconnect-sofinity] Request received');

    // Initialize Supabase client
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
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [disconnect-sofinity] Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - please log in' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ [disconnect-sofinity] User authenticated:', user.id);

    // Get project_id from request body
    const { project_id } = await req.json();
    
    if (!project_id) {
      console.error('❌ [disconnect-sofinity] Missing project_id parameter');
      return new Response(
        JSON.stringify({ error: 'Missing project_id parameter' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🔍 [disconnect-sofinity] Disconnecting project:', project_id);

    // Verify project exists and belongs to user
    const { data: project, error: projectError } = await supabaseClient
      .from('Projects')
      .select('id, name, user_id, external_connection')
      .eq('id', project_id)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      console.error('❌ [disconnect-sofinity] Project not found or unauthorized:', projectError);
      return new Response(
        JSON.stringify({ 
          error: 'Project not found or you do not have permission to modify it' 
        }), 
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if project is actually connected
    if (!project.external_connection) {
      console.log('ℹ️ [disconnect-sofinity] Project already disconnected:', project.name);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Project is already disconnected',
          project 
        }), 
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`📝 [disconnect-sofinity] Disconnecting "${project.name}" from ${project.external_connection}`);

    // Update project to remove external_connection
    const { data: updatedProject, error: updateError } = await supabaseClient
      .from('Projects')
      .update({ external_connection: null })
      .eq('id', project_id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ [disconnect-sofinity] Failed to update project:', updateError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to disconnect project from Sofinity',
          details: updateError.message
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`✅ [disconnect-sofinity] Successfully disconnected project "${project.name}"`);

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: `Project "${project.name}" successfully disconnected from Sofinity`,
        project: updatedProject
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ [disconnect-sofinity] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred',
        details: error.message 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
