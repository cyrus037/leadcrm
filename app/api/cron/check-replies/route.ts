import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseReplyContent } from '@/lib/services/reply-parser'
import { handleLeadReply } from '@/lib/automation'

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let checked = 0
    let detected = 0

    const recentEmails = await prisma.emailLog.findMany({
      where: {
        status: { in: ['sent', 'delivered'] },
        repliedAt: null,
        sentAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      include: { lead: true },
      take: 100,
    })

    for (const emailLog of recentEmails) {
      checked++

      const lead = emailLog.lead
      if (!lead || lead.status === 'replied' || lead.unsubscribed || lead.bounced) {
        continue
      }

      const recentReplyActivity = await prisma.activity.findFirst({
        where: {
          leadId: lead.id,
          type: 'email_received',
          createdAt: { gte: emailLog.sentAt || emailLog.createdAt },
        },
      })

      if (recentReplyActivity) {
        const metadata = recentReplyActivity.metadata
          ? JSON.parse(recentReplyActivity.metadata)
          : {}
        const parsed = parseReplyContent('', metadata.replyPreview || recentReplyActivity.description)

        await handleLeadReply(lead.id, parsed.preview, parsed.type, emailLog.id)
        detected++
      }
    }

    return NextResponse.json({
      message: 'Reply check completed',
      checked,
      detected,
    })
  } catch (error) {
    console.error('Cron reply check error:', error)
    return NextResponse.json(
      { error: 'Reply check failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
