import { NextResponse } from 'next/server'
import { processFollowupQueue } from '@/lib/automation'

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await processFollowupQueue()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Cron followup error:', error)
    return NextResponse.json(
      { error: 'Followup processing failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
