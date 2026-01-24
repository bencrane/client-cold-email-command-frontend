import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const customersDb = createClient(
  process.env.OUTBOUND_SOLUTIONS_DB_URL!,
  process.env.OUTBOUND_SOLUTIONS_DB_SERVICE_KEY!
)

// GET /api/admin/clients/[orgId]/email-accounts
// Get email accounts for specific org
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

    const { data: accounts, error } = await customersDb
      .schema('product')
      .from('email_accounts')
      .select('id, email, sender_name, status, daily_limit, smartlead_account_id, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching email accounts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch email accounts' },
        { status: 500 }
      )
    }

    return NextResponse.json({ emailAccounts: accounts || [] })
  } catch (error) {
    console.error('Error in email accounts API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
