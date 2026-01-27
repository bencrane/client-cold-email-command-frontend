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

// GET /api/inbox - fetch inbox messages for user's org
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Dev bypass for local development
  if (process.env.NODE_ENV === "development") {
    const devOrgId = process.env.DEV_ORG_ID;
    if (devOrgId) {
      return handleGetMessages(searchParams, devOrgId);
    }
  }

  const session = await auth.api.getSession({ headers: request.headers });
  console.log("1. Session user id:", session?.user?.id);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user, error: userError } = await authDb
    .from("user")
    .select("organizationId")
    .eq("id", session.user.id)
    .single();

  console.log("2. User query result:", user);
  console.log("3. User query error:", userError);

  if (!user?.organizationId) {
    return NextResponse.json({ error: "No organization found" }, { status: 401 });
  }

  return handleGetMessages(searchParams, user.organizationId);
}

async function handleGetMessages(searchParams: URLSearchParams, organizationId: string) {
  const status = searchParams.get("status"); // unread, read
  const category = searchParams.get("category"); // interested, bounced, etc.
  const direction = searchParams.get("direction"); // inbound, outbound
  const campaign_id = searchParams.get("campaign_id");
  const thread_id = searchParams.get("thread_id");
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  let query = customersDb
    .schema("product")
    .from("inbox_messages")
    .select("*")
    .eq("org_id", organizationId)
    .order("received_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  if (category) {
    query = query.eq("category", category);
  }

  if (direction) {
    query = query.eq("direction", direction);
  }

  if (campaign_id) {
    query = query.eq("smartlead_campaign_id", parseInt(campaign_id));
  }

  if (thread_id) {
    query = query.eq("thread_id", thread_id);
  }

  if (search) {
    query = query.or(`lead_email.ilike.%${search}%,lead_name.ilike.%${search}%,subject.ilike.%${search}%`);
  }

  const { data: messages, error } = await query;

  console.log("4. Messages query result count:", messages?.length);
  console.log("5. Messages query error:", error);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(messages);
}

// PATCH /api/inbox - update message (mark read, categorize)
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

  const { message_ids, status, category } = await request.json();

  if (!Array.isArray(message_ids) || message_ids.length === 0) {
    return NextResponse.json({ error: "message_ids required" }, { status: 400 });
  }

  const updates: Record<string, any> = {};
  if (status) updates.status = status;
  if (category) updates.category = category;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const { error } = await customersDb
    .schema("product")
    .from("inbox_messages")
    .update(updates)
    .eq("org_id", user.organizationId)
    .in("id", message_ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: message_ids.length });
}
