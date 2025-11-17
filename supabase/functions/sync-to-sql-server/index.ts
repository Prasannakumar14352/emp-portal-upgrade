import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SqlServerConfig {
  host: string;
  user: string;
  password: string;
  database: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { table, record, operation } = await req.json();
    console.log(`Sync triggered: ${operation} on ${table}`, record);

    // Get SQL Server credentials
    const sqlConfig: SqlServerConfig = {
      host: Deno.env.get('SQL_SERVER_HOST') || '',
      user: Deno.env.get('SQL_SERVER_USER') || '',
      password: Deno.env.get('SQL_SERVER_PASSWORD') || '',
      database: Deno.env.get('SQL_SERVER_DATABASE') || '',
    };

    // Validate credentials
    if (!sqlConfig.host || !sqlConfig.user || !sqlConfig.password || !sqlConfig.database) {
      throw new Error('SQL Server credentials not configured');
    }

    let syncResult;

    switch (table) {
      case 'profiles':
        syncResult = await syncProfile(record, operation, sqlConfig);
        break;
      case 'employees':
        syncResult = await syncEmployee(record, operation, sqlConfig);
        break;
      case 'holidays':
        syncResult = await syncHoliday(record, operation, sqlConfig);
        break;
      case 'payslips':
        syncResult = await syncPayslip(record, operation, sqlConfig);
        break;
      case 'leaves':
        syncResult = await syncLeave(record, operation, sqlConfig);
        break;
      case 'user_roles':
        syncResult = await syncUserRole(record, operation, sqlConfig);
        break;
      default:
        console.log(`No sync handler for table: ${table}`);
        syncResult = { synced: false, reason: 'No handler for this table' };
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        table, 
        operation,
        syncResult 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function syncProfile(record: any, operation: string, config: SqlServerConfig) {
  console.log('Syncing profile:', record);
  
  // Note: Direct SQL Server connection requires mssql package
  // For now, log the sync attempt
  // In production, you would use a REST API endpoint on your backend
  
  return {
    synced: false,
    reason: 'SQL Server direct connection not available in Deno. Use backend API instead.',
    suggestion: 'Trigger a backend API call to /api/bulk/users endpoint'
  };
}

async function syncEmployee(record: any, operation: string, config: SqlServerConfig) {
  console.log('Syncing employee:', record);
  return {
    synced: false,
    reason: 'SQL Server direct connection not available in Deno. Use backend API instead.',
  };
}

async function syncHoliday(record: any, operation: string, config: SqlServerConfig) {
  console.log('Syncing holiday:', record);
  return {
    synced: false,
    reason: 'SQL Server direct connection not available in Deno. Use backend API instead.',
  };
}

async function syncPayslip(record: any, operation: string, config: SqlServerConfig) {
  console.log('Syncing payslip:', record);
  return {
    synced: false,
    reason: 'SQL Server direct connection not available in Deno. Use backend API instead.',
  };
}

async function syncLeave(record: any, operation: string, config: SqlServerConfig) {
  console.log('Syncing leave:', record);
  return {
    synced: false,
    reason: 'SQL Server direct connection not available in Deno. Use backend API instead.',
  };
}

async function syncUserRole(record: any, operation: string, config: SqlServerConfig) {
  console.log('Syncing user role:', record);
  return {
    synced: false,
    reason: 'SQL Server direct connection not available in Deno. Use backend API instead.',
  };
}
