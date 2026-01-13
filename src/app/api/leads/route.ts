import { auth } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const customersDb = createClient(
  process.env.CUSTOMERS_DB_URL!,
  process.env.CUSTOMERS_DB_SERVICE_KEY!
);

const authDb = createClient(
  process.env.AUTH_DB_URL!,
  process.env.AUTH_DB_SERVICE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Check for impersonation email (for admin testing)
    const impersonateEmail = searchParams.get("email");

    // Filter params
    const search = searchParams.get("search");
    const industry = searchParams.get("industry");
    const employeeRange = searchParams.get("employee_range");
    const country = searchParams.get("country");
    const title = searchParams.get("title");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let organizationId: string | null = null;

    if (impersonateEmail) {
      // Look up user by email for impersonation
      const { data: impersonatedUser } = await authDb
        .from("user")
        .select("organizationId")
        .eq("email", impersonateEmail)
        .single();

      organizationId = impersonatedUser?.organizationId || null;
    } else {
      // Normal flow - get session from better-auth
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Get user's organizationId from Auth DB
      const { data: user } = await authDb
        .from("user")
        .select("organizationId")
        .eq("id", session.user.id)
        .single();

      organizationId = user?.organizationId || null;
    }

    if (!organizationId) {
      return NextResponse.json({
        leads: [],
        total: 0,
        message: "User not linked to an organization",
      });
    }

    // Build query
    let query = customersDb
      .schema("product")
      .from("org_leads")
      .select("*", { count: "exact" })
      .eq("org_id", organizationId);

    // Apply filters
    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,latest_title.ilike.%${search}%,latest_company.ilike.%${search}%`
      );
    }

    if (industry) {
      query = query.eq("industry", industry);
    }

    if (employeeRange) {
      query = query.eq("employee_count_range", employeeRange);
    }

    if (country) {
      query = query.eq("country", country);
    }

    if (title) {
      query = query.ilike("latest_title", `%${title}%`);
    }

    // Apply pagination
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: leads, error: leadsError, count } = await query;

    if (leadsError) {
      console.error("Error fetching leads:", leadsError);
      return NextResponse.json(
        { error: "Failed to fetch leads" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      leads: leads || [],
      total: count || 0
    });
  } catch (error) {
    console.error("Error in leads API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
