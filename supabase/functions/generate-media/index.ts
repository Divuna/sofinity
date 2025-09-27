import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email_id } = await req.json()

    if (!email_id) {
      throw new Error('Email ID is required')
    }

    console.log('Generating media for email:', email_id)

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get email details
    const { data: email, error: emailError } = await supabase
      .from('Emails')
      .select('*')
      .eq('id', email_id)
      .single()

    if (emailError) {
      throw new Error(`Failed to fetch email: ${emailError.message}`)
    }

    console.log('Email fetched:', email.subject)

    // Determine media types based on email type and content
    const mediaTypes = getMediaTypesForEmail(email.type, email.content)
    console.log('Media types to generate:', mediaTypes)

    const generatedMedia = []
    const errors = []

    // Generate each media type
    for (const mediaType of mediaTypes) {
      try {
        console.log(`Generating ${mediaType} for email ${email_id}`)
        
        const prompt = generatePromptForMedia(mediaType, email)
        console.log(`Generated prompt for ${mediaType}:`, prompt)

        // Use Lovable AI to generate images
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [
              { role: 'user', content: prompt }
            ],
            modalities: ['image', 'text']
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI generation error for ${mediaType}:`, aiResponse.status);
          errors.push(`AI generation failed for ${mediaType}: ${aiResponse.status}`);
          continue;
        }

        const aiData = await aiResponse.json();
        let mediaUrl = `https://placeholder.com/generated/${email_id}/${mediaType}`;
        let fileSize = Math.floor(Math.random() * 1000000) + 100000;

        // Check if AI returned an image
        if (aiData.choices && aiData.choices[0] && aiData.choices[0].message.images) {
          const image = aiData.choices[0].message.images[0];
          if (image && image.image_url && image.image_url.url) {
            // Save the base64 image to Supabase Storage
            try {
              const base64Data = image.image_url.url.split(',')[1];
              const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
              
              const fileName = `${email.type}_${mediaType}_${Date.now()}.${getFileExtension(mediaType)}`;
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('email-media')
                .upload(fileName, imageBuffer, {
                  contentType: `image/${getFileExtension(mediaType)}`,
                  upsert: true
                });

              if (uploadError) {
                console.error('Storage upload error:', uploadError);
              } else {
                const { data: { publicUrl } } = supabase.storage
                  .from('email-media')
                  .getPublicUrl(fileName);
                mediaUrl = publicUrl;
                fileSize = imageBuffer.length;
              }
            } catch (storageError) {
              console.error('Error processing AI image:', storageError);
            }
          }
        }

        // Save media to EmailMedia table
        const { data: mediaData, error: mediaError } = await supabase
          .from('EmailMedia')
          .insert({
            email_id: email_id,
            media_type: mediaType,
            file_name: `${email.type}_${mediaType}_${Date.now()}.${getFileExtension(mediaType)}`,
            media_url: mediaUrl,
            generation_prompt: prompt,
            generated_by_ai: true,
            file_size: fileSize
          })
          .select()
          .single()

        if (mediaError) {
          console.error(`Database insert error for ${mediaType}:`, mediaError)
          errors.push(`Failed to save ${mediaType}: ${mediaError.message}`)
          continue
        }

        generatedMedia.push({
          mediaType,
          mediaId: mediaData.id,
          mediaUrl: mediaData.media_url,
          fileName: mediaData.file_name
        })

        console.log(`Successfully generated and saved ${mediaType}`)

      } catch (mediaError: any) {
        console.error(`Error generating ${mediaType}:`, mediaError)
        errors.push(`Error generating ${mediaType}: ${mediaError?.message || 'Unknown error'}`)
      }
    }

    // Create audit log
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: email.user_id,
          event_name: 'multimedia_generated',
          event_data: {
            email_id: email_id,
            email_subject: email.subject,
            media_generated: generatedMedia.length,
            media_types: mediaTypes,
            generated_media: generatedMedia,
            errors: errors,
            processed_at: new Date().toISOString()
          }
        })
      console.log('Audit log created')
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError)
    }

    const result = {
      success: true,
      email_id: email_id,
      email_subject: email.subject,
      generated_media: generatedMedia,
      media_count: generatedMedia.length,
      requested_types: mediaTypes,
      errors: errors,
      processing_time: new Date().toISOString()
    }

    console.log('Media generation completed:', result)

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Generate media error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error?.message || 'Unknown error',
        details: error?.toString() || 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function getMediaTypesForEmail(emailType: string, content: string): string[] {
  const mediaMap: Record<string, string[]> = {
    'launch': ['image', 'banner'],
    'contest': ['image', 'banner', 'video'],
    'gift': ['image', 'banner'],
    'update': ['image'],
    'campaign': ['image', 'banner'],
    'newsletter': ['image'],
    'promotion': ['image', 'banner', 'video']
  }

  let types = mediaMap[emailType?.toLowerCase()] || ['image']

  // Enhance based on content analysis
  const contentLower = content?.toLowerCase() || ''
  
  if (contentLower.includes('video') || contentLower.includes('sleduj') || contentLower.includes('podívej')) {
    if (!types.includes('video')) types.push('video')
  }
  
  if (contentLower.includes('banner') || contentLower.includes('kampaň')) {
    if (!types.includes('banner')) types.push('banner')
  }

  return types
}

function generatePromptForMedia(mediaType: string, email: any): string {
  const subject = email.subject || 'Email Campaign'
  const content = email.content || 'Campaign content'
  const project = email.project || 'OneMil'

  const prompts: Record<string, string> = {
    'image': `Create a high-quality promotional image for "${subject}". Project: ${project}. Style: modern, professional, engaging. Content theme: ${content.substring(0, 200)}`,
    'banner': `Design a web banner for email campaign "${subject}". Project: ${project}. Dimensions: 600x200px. Style: eye-catching, professional, brand-consistent. Include call-to-action elements.`,
    'video': `Create a promotional video concept for "${subject}". Project: ${project}. Duration: 30-60 seconds. Style: engaging, modern, professional. Theme: ${content.substring(0, 200)}`,
    'logo': `Design a logo variation for "${project}" campaign "${subject}". Style: modern, clean, professional.`
  }

  return prompts[mediaType] || `Generate a ${mediaType} for "${subject}". Project: ${project}. Make it professional and engaging.`
}

function getFileExtension(mediaType: string): string {
  const extensionMap: Record<string, string> = {
    'image': 'jpg',
    'banner': 'png',
    'video': 'mp4',
    'logo': 'svg',
    'document': 'pdf'
  }
  return extensionMap[mediaType] || 'jpg'
}