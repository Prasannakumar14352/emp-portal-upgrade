import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SqlServerConfig {
  server: string;
  database: string;
  user: string;
  password: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action } = await req.json();

    // Get SQL Server connection details from secrets
    const sqlConfig: SqlServerConfig = {
      server: Deno.env.get("SQL_SERVER_HOST") || "",
      database: Deno.env.get("SQL_SERVER_DATABASE") || "",
      user: Deno.env.get("SQL_SERVER_USER") || "",
      password: Deno.env.get("SQL_SERVER_PASSWORD") || "",
    };

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("SQL Server sync action:", action);

    switch (action) {
      case "fetch_employees": {
        // Note: Deno doesn't have native SQL Server support
        // You would need to use a REST API endpoint from your SQL Server
        // or install a compatible driver
        
        // For now, this is a template showing how you'd structure it
        // You'll need to add the actual SQL Server connection logic
        
        // Example structure of what data might look like:
        const employeesData = {
          message: "SQL Server connection configured. Add your connection logic here.",
          config: {
            server: sqlConfig.server,
            database: sqlConfig.database,
            user: sqlConfig.user,
          },
        };

        return new Response(JSON.stringify(employeesData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "fetch_leave_balances": {
        // Fetch leave balances from SQL Server
        // Then sync to Supabase
        
        const message = "Configure your SQL Server queries here to fetch leave balances";
        
        return new Response(JSON.stringify({ message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "sync_leave_requests": {
        // Fetch leave requests from SQL Server and sync to Supabase
        
        const message = "Configure your SQL Server queries here to sync leave requests";
        
        return new Response(JSON.stringify({ message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }
  } catch (error) {
    console.error("Error in sql-server-sync function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
