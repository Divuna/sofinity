import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse the incoming webhook data from Opravo
    const webhookData = await req.json()
    
    console.log('Received Opravo offers webhook:', { type: webhookData.type, data: Object.keys(webhookData) })

    // Handle offer events
    if (webhookData.type === 'OfferCreated' || webhookData.type === 'OfferUpdated') {
      return await handleOfferEvent(supabase, webhookData, corsHeaders)
    }

    // Return error for unsupported event types
    return new Response(
      JSON.stringify({ error: `Event type ${webhookData.type} not supported by offers integration` }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in opravo-offers-integration function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Handle offer creation and updates
async function handleOfferEvent(supabase: any, webhookData: any, corsHeaders: any) {
  try {
    const { offer, user } = webhookData
    
    // Validate required fields
    if (!offer || !user?.email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: offer and user.email' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Find user in Sofinity by email
    let { data: integration, error: integrationError } = await supabase
      .from('external_integrations')
      .select('user_id')
      .eq('external_email', user.email)
      .eq('external_system', 'opravo')
      .maybeSingle()

    if (integrationError) {
      console.error('Error finding integration:', integrationError)
      return new Response(
        JSON.stringify({ error: 'Database error while finding integration' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // If no integration found, try to find user by email in profiles
    let sofinity_user_id = integration?.user_id

    if (!sofinity_user_id) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', user.email)
        .maybeSingle()

      if (profile) {
        sofinity_user_id = profile.user_id
        
        // Create integration mapping for future use
        await supabase
          .from('external_integrations')
          .insert({
            user_id: sofinity_user_id,
            external_system: 'opravo',
            external_user_id: user.id || null,
            external_email: user.email,
            mapping_data: { linked_at: new Date().toISOString() }
          })
      }
    }

    if (!sofinity_user_id) {
      console.log('No Sofinity user found for email:', user.email)
      return new Response(
        JSON.stringify({ 
          error: 'No matching Sofinity user found for this email',
          suggestion: 'User needs to register in Sofinity first'
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Find or create project for this offer
    let project_id = null
    const projectName = `Opravo: ${offer.kategorie || 'Nabídky'}`
    
    const { data: existingProject, error: projectFindError } = await supabase
      .from('Projects')
      .select('id')
      .eq('name', projectName)
      .eq('user_id', sofinity_user_id)
      .maybeSingle()

    if (existingProject) {
      project_id = existingProject.id
    } else {
      const { data: newProject, error: projectCreateError } = await supabase
        .from('Projects')
        .insert({
          name: projectName,
          description: `Automaticky vytvořeno z Opravo nabídek (${offer.kategorie || 'Obecná kategorie'})`,
          user_id: sofinity_user_id,
          external_connection: 'opravo'
        })
        .select('id')
        .single()

      if (projectCreateError) {
        console.warn('Warning: Could not create project:', projectCreateError)
      } else {
        project_id = newProject.id
      }
    }

    // Extract offer data
    const offerData = {
      id: offer.id,
      request_id: offer.request_id || offer.pozadavek_id,
      repairer_id: offer.repairer_id || offer.opravce_id,
      price: offer.price || offer.cena,
      status: offer.status || 'pending',
      project_id: project_id,
      created_at: offer.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insert or update offer (upsert)
    const { data: offerResult, error: offerError } = await supabase
      .from('offers')
      .upsert(offerData, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select()
      .maybeSingle()

    if (offerError) {
      console.error('Error upserting offer:', offerError)
      return new Response(
        JSON.stringify({ error: 'Failed to create/update offer' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Successfully processed offer:', { offer_id: offer.id, project_id })

    return new Response(
      JSON.stringify({ 
        success: true,
        offer_id: offer.id,
        project_id: project_id,
        message: 'Offer processed successfully from Opravo'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in offer event processing:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error during offer processing' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}