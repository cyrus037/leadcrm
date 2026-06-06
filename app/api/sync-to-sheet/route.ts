import { NextResponse } from 'next/server'
import { syncLeadsToSheets } from '@/lib/google-sheets'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await syncLeadsToSheets()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error syncing leads to sheet:', error)
    return NextResponse.json(
      { error: 'Sync failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
