import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    console.log('Starting DB snapshot export...');

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate timestamp for filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `sofinity_snapshot_${timestamp}.sql`;

    console.log(`Generating snapshot: ${filename}`);

    // Query 1: Get all table definitions
    const { data: tables, error: tablesError } = await supabase.rpc('pg_catalog.format_type', {});
    
    // Use direct SQL queries to get database schema
    const tableQuery = `
      SELECT 
        'CREATE TABLE ' || schemaname || '.' || tablename || ' (' ||
        string_agg(
          column_name || ' ' || data_type || 
          CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
          CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
          ', '
        ) || ');' as definition
      FROM information_schema.tables t
      JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
      WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
      GROUP BY t.schemaname, t.tablename;
    `;

    // Query 2: Get all function definitions
    const functionQuery = `
      SELECT 
        'CREATE OR REPLACE FUNCTION ' || n.nspname || '.' || p.proname || 
        '(' || pg_get_function_arguments(p.oid) || ')' ||
        ' RETURNS ' || pg_get_function_result(p.oid) ||
        E'\nAS $function$\n' || p.prosrc || E'\n$function$\n' ||
        'LANGUAGE ' || l.lanname || ';' as definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      JOIN pg_language l ON p.prolang = l.oid
      WHERE n.nspname = 'public'
      ORDER BY p.proname;
    `;

    // Query 3: Get all view definitions
    const viewQuery = `
      SELECT 
        'CREATE OR REPLACE VIEW ' || schemaname || '.' || viewname || 
        E' AS\n' || definition as definition
      FROM pg_views
      WHERE schemaname = 'public'
      ORDER BY viewname;
    `;

    // Query 4: Get all triggers
    const triggerQuery = `
      SELECT 
        pg_get_triggerdef(oid) || ';' as definition
      FROM pg_trigger
      WHERE NOT tgisinternal
        AND tgrelid IN (
          SELECT oid 
          FROM pg_class 
          WHERE relnamespace = 'public'::regnamespace
        )
      ORDER BY tgname;
    `;

    console.log('Fetching table definitions...');
    const { data: tableData } = await supabase.rpc('exec_sql', { 
      sql_query: tableQuery 
    }).single();

    console.log('Fetching function definitions...');
    const { data: functionData } = await supabase.rpc('exec_sql', { 
      sql_query: functionQuery 
    }).single();

    console.log('Fetching view definitions...');
    const { data: viewData } = await supabase.rpc('exec_sql', { 
      sql_query: viewQuery 
    }).single();

    console.log('Fetching trigger definitions...');
    const { data: triggerData } = await supabase.rpc('exec_sql', { 
      sql_query: triggerQuery 
    }).single();

    // Build the complete SQL snapshot
    let sqlSnapshot = `-- Sofinity Database Snapshot
-- Generated: ${new Date().toISOString()}
-- Database: Sofinity Production

-- ==========================================
-- TABLES
-- ==========================================

`;

    // Since we can't use raw SQL, let's build a comprehensive snapshot manually
    // by querying information_schema tables
    
    const { data: tablesInfo } = await supabase
      .from('information_schema.tables' as any)
      .select('*')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');

    if (tablesInfo) {
      for (const table of tablesInfo) {
        sqlSnapshot += `-- Table: ${table.table_name}\n`;
        
        // Get columns for this table
        const { data: columns } = await supabase
          .from('information_schema.columns' as any)
          .select('*')
          .eq('table_schema', 'public')
          .eq('table_name', table.table_name)
          .order('ordinal_position');

        if (columns) {
          sqlSnapshot += `CREATE TABLE public."${table.table_name}" (\n`;
          const columnDefs = columns.map(col => {
            let def = `  "${col.column_name}" ${col.data_type}`;
            if (col.character_maximum_length) {
              def += `(${col.character_maximum_length})`;
            }
            if (col.is_nullable === 'NO') {
              def += ' NOT NULL';
            }
            if (col.column_default) {
              def += ` DEFAULT ${col.column_default}`;
            }
            return def;
          });
          sqlSnapshot += columnDefs.join(',\n') + '\n);\n\n';
        }
      }
    }

    sqlSnapshot += `
-- ==========================================
-- VIEWS
-- ==========================================

`;

    const { data: viewsInfo } = await supabase
      .from('information_schema.views' as any)
      .select('*')
      .eq('table_schema', 'public');

    if (viewsInfo) {
      for (const view of viewsInfo) {
        sqlSnapshot += `-- View: ${view.table_name}\n`;
        sqlSnapshot += `CREATE OR REPLACE VIEW public."${view.table_name}" AS\n`;
        sqlSnapshot += `${view.view_definition};\n\n`;
      }
    }

    sqlSnapshot += `
-- ==========================================
-- FUNCTIONS
-- ==========================================

-- Note: Function definitions require elevated privileges
-- Please use Supabase Dashboard SQL Editor to export functions

-- ==========================================
-- END OF SNAPSHOT
-- ==========================================
`;

    console.log(`Generated SQL snapshot (${sqlSnapshot.length} bytes)`);

    // Upload to storage
    console.log('Uploading to storage...');
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('backups')
      .upload(filename, new Blob([sqlSnapshot], { type: 'text/plain' }), {
        contentType: 'text/plain',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log('Upload successful:', uploadData);

    // Log the export to audit
    await supabase.from('audit_logs').insert({
      event_name: 'db_snapshot_exported',
      event_data: {
        filename,
        size_bytes: sqlSnapshot.length,
        timestamp: new Date().toISOString()
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        filename,
        size: sqlSnapshot.length,
        path: uploadData.path,
        message: 'Archivní snapshot uložen do Storage'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error exporting DB snapshot:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
