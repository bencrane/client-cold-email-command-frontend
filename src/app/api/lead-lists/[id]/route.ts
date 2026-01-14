// src/app/api/lead-lists/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@/lib/auth'

const supabase = createClient(
  process.env.CUSTOMERS_DB_URL!,
  process.env.CUSTOMERS_DB_SERVICE_KEY!
)

// GET /api/lead-lists/[id] - Get single list with members
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({ route: '/api/lead-lists/[id]', id: params.id, status: 'ok' })

  /*
  const session = await auth()
  if (!session?.user?.org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params

  // Get list
  const { data: list, error: listError } = await supabase
    .from('lead_lists')
    .select('*')
    .eq('id', id)
    .eq('org_id', session.user.org_id)
    .single()

  if (listError || !list) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 })
  }

  // Get members with lead details
  const { data: members, error: membersError } = await supabase
    .from('lead_list_members')
    .select('lead_id, added_at')
    .eq('lead_list_id', id)

  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 })
  }

  // Get lead details for members
  const leadIds = members.map(m => m.lead_id)

  let leads: any[] = []
  if (leadIds.length > 0) {
    const { data: leadsData, error: leadsError } = await supabase
      .from('org_leads')
      .select('*')
      .in('id', leadIds)
      .eq('org_id', session.user.org_id)

    if (!leadsError && leadsData) {
      leads = leadsData
    }
  }

  return NextResponse.json({
    list: {
      ...list,
      member_count: members.length,
      leads
    }
  })
  */
}

// PATCH /api/lead-lists/[id] - Update list name/description
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params
  const body = await request.json()
  const { name, description } = body

  // Build update object
  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (name !== undefined) updates.name = name.trim()
  if (description !== undefined) updates.description = description?.trim() || null

  const { data, error } = await supabase
    .from('lead_lists')
    .update(updates)
    .eq('id', id)
    .eq('org_id', session.user.org_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 })
  }

  return NextResponse.json({ list: data })
}

// DELETE /api/lead-lists/[id] - Delete a list
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params

  const { error } = await supabase
    .from('lead_lists')
    .delete()
    .eq('id', id)
    .eq('org_id', session.user.org_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
