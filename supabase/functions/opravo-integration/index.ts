import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyWebhookRequest, createUnauthorizedResponse } from '../_shared/webhook-security.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Validation constants
const MAX_STRING_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 2000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper function to validate UUID format
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Sanitize string input to prevent XSS
function sanitizeString(input: string, maxLength: number = MAX_STRING_LENGTH): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .trim()
    .substring(0, maxLength);
}

// Validate email format
function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 255;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Verify webhook signature and security checks
  const secret = Deno.env.get('SOFINITY_WEBHOOK_SECRET') ?? '';
  const verification = await verifyWebhookRequest(req, 'opravo-integration', secret);
  
  if (!verification.valid) {
    return createUnauthorizedResponse(corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse the incoming webhook data from Opravo
    const webhookData = await JSON.parse(await req.text())
    
    console.log('Received Opravo webhook:', { type: webhookData.type, data: Object.keys(webhookData) })

    // Validate webhook structure
    if (!webhookData.type || typeof webhookData.type !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook: missing or invalid type field' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Handle different event types
    if (webhookData.type === 'RequestCreated' || webhookData.type === 'OfferCreated') {
      const { request, user } = webhookData
      
      // Validate required fields for contact ingestion
      if (!request || !user?.email) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: request and user.email for contact ingestion' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Validate email format
      if (!isValidEmail(user.email)) {
        return new Response(
          JSON.stringify({ error: 'Invalid email format' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Process contact ingestion
      return await handleContactIngestion(supabase, request, user, corsHeaders)
    }

    // Fallback to original AI request creation for other events
    const { request, user } = webhookData
    
    console.log('Processing as AI request:', { request, user })

    // Validate required fields
    if (!request || !user?.email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: request and user.email' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate email format
    if (!isValidEmail(user.email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Find user in Sofinity by email or create integration mapping
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

    // Sanitize inputs
    const sanitizedPopis = sanitizeString(request.popis || '', MAX_DESCRIPTION_LENGTH);
    const sanitizedKategorie = sanitizeString(request.kategorie || '');
    const sanitizedLokalita = sanitizeString(request.lokalita || request.adresa || '');
    const sanitizedEmail = sanitizeString(user.email, 255);

    // ✅ PHASE 2 FIX: Find or create "Opravo" project BEFORE creating AIRequest
    let project_id: string | null = null;

    const { data: existingProject } = await supabase
      .from('Projects')
      .select('id')
      .eq('name', 'Opravo')
      .eq('user_id', sofinity_user_id)
      .maybeSingle();

    if (existingProject) {
      project_id = existingProject.id;
      console.log('Found existing Opravo project:', project_id);
    } else {
      // Create "Opravo" project if it doesn't exist
      const { data: newProject, error: projectError } = await supabase
        .from('Projects')
        .insert({
          name: 'Opravo',
          description: 'Automaticky vytvořeno z Opravo integrace',
          user_id: sofinity_user_id,
          external_connection: 'opravo',
          is_active: true
        })
        .select('id')
        .single();

      if (newProject) {
        project_id = newProject.id;
        console.log('Created new Opravo project:', project_id);
      } else {
        console.error('Failed to create Opravo project:', projectError);
        return new Response(
          JSON.stringify({ error: 'Cannot create AIRequest: project creation failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create detailed prompt based on request data
    const urgencyText = request.urgentni ? ' (URGENTNÍ)' : ''
    const categoryText = sanitizedKategorie ? ` v kategorii ${sanitizedKategorie}` : ''
    const locationText = sanitizedLokalita ? ` v lokalitě ${sanitizedLokalita}` : ''
    
    const prompt = `Create a follow-up email or campaign for a new service request${urgencyText}: "${sanitizedPopis}"${categoryText}${locationText}. The request was created for user ${sanitizedEmail}.`

    // ✅ Create AI Request with valid project_id
    const { data: aiRequest, error: aiError } = await supabase
      .from('AIRequests')
      .insert({
        type: 'campaign_generator',
        prompt: prompt,
        status: 'waiting',
        user_id: sofinity_user_id,
        project_id: project_id  // ✅ Always has value now
      })
      .select()
      .single()

    if (aiError) {
      console.error('Error creating AI request:', aiError)
      return new Response(
        JSON.stringify({ error: 'Failed to create AI request' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ✅ Create OpravoJobs record with valid project_id
    const { data: opravoJob, error: jobError } = await supabase
      .from('opravojobs')
      .insert({
        request_id: isValidUUID(request.id) ? request.id : null,
        external_request_id: sanitizeString(request.id || ''),
        popis: sanitizedPopis,
        vytvoreno: request.created_at || new Date().toISOString(),
        urgentni: Boolean(request.urgentni),
        lokalita: sanitizedLokalita,
        zadavatel_id: request.zadavatel_id,
        status: 'pending',
        project_id: project_id,  // ✅ Use the validated project_id
        user_id: sofinity_user_id
      })
      .select()
      .single()

    if (jobError) {
      console.error('Error creating OpravoJob:', jobError)
    }

    // Auto-generate campaign schedule
    if (opravoJob) {
      const campaignContent = `${request.popis || 'Nová zakázka'} v lokalitě ${request.lokalita || request.adresa || 'neuvedeno'}${urgencyText}`
      const channel = request.urgentni ? 'email' : 'facebook'
      const publishAt = new Date()
      publishAt.setDate(publishAt.getDate() + 1) // Tomorrow

      const { error: scheduleError } = await supabase
        .from('CampaignSchedule')
        .insert({
          campaign_id: null, // No specific campaign
          channel: channel,
          content: campaignContent,
          publish_at: publishAt.toISOString(),
          published: false,
          user_id: sofinity_user_id
        })

      if (scheduleError) {
        console.warn('Warning: Could not create campaign schedule:', scheduleError)
      }
    }

    console.log('Successfully created AI request:', aiRequest.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        ai_request_id: aiRequest.id,
        opravo_job_id: opravoJob?.id || null,
        project_id: project_id,  // ✅ Use the validated project_id
        message: 'OpravoJob and AI request created successfully in Sofinity'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    // Don't log error details
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Handle contact ingestion for RequestCreated and OfferCreated events
async function handleContactIngestion(supabase: any, request: any, user: any, corsHeaders: any) {
  try {
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

    // Find existing main "Opravo" project (no automatic creation of sub-projects)
    let project_id = null
    const projectName = "Opravo" // Use main project instead of category-specific projects
    
    const { data: existingProject, error: projectFindError } = await supabase
      .from('Projects')
      .select('id')
      .eq('name', projectName)
      .eq('user_id', sofinity_user_id)
      .maybeSingle()

    if (existingProject) {
      project_id = existingProject.id
    } else {
      console.log('Main Opravo project not found - projects must be created manually by admin')
      // Don't create new projects automatically - use null project_id
      project_id = null
    }

    // Extract contact information
    const contactData = {
      user_id: sofinity_user_id,
      email: user.email,
      full_name: user.jmeno || user.name || null,
      role: request.typ || null,
      city: request.mesto || request.lokalita || request.adresa || null,
      project_id: project_id,
      source: 'opravo'
    }

    // Insert or update contact (upsert)
    const { data: contact, error: contactError } = await supabase
      .from('Contacts')
      .upsert(contactData, { 
        onConflict: 'user_id,email',
        ignoreDuplicates: false 
      })
      .select()
      .maybeSingle()

    if (contactError) {
      console.error('Error upserting contact:', contactError)
      return new Response(
        JSON.stringify({ error: 'Failed to create/update contact' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Successfully processed contact:', { email: user.email, project_id })

    return new Response(
      JSON.stringify({ 
        success: true,
        contact_id: contact?.id || null,
        project_id: project_id,
        message: 'Contact processed successfully from Opravo'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in contact ingestion:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error during contact processing' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}