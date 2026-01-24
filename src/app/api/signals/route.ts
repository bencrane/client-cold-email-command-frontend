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

// GET /api/signals - fetch signals for user's org
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

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");
  const type = searchParams.get("type");
  const unread_only = searchParams.get("unread_only") === "true";

  let query = customersDb
    .schema("product")
    .from("signals_feed")
    .select("*")
    .eq("org_id", user.organizationId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type && type !== "all") {
    query = query.eq("signal_type", type);
  }

  if (unread_only) {
    query = query.eq("is_read", false);
  }

  const { data: signals, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(signals);
}

// PATCH /api/signals - mark signal(s) as read
export async function PATCH(request: Request) {
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

  const { signal_ids, mark_all } = await request.json();

  if (mark_all) {
    // Mark all signals as read for this org
    const { error } = await customersDb
      .schema("product")
      .from("signals_feed")
      .update({ is_read: true })
      .eq("org_id", user.organizationId)
      .eq("is_read", false);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, marked_all: true });
  }

  if (!Array.isArray(signal_ids) || signal_ids.length === 0) {
    return NextResponse.json({ error: "signal_ids required" }, { status: 400 });
  }

  const { error } = await customersDb
    .schema("product")
    .from("signals_feed")
    .update({ is_read: true })
    .eq("org_id", user.organizationId)
    .in("id", signal_ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, updated: signal_ids.length });
}
