import { prisma } from '@/lib/prisma'
import type { EmailType, FollowupStatus, LeadStatus, TemplateType } from '@prisma/client'
import { sendTemplateEmail } from '@/lib/resend'

const STOP_STATUSES: LeadStatus[] = ['replied', 'interested', 'closed', 'ignored']

export async function hasPendingFollowup(leadId: string, templateId: string): Promise<boolean> {
  const existing = await prisma.followupQueue.findFirst({
    where: {
      leadId,
      templateId,
      status: { in: ['pending', 'processing'] },
    },
  })
  return !!existing
}

export async function scheduleFollowup(
  leadId: string,
  templateType: TemplateType,
  daysOffset = 0
): Promise<void> {
  const template = await prisma.template.findFirst({
    where: { type: templateType, isActive: true },
  })

  if (!template) {
    console.error(`No active template found for type: ${templateType}`)
    return
  }

  if (await hasPendingFollowup(leadId, template.id)) {
    return
  }

  const scheduledAt = new Date()
  if (daysOffset > 0) {
    scheduledAt.setDate(scheduledAt.getDate() + daysOffset)
  }

  await prisma.followupQueue.create({
    data: {
      leadId,
      templateId: template.id,
      scheduledAt,
      status: 'pending',
      sequenceStep: templateType === 'initial' ? 0 : templateType === 'followup1' ? 1 : 2,
    },
  })

  await prisma.activity.create({
    data: {
      leadId,
      type: 'followup_scheduled',
      description: `Scheduled ${templateType} email for ${scheduledAt.toISOString()}`,
    },
  })
}

export async function scheduleInitialOutreach(leadId: string): Promise<void> {
  await scheduleFollowup(leadId, 'initial', 0)
}

export async function scheduleFollowup1(leadId: string): Promise<void> {
  const settings = await prisma.settings.findFirst()
  await scheduleFollowup(leadId, 'followup1', settings?.followupDay1 || 7)
}

export async function scheduleFollowup2(leadId: string): Promise<void> {
  const settings = await prisma.settings.findFirst()
  await scheduleFollowup(leadId, 'followup2', settings?.followupDay2 || 14)
}

export async function cancelPendingFollowups(leadId: string, reason: string): Promise<number> {
  const result = await prisma.followupQueue.updateMany({
    where: { leadId, status: { in: ['pending', 'processing'] } },
    data: { status: 'cancelled' },
  })

  if (result.count > 0) {
    await prisma.activity.create({
      data: {
        leadId,
        type: 'followup_cancelled',
        description: reason,
      },
    })
  }

  return result.count
}

function mapTemplateTypeToEmailType(type: TemplateType): EmailType {
  switch (type) {
    case 'initial':
      return 'initial'
    case 'followup1':
      return 'followup1'
    case 'followup2':
      return 'followup2'
    case 'notification':
      return 'notification'
    default:
      return 'manual'
  }
}

function mapTemplateTypeToLeadStatus(type: TemplateType): LeadStatus {
  switch (type) {
    case 'initial':
      return 'contacted'
    case 'followup1':
      return 'followup1'
    case 'followup2':
      return 'followup2'
    default:
      return 'contacted'
  }
}

async function getDailySentCount(): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return prisma.emailLog.count({
    where: {
      status: { in: ['sent', 'delivered'] },
      sentAt: { gte: today },
    },
  })
}

async function claimFollowupJob(followupId: string): Promise<boolean> {
  const lockExpiry = new Date(Date.now() - 5 * 60 * 1000)

  const result = await prisma.followupQueue.updateMany({
    where: {
      id: followupId,
      status: 'pending',
      OR: [{ lockedAt: null }, { lockedAt: { lt: lockExpiry } }],
    },
    data: {
      status: 'processing',
      lockedAt: new Date(),
    },
  })

  return result.count > 0
}

export async function processFollowupQueue(): Promise<{
  processed: number
  errors: number
  cancelled: number
  skipped: number
}> {
  const now = new Date()
  const settings = await prisma.settings.findFirst()
  const dailyLimit = settings?.dailySendLimit || 100
  const delayMs = settings?.emailDelayMs || 5000

  let dailySent = await getDailySentCount()
  let processed = 0
  let errors = 0
  let cancelled = 0
  let skipped = 0

  const pendingFollowups = await prisma.followupQueue.findMany({
    where: {
      status: 'pending',
      scheduledAt: { lte: now },
    },
    include: {
      lead: true,
      template: true,
    },
    orderBy: { scheduledAt: 'asc' },
    take: 50,
  })

  for (const followup of pendingFollowups) {
    if (dailySent >= dailyLimit) {
      skipped++
      continue
    }

    const lead = followup.lead

    if (
      STOP_STATUSES.includes(lead.status) ||
      lead.unsubscribed ||
      lead.bounced
    ) {
      await prisma.followupQueue.update({
        where: { id: followup.id },
        data: { status: 'cancelled' },
      })
      cancelled++
      continue
    }

    const claimed = await claimFollowupJob(followup.id)
    if (!claimed) {
      skipped++
      continue
    }

    try {
      const emailType = mapTemplateTypeToEmailType(followup.template.type)
      await sendTemplateEmail(followup.leadId, followup.templateId, emailType, true)

      const newStatus = mapTemplateTypeToLeadStatus(followup.template.type)

      await prisma.$transaction([
        prisma.followupQueue.update({
          where: { id: followup.id },
          data: { status: 'sent', sentAt: new Date(), lockedAt: null },
        }),
        prisma.lead.update({
          where: { id: followup.leadId },
          data: { status: newStatus, lastContacted: new Date() },
        }),
        prisma.activity.create({
          data: {
            leadId: followup.leadId,
            type: 'followup_sent',
            description: `Sent ${followup.template.type} email`,
          },
        }),
      ])

      if (followup.template.type === 'initial') {
        await scheduleFollowup1(followup.leadId)
      } else if (followup.template.type === 'followup1') {
        await scheduleFollowup2(followup.leadId)
      }

      processed++
      dailySent++

      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    } catch (error) {
      const attemptCount = followup.attemptCount + 1
      const maxRetries = 3

      await prisma.followupQueue.update({
        where: { id: followup.id },
        data: {
          status: attemptCount >= maxRetries ? 'failed' : 'pending',
          attemptCount,
          lockedAt: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })
      errors++
    }
  }

  return { processed, errors, cancelled, skipped }
}

export async function handleLeadReply(
  leadId: string,
  replyPreview: string,
  replyType: 'human' | 'out_of_office' | 'bounce' | 'spam_block' | 'unsubscribe' = 'human',
  emailLogId?: string
): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) return

  const isStopFollowup =
    replyType === 'human' ||
    replyType === 'bounce' ||
    replyType === 'spam_block' ||
    replyType === 'unsubscribe'

  if (isStopFollowup) {
    await cancelPendingFollowups(leadId, `Follow-ups cancelled due to ${replyType} reply`)
  }

  const updateData: Record<string, unknown> = {}

  if (replyType === 'human') {
    updateData.status = 'replied'
  } else if (replyType === 'unsubscribe') {
    updateData.unsubscribed = true
    updateData.status = 'ignored'
  } else if (replyType === 'bounce') {
    updateData.bounced = true
    updateData.status = 'ignored'
  } else if (replyType === 'spam_block') {
    updateData.status = 'ignored'
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.lead.update({ where: { id: leadId }, data: updateData })
  }

  if (emailLogId) {
    await prisma.emailLog.update({
      where: { id: emailLogId },
      data: { repliedAt: new Date(), replyType },
    })
  }

  await prisma.activity.create({
    data: {
      leadId,
      type: replyType === 'bounce' ? 'email_bounced' : 'email_received',
      description:
        replyType === 'human'
          ? 'Lead replied to email'
          : `${replyType.replace(/_/g, ' ')} detected`,
      metadata: JSON.stringify({ replyPreview, replyType }),
    },
  })

  if (replyType === 'human') {
    const { sendNotificationEmail } = await import('@/lib/resend')
    await sendNotificationEmail(lead.name, lead.company || '', lead.email, replyPreview)
  }

  const { recalculateLeadEngagement } = await import('@/lib/services/engagement')
  await recalculateLeadEngagement(leadId)
}
