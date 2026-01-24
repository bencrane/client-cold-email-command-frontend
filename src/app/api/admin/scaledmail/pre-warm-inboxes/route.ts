import { NextResponse } from 'next/server'
import { getScaledMailClient, ScaledMailError } from '@/lib/scaledmail'

// GET /api/admin/scaledmail/pre-warm-inboxes
// Proxy to ScaledMail GET /pre-warm-inboxes
export async function GET() {
  try {
    const scaledmail = getScaledMailClient()
    const inboxes = await scaledmail.getPreWarmInboxes()
    return NextResponse.json(inboxes)
  } catch (err) {
    const error = err as ScaledMailError
    console.error('ScaledMail pre-warm inboxes fetch failed:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pre-warm inboxes' },
      { status: error.statusCode || 500 }
    )
  }
}
