import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const customersDb = createClient(
  process.env.OUTBOUND_SOLUTIONS_DB_URL!,
  process.env.OUTBOUND_SOLUTIONS_DB_SERVICE_KEY!
);

const authDb = createClient(
  process.env.AUTH_DB_URL!,
  process.env.AUTH_DB_SERVICE_KEY!
);

// GET /api/email-accounts - fetch all email accounts for user's org
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user } = await authDb
    .from("user")
    .select("organizationId")
    .eq("id", session.user.id)
    .single();

  if (!user?.organizationId) {
    return NextResponse.json({ error: "No organization found" }, { status: 401 });
  }

  const { data: accounts, error } = await customersDb
    .schema("product")
    .from("email_accounts")
    .select("*")
    .eq("org_id", user.organizationId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(accounts);
}
