import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getScaledMailClient, ScaledMailError, ScaledMailDomainPurchase } from '@/lib/scaledmail'

const customersDb = createClient(
  process.env.OUTBOUND_SOLUTIONS_DB_URL!,
  process.env.OUTBOUND_SOLUTIONS_DB_SERVICE_KEY!
)

interface PurchaseRequestBody {
  domains: ScaledMailDomainPurchase[]
  orgId: string
  tag?: string
}

// POST /api/admin/scaledmail/purchase
// Buy pre-warm inboxes from ScaledMail, then save to product.email_accounts
export async function POST(request: NextRequest) {
  try {
    const body: PurchaseRequestBody = await request.json()
    const { domains, orgId, tag } = body

    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      return NextResponse.json(
        { error: 'domains array is required' },
        { status: 400 }
      )
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId is required' },
        { status: 400 }
      )
    }

    // Verify org exists
    const { data: org, error: orgError } = await customersDb
      .from('organizations')
      .select('id, name')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Call ScaledMail to purchase the inboxes
    const scaledmail = getScaledMailClient()
    let purchaseResult: unknown

    try {
      purchaseResult = await scaledmail.buyPreWarmInboxes(
        domains,
        tag || `client-${orgId}`
      )
    } catch (err) {
      const scaledmailError = err as ScaledMailError
      console.error('ScaledMail purchase failed:', scaledmailError)
      return NextResponse.json(
        { error: `ScaledMail purchase failed: ${scaledmailError.message}` },
        { status: scaledmailError.statusCode || 502 }
      )
    }

    // Create email_accounts records for each domain/mailbox purchased
    // Note: We create placeholder records since ScaledMail doesn't return
    // immediate mailbox details in the purchase response
    const emailAccountRecords = domains.map((domain) => ({
      org_id: orgId,
      email: `inbox@${domain.domain}`,
      sender_name: null,
      daily_limit: 50,
      status: 'provisioning',
      smartlead_account_id: null,
    }))

    const { data: insertedAccounts, error: insertError } = await customersDb
      .schema('product')
      .from('email_accounts')
      .insert(emailAccountRecords)
      .select()

    if (insertError) {
      console.error('Failed to save email accounts after ScaledMail purchase:', insertError)
      return NextResponse.json(
        {
          error: 'Purchase succeeded in ScaledMail but failed to save locally',
          scaledmailResult: purchaseResult,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      scaledmailResult: purchaseResult,
      emailAccounts: insertedAccounts,
    })
  } catch (error) {
    console.error('Error in purchase API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
