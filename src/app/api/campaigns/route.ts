// src/app/api/campaigns/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getSmartLeadClient, SmartLeadError } from '@/lib/smartlead'

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

// GET /api/campaigns - Get all campaigns for org
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
      .from('campaigns')
      .select('*')
      .eq('org_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ campaigns: data })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/campaigns - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const impersonateEmail = searchParams.get('email')

    const organizationId = await getOrganizationId(impersonateEmail)

    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const trimmedName = name.trim()

    // First, create the campaign in SmartLead
    let smartleadCampaignId: number
    try {
      const smartlead = getSmartLeadClient()
      const smartleadCampaign = await smartlead.createCampaign(trimmedName)
      smartleadCampaignId = smartleadCampaign.id
    } catch (err) {
      const smartleadError = err as SmartLeadError
      console.error('SmartLead campaign creation failed:', smartleadError)
      return NextResponse.json(
        { error: `Failed to create campaign in SmartLead: ${smartleadError.message}` },
        { status: smartleadError.statusCode || 502 }
      )
    }

    // SmartLead succeeded, now create local record with the SmartLead ID
    const { data, error } = await customersDb
      .schema('product')
      .from('campaigns')
      .insert({
        org_id: organizationId,
        name: trimmedName,
        status: 'draft',
        settings: {},
        smartlead_campaign_id: smartleadCampaignId
      })
      .select()
      .single()

    if (error) {
      // Local DB insert failed after SmartLead succeeded
      // Log this for manual cleanup but don't expose internal details
      console.error('Database insert failed after SmartLead campaign created:', {
        smartleadCampaignId,
        dbError: error.message
      })
      return NextResponse.json(
        { error: 'Campaign created in SmartLead but failed to save locally. Please contact support.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ campaign: data }, { status: 201 })
  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
