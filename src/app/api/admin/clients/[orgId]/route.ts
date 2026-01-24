import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const customersDb = createClient(
  process.env.OUTBOUND_SOLUTIONS_DB_URL!,
  process.env.OUTBOUND_SOLUTIONS_DB_SERVICE_KEY!
)

const authDb = createClient(
  process.env.AUTH_DB_URL!,
  process.env.AUTH_DB_SERVICE_KEY!
)

// GET /api/admin/clients/[orgId]
// Get org details with counts (users, email_accounts, campaigns, leads)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId is required' },
        { status: 400 }
      )
    }

    // Fetch organization details
    const { data: org, error: orgError } = await customersDb
      .from('organizations')
      .select('id, name, slug, domain, logo_url, website, industry, company_size, settings, created_at')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Fetch counts in parallel
    const [usersResult, emailAccountsResult, campaignsResult, leadsResult] = await Promise.all([
      // User count from auth-db
      authDb
        .from('user')
        .select('id', { count: 'exact', head: true })
        .eq('organizationId', orgId),

      // Email accounts count from product schema
      customersDb
        .schema('product')
        .from('email_accounts')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId),

      // Campaigns count from product schema
      customersDb
        .schema('product')
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId),

      // Leads count from product schema
      customersDb
        .schema('product')
        .from('org_leads')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId),
    ])

    // Get count of unconnected email accounts (smartlead_account_id is null)
    const { count: unconnectedCount } = await customersDb
      .schema('product')
      .from('email_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .is('smartlead_account_id', null)

    return NextResponse.json({
      organization: org,
      counts: {
        users: usersResult.count || 0,
        emailAccounts: emailAccountsResult.count || 0,
        campaigns: campaignsResult.count || 0,
        leads: leadsResult.count || 0,
        unconnectedEmailAccounts: unconnectedCount || 0,
      },
    })
  } catch (error) {
    console.error('Error in client detail API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
