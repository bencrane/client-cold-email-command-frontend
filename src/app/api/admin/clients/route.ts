import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const customersDb = createClient(
  process.env.OUTBOUND_SOLUTIONS_DB_URL!,
  process.env.OUTBOUND_SOLUTIONS_DB_SERVICE_KEY!
)

// GET /api/admin/clients
// List all organizations from customers-db
export async function GET() {
  try {
    const { data: organizations, error } = await customersDb
      .from('organizations')
      .select('id, name, slug, domain, industry, company_size, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching organizations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch organizations' },
        { status: 500 }
      )
    }

    return NextResponse.json({ organizations: organizations || [] })
  } catch (error) {
    console.error('Error in clients API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
