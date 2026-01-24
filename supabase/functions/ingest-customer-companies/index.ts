import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Company {
  company_name: string;
  domain: string;
  linkedin_url?: string | null;
}

interface RequestBody {
  org_id: string;
  companies: Company[];
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body: RequestBody = await req.json();
    const { org_id, companies } = body;

    // Validate request body
    if (!org_id || !companies || !Array.isArray(companies)) {
      return new Response(
        JSON.stringify({ error: "Missing org_id or companies array" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("OUTBOUND_SOLUTIONS_DB_URL")!;
    const supabaseKey = Deno.env.get("OUTBOUND_SOLUTIONS_DB_SERVICE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate org_id exists
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", org_id)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: `Organization not found: ${org_id}` }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Prepare records for upsert
    const records = companies.map((company) => ({
      org_id,
      company_name: company.company_name,
      domain: company.domain,
      linkedin_url: company.linkedin_url || null,
      updated_at: new Date().toISOString(),
    }));

    // Create client schema supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      db: { schema: "client" },
    });

    // Upsert companies (on conflict of org_id + domain)
    const { data, error: upsertError } = await supabaseClient
      .from("flattened_customer_companies")
      .upsert(records, {
        onConflict: "org_id,domain",
        ignoreDuplicates: false,
      })
      .select();

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to upsert companies", details: upsertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: data?.length || 0,
        message: `Successfully processed ${data?.length || 0} companies`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
