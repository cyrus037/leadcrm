import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleLeadReply } from '@/lib/automation'
import {
  extractTrackingTokenFromContent,
} from '@/lib/services/tracking'
import { parseReplyContent } from '@/lib/services/reply-parser'

interface ResendInboundEmail {
  from: string
  to: string
  subject: string
  text?: string
  html?: string
  headers?: Record<string, string>
}

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
    if (webhookSecret) {
      const signature = request.headers.get('svix-signature') || request.headers.get('x-resend-signature')
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
      }
    }

    const payload = await request.json()
    const email: ResendInboundEmail = payload.data || payload

    if (!email?.from) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const fromEmail = extractEmailAddress(email.from)
    const subject = email.subject || ''
    const body = email.text || email.html || ''
    const threadToken =
      email.headers?.['x-lead-thread-token'] ||
      email.headers?.['X-Lead-Thread-Token'] ||
      extractTrackingTokenFromContent(body)

    let emailLog = threadToken
      ? await prisma.emailLog.findUnique({ where: { trackingToken: threadToken } })
      : null

    if (!emailLog) {
      emailLog = await prisma.emailLog.findFirst({
        where: {
          lead: { email: fromEmail },
          status: { in: ['sent', 'delivered'] },
        },
        orderBy: { sentAt: 'desc' },
      })
    }

    if (!emailLog) {
      const lead = await prisma.lead.findUnique({ where: { email: fromEmail } })
      if (!lead) {
        return NextResponse.json({ message: 'No matching lead found' })
      }

      const parsed = parseReplyContent(subject, body, fromEmail)
      if (parsed.isStopFollowup) {
        await handleLeadReply(lead.id, parsed.preview, parsed.type)
      }
      return NextResponse.json({ success: true, matchedBy: 'email' })
    }

    const parsed = parseReplyContent(subject, body, fromEmail)
    await handleLeadReply(emailLog.leadId, parsed.preview, parsed.type, emailLog.id)

    return NextResponse.json({ success: true, replyType: parsed.type })
  } catch (error) {
    console.error('Inbound webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

function extractEmailAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/)
  return (match?.[1] || raw).toLowerCase().trim()
}
