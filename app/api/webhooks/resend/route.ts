import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleLeadReply } from '@/lib/automation'
import { recalculateLeadEngagement } from '@/lib/services/engagement'

interface ResendWebhookEvent {
  type: string
  data: {
    email_id?: string
    to?: string[]
    from?: string
    subject?: string
    // Fixed: Webhooks pass an object, but API calls use an array
    tags?: Record<string, string> | { name: string; value: string }[]
    bounce?: { message?: string }
  }
}

export async function POST(request: Request) {
  try {
    const payload: ResendWebhookEvent = await request.json()
    const eventType = payload.type
    const data = payload.data

    // Helper to safely extract tags regardless of Resend's internal format
    const getTagValue = (tags: typeof data.tags, key: string): string | undefined => {
      if (!tags) return undefined
      if (Array.isArray(tags)) {
        return tags.find((t) => t.name === key)?.value
      }
      return tags[key]
    }

    const trackingToken = getTagValue(data.tags, 'tracking_token')
    const leadId = getTagValue(data.tags, 'lead_id')

    let emailLog = trackingToken
      ? await prisma.emailLog.findUnique({ where: { trackingToken } })
      : null

    if (!emailLog && data.email_id) {
      emailLog = await prisma.emailLog.findFirst({
        where: { resendMessageId: data.email_id },
      })
    }

    switch (eventType) {
      case 'email.delivered':
        if (emailLog) {
          await prisma.emailLog.update({
            where: { id: emailLog.id },
            data: { status: 'delivered' },
          })
        }
        break

      case 'email.bounced':
      case 'email.complained':
        if (emailLog) {
          await prisma.emailLog.update({
            where: { id: emailLog.id },
            data: {
              status: 'bounced',
              bouncedAt: new Date(),
              replyType: 'bounce',
            },
          })

          await handleLeadReply(
            emailLog.leadId,
            data.bounce?.message || 'Email bounced',
            'bounce',
            emailLog.id
          )
        } else if (leadId) {
          await handleLeadReply(leadId, 'Email bounced', 'bounce')
        }
        break

      case 'email.opened':
        if (emailLog && emailLog.openCount === 0) {
          await prisma.emailLog.update({
            where: { id: emailLog.id },
            data: {
              openCount: { increment: 1 },
              firstOpenedAt: new Date(),
              lastOpenedAt: new Date(),
            },
          })
          await recalculateLeadEngagement(emailLog.leadId)
        }
        break

      case 'email.clicked':
        if (emailLog) {
          await prisma.emailLog.update({
            where: { id: emailLog.id },
            data: { clickCount: { increment: 1 } },
          })
          await recalculateLeadEngagement(emailLog.leadId)
        }
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Resend webhook error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}
