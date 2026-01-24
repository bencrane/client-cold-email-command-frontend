import { NextRequest, NextResponse } from 'next/server'
import { getScaledMailClient, ScaledMailError } from '@/lib/scaledmail'

// GET /api/admin/scaledmail/mailboxes/[domainId]
// Proxy to ScaledMail GET /mailboxes/{domain_id}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domainId: string }> }
) {
  try {
    const { domainId } = await params

    if (!domainId) {
      return NextResponse.json(
        { error: 'domainId is required' },
        { status: 400 }
      )
    }

    const scaledmail = getScaledMailClient()
    const mailboxes = await scaledmail.getMailboxesByDomainId(domainId)
    return NextResponse.json(mailboxes)
  } catch (err) {
    const error = err as ScaledMailError
    console.error('ScaledMail mailboxes fetch failed:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch mailboxes' },
      { status: error.statusCode || 500 }
    )
  }
}
