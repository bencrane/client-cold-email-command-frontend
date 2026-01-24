// src/app/api/lead-lists/[id]/members/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@/lib/auth'

const supabase = createClient(
  process.env.OUTBOUND_SOLUTIONS_DB_URL!,
  process.env.OUTBOUND_SOLUTIONS_DB_SERVICE_KEY!
)

// Helper: verify list belongs to user's org
async function verifyListOwnership(listId: string, orgId: string) {
  const { data } = await supabase
    .schema('product')
    .from('lead_lists')
    .select('id')
    .eq('id', listId)
    .eq('org_id', orgId)
    .single()

  return !!data
}

// GET /api/lead-lists/[id]/members - Get all members of a list
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const authDb = createClient(
      process.env.AUTH_DB_URL!,
      process.env.AUTH_DB_SERVICE_KEY!
    )
    const { data: user } = await authDb
      .from('user')
      .select('organizationId')
      .eq('id', session.user.id)
      .single()

    if (!user?.organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const isOwner = await verifyListOwnership(id, user.organizationId)
    if (!isOwner) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    // Get members with lead details
    const { data: members, error } = await supabase
      .schema('product')
      .from('lead_list_members')
      .select(`
        lead_id,
        added_at,
        org_leads (
          id,
          first_name,
          last_name,
          full_name,
          linkedin_url,
          latest_title,
          latest_company,
          latest_company_domain
        )
      `)
      .eq('lead_list_id', id)
      .order('added_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform to flatten lead data
    const leads = members.map(m => ({
      id: m.lead_id,
      added_at: m.added_at,
      ...m.org_leads
    }))

    return NextResponse.json({ leads, total: leads.length })
  } catch (error) {
    console.error('Error fetching list members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/lead-lists/[id]/members - Add leads to list
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { lead_ids } = body

  if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
    return NextResponse.json({ error: 'lead_ids array required' }, { status: 400 })
  }

  // Verify ownership
  const isOwner = await verifyListOwnership(id, session.user.org_id)
  if (!isOwner) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 })
  }

  // Verify leads belong to org
  const { data: validLeads } = await supabase
    .from('org_leads')
    .select('id')
    .in('id', lead_ids)
    .eq('org_id', session.user.org_id)

  const validLeadIds = validLeads?.map(l => l.id) || []

  if (validLeadIds.length === 0) {
    return NextResponse.json({ error: 'No valid leads found' }, { status: 400 })
  }

  // Insert members (upsert to handle duplicates)
  const members = validLeadIds.map(lead_id => ({
    lead_list_id: id,
    lead_id
  }))

  const { error } = await supabase
    .from('lead_list_members')
    .upsert(members, {
      onConflict: 'lead_list_id,lead_id',
      ignoreDuplicates: true
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update list timestamp
  await supabase
    .from('lead_lists')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({
    success: true,
    added: validLeadIds.length,
    skipped: lead_ids.length - validLeadIds.length
  }, { status: 201 })
}

// DELETE /api/lead-lists/[id]/members - Remove leads from list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { lead_ids } = body

  if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
    return NextResponse.json({ error: 'lead_ids array required' }, { status: 400 })
  }

  // Verify ownership
  const isOwner = await verifyListOwnership(id, session.user.org_id)
  if (!isOwner) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 })
  }

  // Delete members
  const { error } = await supabase
    .from('lead_list_members')
    .delete()
    .eq('lead_list_id', id)
    .in('lead_id', lead_ids)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update list timestamp
  await supabase
    .from('lead_lists')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ success: true, removed: lead_ids.length })
}
