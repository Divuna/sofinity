import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface OneMilProjectRequest {
  name: string;
  description?: string;
  user_id: string;
  external_connection?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      console.error("Method not allowed:", req.method);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Method not allowed" 
        }),
        {
          status: 405,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate API key
    const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
    const expectedApiKey = Deno.env.get("SOFINITY_API_KEY");
    
    if (!apiKey || apiKey !== expectedApiKey) {
      console.error("Invalid or missing API key");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Unauthorized" 
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const projectData: OneMilProjectRequest = await req.json();

    // Validate required fields
    if (!projectData.name || !projectData.user_id) {
      console.error("Missing required fields:", { name: projectData.name, user_id: projectData.user_id });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required fields: name and user_id" 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Registering OneMil project:", { 
      name: projectData.name, 
      user_id: projectData.user_id 
    });

    // Check if project with this name already exists for this user
    const { data: existingProject } = await supabase
      .from("Projects")
      .select("id, name")
      .eq("name", projectData.name)
      .eq("user_id", projectData.user_id)
      .single();

    if (existingProject) {
      console.log("Project already exists:", existingProject);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Project already exists",
          project_id: existingProject.id,
          project_name: existingProject.name
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Prepare project data for insertion
    const insertData = {
      name: projectData.name,
      description: projectData.description || "OneMil integration project",
      user_id: projectData.user_id,
      external_connection: projectData.external_connection || "onemill",
      is_active: true
    };

    // Insert the project
    const { data: newProject, error: insertError } = await supabase
      .from("Projects")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("Project insertion error:", insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to create project",
          details: insertError.message
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("OneMil project created successfully:", newProject);

    // Log the registration event
    const auditData = {
      user_id: projectData.user_id,
      project_id: newProject.id,
      event_name: "onemill_project_registered",
      event_data: {
        project_name: projectData.name,
        external_connection: insertData.external_connection
      }
    };

    await supabase
      .from("audit_logs")
      .insert(auditData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "OneMil project registered successfully",
        project_id: newProject.id,
        project_name: newProject.name
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in register-onemill-project function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Internal server error",
        details: error.message
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);