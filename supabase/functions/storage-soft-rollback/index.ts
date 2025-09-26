import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RollbackRequest {
  sourceBucket: string
  backupBucket: string
  hours: number
  dryRun: boolean
}

interface RollbackResult {
  success: boolean
  dryRun: boolean
  summary: {
    totalFiles: number
    totalSize: number
    affectedFiles: number
  }
  samplePaths: string[]
  backupCreated?: boolean
  error?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { sourceBucket, backupBucket, hours, dryRun }: RollbackRequest = await req.json()

    if (!sourceBucket || !backupBucket || !hours) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters: sourceBucket, backupBucket, hours' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Starting storage rollback - sourceBucket: ${sourceBucket}, backupBucket: ${backupBucket}, hours: ${hours}, dryRun: ${dryRun}`)

    // Calculate cutoff time
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - hours)
    
    console.log(`Cutoff time: ${cutoffTime.toISOString()}`)

    // List all files in source bucket
    const { data: allFiles, error: listError } = await supabase.storage
      .from(sourceBucket)
      .list('', { 
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (listError) {
      console.error('Error listing files:', listError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to list files: ${listError.message}` 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!allFiles || allFiles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun,
          summary: { totalFiles: 0, totalSize: 0, affectedFiles: 0 },
          samplePaths: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Filter files uploaded within the specified hours
    const recentFiles = allFiles.filter(file => {
      if (!file.created_at) return false
      const fileDate = new Date(file.created_at)
      return fileDate > cutoffTime
    })

    console.log(`Found ${recentFiles.length} files uploaded in the last ${hours} hours`)

    const totalSize = recentFiles.reduce((sum, file) => sum + (file.metadata?.size || 0), 0)
    const samplePaths = recentFiles.slice(0, 10).map(file => file.name)

    const result: RollbackResult = {
      success: true,
      dryRun,
      summary: {
        totalFiles: allFiles.length,
        totalSize,
        affectedFiles: recentFiles.length
      },
      samplePaths
    }

    // If this is not a dry run, perform the actual rollback
    if (!dryRun && recentFiles.length > 0) {
      console.log('Performing actual rollback...')

      // First, ensure backup bucket exists
      const { error: bucketError } = await supabase.storage.createBucket(backupBucket, {
        public: false,
        allowedMimeTypes: undefined,
        fileSizeLimit: undefined
      })

      if (bucketError && !bucketError.message.includes('already exists')) {
        console.error('Error creating backup bucket:', bucketError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to create backup bucket: ${bucketError.message}` 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Copy files to backup bucket before deletion
      const backupPromises = recentFiles.map(async (file) => {
        try {
          // Download file from source
          const { data: fileData, error: downloadError } = await supabase.storage
            .from(sourceBucket)
            .download(file.name)

          if (downloadError) {
            console.error(`Error downloading ${file.name}:`, downloadError)
            return { success: false, file: file.name, error: downloadError.message }
          }

          // Upload to backup bucket
          const { error: uploadError } = await supabase.storage
            .from(backupBucket)
            .upload(file.name, fileData)

          if (uploadError) {
            console.error(`Error backing up ${file.name}:`, uploadError)
            return { success: false, file: file.name, error: uploadError.message }
          }

          return { success: true, file: file.name }
        } catch (error) {
          console.error(`Unexpected error backing up ${file.name}:`, error)
          return { success: false, file: file.name, error: (error as Error).message }
        }
      })

      const backupResults = await Promise.all(backupPromises)
      const failedBackups = backupResults.filter(r => !r.success)

      if (failedBackups.length > 0) {
        console.error('Some backups failed:', failedBackups)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to backup ${failedBackups.length} files before deletion` 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Now delete files from source bucket
      const filesToDelete = recentFiles.map(file => file.name)
      const { error: deleteError } = await supabase.storage
        .from(sourceBucket)
        .remove(filesToDelete)

      if (deleteError) {
        console.error('Error deleting files:', deleteError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to delete files: ${deleteError.message}` 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      result.backupCreated = true
      console.log(`Successfully rolled back ${recentFiles.length} files`)
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Unexpected error: ${(error as Error).message}` 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})