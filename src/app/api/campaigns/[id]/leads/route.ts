// src/app/api/campaigns/[id]/leads/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

const customersDb = createClient(
  process.env.CUSTOMERS_DB_URL!,
  process.env.CUSTOMERS_DB_SERVICE_KEY!
)

const authDb = createClient(
  process.env.AUTH_DB_URL!,
  process.env.AUTH_DB_SERVICE_KEY!
)

// Helper to get organization ID from session
async function getOrganizationId(): Promise<string | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return null
  }

  const { data: user } = await authDb
    .from('user')
    .select('organizationId')
    .eq('id', session.user.id)
    .single()

  return user?.organizationId || null
}

// Helper to verify campaign belongs to org
async function verifyCampaignOwnership(campaignId: string, orgId: string) {
  const { data } = await customersDb
    .schema('product')
    .from('campaigns')
    .select('id')
    .eq('id', campaignId)
    .eq('org_id', orgId)
    .single()

  return !!data
}

// GET /api/campaigns/[id]/leads - Get all leads in a campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organizationId = await getOrganizationId()
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: campaignId } = await params

    // Verify campaign belongs to org
    const isOwner = await verifyCampaignOwnership(campaignId, organizationId)
    if (!isOwner) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Get campaign leads
    const { data: campaignLeads, error } = await customersDb
      .schema('product')
      .from('campaign_leads')
      .select('lead_id, added_at')
      .eq('campaign_id', campaignId)
      .order('added_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!campaignLeads || campaignLeads.length === 0) {
      return NextResponse.json({ leads: [], total: 0 })
    }

    // Get lead details separately
    const leadIds = campaignLeads.map(cl => cl.lead_id)
    const { data: orgLeads, error: leadsError } = await customersDb
      .schema('product')
      .from('org_leads')
      .select('id, first_name, last_name, full_name, linkedin_url, latest_title, latest_company, latest_company_domain')
      .in('id', leadIds)

    if (leadsError) {
      return NextResponse.json({ error: leadsError.message }, { status: 500 })
    }

    // Create a map for quick lookup
    const leadsMap = new Map(orgLeads?.map(l => [l.id, l]) || [])

    // Transform to flatten lead data
    const leads = campaignLeads.map(cl => ({
      lead_id: cl.lead_id,
      added_at: cl.added_at,
      ...(leadsMap.get(cl.lead_id) || {})
    }))

    return NextResponse.json({ leads, total: leads.length })
  } catch (error) {
    console.error('Error fetching campaign leads:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/campaigns/[id]/leads - Add leads to campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organizationId = await getOrganizationId()
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: campaignId } = await params
    const body = await request.json()
    const { lead_ids } = body

    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return NextResponse.json({ error: 'lead_ids array required' }, { status: 400 })
    }

    // Verify campaign belongs to org
    const isOwner = await verifyCampaignOwnership(campaignId, organizationId)
    if (!isOwner) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Verify leads belong to org
    const { data: validLeads } = await customersDb
      .schema('product')
      .from('org_leads')
      .select('id')
      .in('id', lead_ids)
      .eq('org_id', organizationId)

    const validLeadIds = validLeads?.map(l => l.id) || []

    if (validLeadIds.length === 0) {
      return NextResponse.json({ error: 'No valid leads found' }, { status: 400 })
    }

    // Insert campaign leads (upsert to handle duplicates)
    const campaignLeads = validLeadIds.map(lead_id => ({
      campaign_id: campaignId,
      lead_id
    }))

    const { error } = await customersDb
      .schema('product')
      .from('campaign_leads')
      .upsert(campaignLeads, {
        onConflict: 'campaign_id,lead_id',
        ignoreDuplicates: true
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update campaign timestamp
    await customersDb
      .schema('product')
      .from('campaigns')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', campaignId)

    return NextResponse.json({
      success: true,
      added: validLeadIds.length,
      skipped: lead_ids.length - validLeadIds.length
    }, { status: 201 })
  } catch (error) {
    console.error('Error adding leads to campaign:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/campaigns/[id]/leads - Remove leads from campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organizationId = await getOrganizationId()
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: campaignId } = await params
    const body = await request.json()
    const { lead_ids } = body

    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return NextResponse.json({ error: 'lead_ids array required' }, { status: 400 })
    }

    // Verify campaign belongs to org
    const isOwner = await verifyCampaignOwnership(campaignId, organizationId)
    if (!isOwner) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Delete campaign leads
    const { error } = await customersDb
      .schema('product')
      .from('campaign_leads')
      .delete()
      .eq('campaign_id', campaignId)
      .in('lead_id', lead_ids)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update campaign timestamp
    await customersDb
      .schema('product')
      .from('campaigns')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', campaignId)

    return NextResponse.json({ success: true, removed: lead_ids.length })
  } catch (error) {
    console.error('Error removing leads from campaign:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
