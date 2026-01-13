import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const customersDb = createClient(
  process.env.CUSTOMERS_DB_URL!,
  process.env.CUSTOMERS_DB_SERVICE_KEY!
);

const authDb = createClient(
  process.env.AUTH_DB_URL!,
  process.env.AUTH_DB_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: "Missing userId or email" },
        { status: 400 }
      );
    }

    // Extract domain from email
    const domain = email.split("@")[1];

    if (!domain) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Find org by domain in Customers DB
    const { data: org, error: orgError } = await customersDb
      .from("organizations")
      .select("id, name")
      .eq("domain", domain)
      .single();

    if (orgError || !org) {
      // No matching org found - that's ok, user just won't be linked
      return NextResponse.json({
        linked: false,
        message: `No organization found for domain: ${domain}`,
      });
    }

    // Update user with organizationId in Auth DB
    const { error: updateError } = await authDb
      .from("user")
      .update({ organizationId: org.id })
      .eq("id", userId);

    if (updateError) {
      console.error("Error linking user to org:", updateError);
      return NextResponse.json(
        { error: "Failed to link user to organization" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      linked: true,
      organizationId: org.id,
      organizationName: org.name,
    });
  } catch (error) {
    console.error("Error in link-org:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
