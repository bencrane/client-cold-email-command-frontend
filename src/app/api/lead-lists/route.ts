// src/app/api/lead-lists/route.ts

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
    // Look up user by email for impersonation
    const { data: impersonatedUser } = await authDb
      .from('user')
      .select('organizationId')
      .eq('email', impersonateEmail)
      .single()

    return impersonatedUser?.organizationId || null
  }

  // Normal flow - get session from better-auth
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

// GET /api/lead-lists - Get all lists for org
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const impersonateEmail = searchParams.get('email')

    const organizationId = await getOrganizationId(impersonateEmail)

    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await customersDb
      .schema('product')
      .from('lead_lists')
      .select(`
        id,
        name,
        description,
        created_at,
        updated_at,
        lead_list_members(count)
      `)
      .eq('org_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform to include member count
    const lists = data.map(list => ({
      ...list,
      member_count: list.lead_list_members?.[0]?.count || 0,
      lead_list_members: undefined
    }))

    return NextResponse.json({ lists })
  } catch (error) {
    console.error('Error fetching lead lists:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/lead-lists - Create a new list
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const impersonateEmail = searchParams.get('email')

    const organizationId = await getOrganizationId(impersonateEmail)

    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const { data, error } = await customersDb
      .schema('product')
      .from('lead_lists')
      .insert({
        org_id: organizationId,
        name: name.trim(),
        description: description?.trim() || null
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ list: data }, { status: 201 })
  } catch (error) {
    console.error('Error creating lead list:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
