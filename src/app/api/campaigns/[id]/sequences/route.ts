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

// GET /api/campaigns/[id]/sequences - fetch all sequences for a campaign
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's organization
  const { data: user } = await authDb
    .from("user")
    .select("organizationId")
    .eq("id", session.user.id)
    .single();

  if (!user?.organizationId) {
    return NextResponse.json({ error: "No organization found" }, { status: 401 });
  }

  const organizationId = user.organizationId;
  const { id: campaignId } = await params;

  // Verify campaign belongs to org
  const { data: campaign, error: campaignError } = await customersDb
    .schema("product")
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("org_id", organizationId)
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Fetch sequences
  const { data: sequences, error } = await customersDb
    .schema("product")
    .from("campaign_sequences")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("seq_number", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(sequences);
}

// PUT /api/campaigns/[id]/sequences - replace all sequences for a campaign
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's organization
  const { data: user } = await authDb
    .from("user")
    .select("organizationId")
    .eq("id", session.user.id)
    .single();

  if (!user?.organizationId) {
    return NextResponse.json({ error: "No organization found" }, { status: 401 });
  }

  const organizationId = user.organizationId;
  const { id: campaignId } = await params;

  // Verify campaign belongs to org
  const { data: campaign, error: campaignError } = await customersDb
    .schema("product")
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("org_id", organizationId)
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const { sequences } = await request.json();

  if (!Array.isArray(sequences)) {
    return NextResponse.json({ error: "sequences must be an array" }, { status: 400 });
  }

  // Delete existing sequences
  const { error: deleteError } = await customersDb
    .schema("product")
    .from("campaign_sequences")
    .delete()
    .eq("campaign_id", campaignId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Insert new sequences if any
  if (sequences.length > 0) {
    const sequencesToInsert = sequences.map((seq: any, index: number) => ({
      campaign_id: campaignId,
      seq_number: index + 1,
      subject: seq.subject,
      body: seq.body,
      delay_days: seq.delay_days || 0,
    }));

    const { error: insertError } = await customersDb
      .schema("product")
      .from("campaign_sequences")
      .insert(sequencesToInsert);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  // Return updated sequences
  const { data: updatedSequences, error: fetchError } = await customersDb
    .schema("product")
    .from("campaign_sequences")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("seq_number", { ascending: true });

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  return NextResponse.json(updatedSequences);
}
