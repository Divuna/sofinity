import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    console.log('Processing Opravo-Sofinity connection for user:', user.id)

    // Check if Opravo project exists for this user
    const { data: existingProject, error: fetchError } = await supabase
      .from('Projects')
      .select('*')
      .eq('name', 'Opravo')
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching project:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Error fetching project data' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    let result
    let action = ''

    if (existingProject) {
      // Project exists, update external_connection
      const { data: updatedProject, error: updateError } = await supabase
        .from('Projects')
        .update({ 
          external_connection: 'sofinity',
          is_active: true // Ensure it's active
        })
        .eq('id', existingProject.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating project:', updateError)
        return new Response(
          JSON.stringify({ error: 'Error updating project' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        )
      }

      result = updatedProject
      action = 'updated'
      console.log('Updated existing Opravo project with Sofinity connection')
    } else {
      // Project doesn't exist, create new one
      const { data: newProject, error: createError } = await supabase
        .from('Projects')
        .insert([{
          name: 'Opravo',
          description: 'A mobile platform connecting customers and repair professionals.',
          is_active: true,
          external_connection: 'sofinity',
          user_id: user.id
        }])
        .select()
        .single()

      if (createError) {
        console.error('Error creating project:', createError)
        return new Response(
          JSON.stringify({ error: 'Error creating project' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        )
      }

      result = newProject
      action = 'created'
      console.log('Created new Opravo project with Sofinity connection')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        action,
        project: result,
        message: `Project Opravo successfully ${action} with Sofinity connection`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})