import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 [Sofinity Opravo Status] Starting API call...')
    
    const SOFINITY_API_KEY = Deno.env.get('SOFINITY_API_KEY')
    if (!SOFINITY_API_KEY) {
      console.error('❌ [Sofinity Opravo Status] SOFINITY_API_KEY not configured')
      return new Response(
        JSON.stringify({ 
          error: 'SOFINITY_API_KEY not configured',
          isConnected: false,
          lastChecked: new Date().toISOString()
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const SOFINITY_BASE_URL = "https://api.sofinity.com"
    const startTime = Date.now()

    console.log('📡 [Sofinity Opravo Status] Making request to:', `${SOFINITY_BASE_URL}/opravo-status`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000) // 2s timeout

    const response = await fetch(`${SOFINITY_BASE_URL}/opravo-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SOFINITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    const duration = Date.now() - startTime

    console.log('📡 [Sofinity Opravo Status] Raw API response:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      duration: `${duration}ms`
    })

    let responseData
    try {
      responseData = await response.text()
      // Try to parse as JSON if possible
      try {
        responseData = JSON.parse(responseData)
      } catch (e) {
        // Keep as text if not valid JSON
      }
    } catch (e) {
      responseData = 'Failed to read response body'
    }

    const result = {
      isConnected: response.ok,
      lastChecked: new Date().toISOString(),
      error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
      duration,
      apiResponse: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseData
      }
    }

    console.log('✅ [Sofinity Opravo Status] Final result:', result)

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ [Sofinity Opravo Status] Error during API call:', error)

    const result = {
      isConnected: false,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: undefined
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, // Return 200 but with error info in body
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
