// src/app/api/campaigns/[id]/route.ts

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

// Helper to get organization ID from session or impersonation
async function getOrganizationId(impersonateEmail?: string | null): Promise<string | null> {
  if (impersonateEmail) {
    const { data: impersonatedUser } = await authDb
      .from('user')
      .select('organizationId')
      .eq('email', impersonateEmail)
      .single()

    return impersonatedUser?.organizationId || null
  }

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

// GET /api/campaigns/[id] - Get single campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const impersonateEmail = searchParams.get('email')

    const organizationId = await getOrganizationId(impersonateEmail)

    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data: campaign, error } = await customersDb
      .schema('product')
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('org_id', organizationId)
      .single()

    if (error || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json({ campaign })
  } catch (error) {
    console.error('Error fetching campaign:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/campaigns/[id] - Update campaign
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const impersonateEmail = searchParams.get('email')

    const organizationId = await getOrganizationId(impersonateEmail)

    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, status, settings, smartlead_campaign_id } = body

    // Build update object
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name.trim()
    if (status !== undefined) updates.status = status
    if (settings !== undefined) updates.settings = settings
    if (smartlead_campaign_id !== undefined) updates.smartlead_campaign_id = smartlead_campaign_id

    const { data, error } = await customersDb
      .schema('product')
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .eq('org_id', organizationId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json({ campaign: data })
  } catch (error) {
    console.error('Error updating campaign:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/campaigns/[id] - Delete campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const impersonateEmail = searchParams.get('email')

    const organizationId = await getOrganizationId(impersonateEmail)

    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { error } = await customersDb
      .schema('product')
      .from('campaigns')
      .delete()
      .eq('id', id)
      .eq('org_id', organizationId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting campaign:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
