import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MediaRequest {
  email_id: string;
  media_type: 'image' | 'video';
  prompt: string;
  user_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    console.log('Starting media generation request...');
    
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the request body
    const { email_id, media_type, prompt, user_id }: MediaRequest = await req.json();

    if (!email_id || !media_type || !prompt) {
      console.error('Missing required parameters:', { email_id, media_type, prompt });
      return new Response(
        JSON.stringify({ error: 'email_id, media_type, and prompt are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing media generation request:', { 
      email_id, 
      media_type, 
      prompt: prompt.substring(0, 100) + '...',
      user_id 
    });

    // Check if email-media bucket exists, create if needed
    console.log('Checking email-media storage bucket...');
    const { data: bucketData, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('Error checking storage buckets:', bucketError);
      throw new Error('Failed to check storage buckets');
    }

    const emailMediaBucket = bucketData.find(bucket => bucket.name === 'email-media');
    if (!emailMediaBucket) {
      console.log('email-media bucket not found, creating...');
      const { error: createBucketError } = await supabase.storage.createBucket('email-media', { public: true });
      if (createBucketError) {
        console.error('Error creating email-media bucket:', createBucketError);
        throw new Error('Failed to create email-media bucket');
      }
      console.log('email-media bucket created successfully');
    } else {
      console.log('email-media bucket exists');
    }

    // Fetch email details to enrich the prompt
    console.log('Fetching email details for ID:', email_id);
    const { data: emailData, error: emailError } = await supabase
      .from('Emails')
      .select('subject, content, user_id')
      .eq('id', email_id)
      .single();

    if (emailError || !emailData) {
      console.error('Email not found:', emailError);
      return new Response(
        JSON.stringify({ error: 'Email not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Email data fetched successfully:', { 
      subject: emailData.subject, 
      user_id: emailData.user_id 
    });

    // Get the Lovable AI API key
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Create enriched prompt based on email content and media type
    const enrichedPrompt = `Create a ${media_type} for OneMil email campaign.
    
    Email Subject: ${emailData.subject}
    Email Content Context: ${emailData.content.substring(0, 500)}
    
    Specific Request: ${prompt}
    
    Style Guidelines:
    - Professional and modern design
    - OneMil brand colors (blue and white theme)
    - High quality and engaging
    - ${media_type === 'image' ? 'Suitable for email content illustration' : ''}
    - ${media_type === 'video' ? 'Suitable for video thumbnail or preview' : ''}
    `;

    console.log('Calling Lovable AI for media generation...');
    console.log('AI Model: google/gemini-2.5-flash-image-preview');

    // Call Lovable AI Gateway for media generation using Nano banana model
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: enrichedPrompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
    }

    console.log('AI response received, parsing...');
    let aiData;
    try {
      aiData = await aiResponse.json();
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      throw new Error('Invalid AI response format');
    }

    // Parse AI response and strip any JSON code fences
    let responseContent = aiData.choices[0]?.message?.content || '';
    
    // Strip JSON code fences if present
    if (responseContent.startsWith('```json')) {
      responseContent = responseContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (responseContent.startsWith('```')) {
      responseContent = responseContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const images = aiData.choices[0]?.message?.images;

    if (!images || images.length === 0) {
      console.error('No image generated by AI. Response:', JSON.stringify(aiData, null, 2));
      throw new Error('No image generated by AI');
    }

    const imageData = images[0].image_url.url; // Base64 data URL
    console.log('Image generated by AI, data URL length:', imageData.length);

    // Extract base64 data and convert to blob
    const base64Data = imageData.split(',')[1];
    if (!base64Data) {
      console.error('Invalid image data format');
      throw new Error('Invalid image data format');
    }

    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    console.log('Image converted to binary, size:', binaryData.length, 'bytes');

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${media_type}-${email_id}-${timestamp}.png`;
    const filePath = `email-media/${fileName}`;

    console.log('Uploading to Supabase Storage:', filePath);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('email-media')
      .upload(filePath, binaryData, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload media: ${uploadError.message}`);
    }

    console.log('Upload successful:', uploadData);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('email-media')
      .getPublicUrl(filePath);

    const mediaUrl = urlData.publicUrl;
    console.log('Media uploaded successfully, URL:', mediaUrl);

    // Save media record to EmailMedia table
    console.log('Saving media record to EmailMedia table...');
    const { data: mediaRecord, error: mediaError } = await supabase
      .from('EmailMedia')
      .insert({
        email_id: email_id,
        media_type: media_type,
        media_url: mediaUrl,
        file_name: fileName,
        generation_prompt: prompt,
        generated_by_ai: true,
        file_size: binaryData.length
      })
      .select()
      .single();

    if (mediaError) {
      console.error('Database error saving media record:', mediaError);
      // Try to cleanup uploaded file
      console.log('Attempting to clean up uploaded file...');
      try {
        await supabase.storage.from('email-media').remove([filePath]);
        console.log('Cleanup successful');
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
      }
      throw new Error(`Failed to save media record: ${mediaError.message}`);
    }

    console.log('Media record created successfully:', mediaRecord.id);

    // Log the media generation event to audit_logs
    console.log('Logging audit event...');
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        event_name: 'ai_media_generated',
        user_id: user_id || emailData.user_id,
        event_data: {
          email_id: email_id,
          media_id: mediaRecord.id,
          media_type: media_type,
          prompt: prompt.substring(0, 500),
          file_name: fileName,
          file_size: binaryData.length,
          ai_model: 'google/gemini-2.5-flash-image-preview',
          generated_at: new Date().toISOString()
        }
      });

    if (auditError) {
      console.error('Failed to log audit event:', auditError);
      // Don't fail the request for audit log errors
    } else {
      console.log('Audit event logged successfully');
    }

    console.log('Media generation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        media: mediaRecord,
        media_url: mediaUrl
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in generate-media function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);