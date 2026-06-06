import { prisma } from '@/lib/prisma'

export interface EngagementMetrics {
  openRate: number
  clickRate: number
  replyRate: number
  bounceRate: number
  engagementScore: number
}

export async function recalculateLeadEngagement(leadId: string): Promise<EngagementMetrics> {
  const [lead, emailLogs] = await Promise.all([
    prisma.lead.findUnique({ where: { id: leadId } }),
    prisma.emailLog.findMany({
      where: { leadId, status: { in: ['sent', 'delivered'] } },
      select: {
        openCount: true,
        clickCount: true,
        replyType: true,
        status: true,
      },
    }),
  ])

  if (!lead) {
    return { openRate: 0, clickRate: 0, replyRate: 0, bounceRate: 0, engagementScore: 0 }
  }

  const sent = emailLogs.length || lead.emailsSent
  const opened = emailLogs.filter((e) => e.openCount > 0).length
  const clicked = emailLogs.filter((e) => e.clickCount > 0).length
  const replied = emailLogs.filter((e) => e.replyType === 'human').length
  const bounced = emailLogs.filter((e) => e.status === 'bounced').length

  const openRate = sent > 0 ? (opened / sent) * 100 : 0
  const clickRate = sent > 0 ? (clicked / sent) * 100 : 0
  const replyRate = sent > 0 ? (replied / sent) * 100 : 0
  const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0

  const engagementScore = Math.min(
    100,
    openRate * 0.3 + clickRate * 0.3 + replyRate * 0.4 - bounceRate * 0.5
  )

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      emailsSent: sent,
      emailsOpened: opened,
      emailsClicked: clicked,
      emailsReplied: replied,
      engagementScore: Math.round(engagementScore * 100) / 100,
    },
  })

  return {
    openRate: Math.round(openRate * 100) / 100,
    clickRate: Math.round(clickRate * 100) / 100,
    replyRate: Math.round(replyRate * 100) / 100,
    bounceRate: Math.round(bounceRate * 100) / 100,
    engagementScore: Math.round(engagementScore * 100) / 100,
  }
}

export async function getGlobalEngagementStats() {
  const [totalLeads, totalSent, totalOpened, totalClicked, totalReplied, totalBounced, unsubscribed] =
    await Promise.all([
      prisma.lead.count(),
      prisma.emailLog.count({ where: { status: { in: ['sent', 'delivered'] } } }),
      prisma.emailLog.count({ where: { openCount: { gt: 0 } } }),
      prisma.emailLog.count({ where: { clickCount: { gt: 0 } } }),
      prisma.lead.count({ where: { status: 'replied' } }),
      prisma.emailLog.count({ where: { status: 'bounced' } }),
      prisma.lead.count({ where: { unsubscribed: true } }),
    ])

  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0'
  const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : '0'
  const replyRate = totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : '0'
  const bounceRate = totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(1) : '0'

  return {
    totalLeads,
    totalSent,
    totalOpened,
    totalClicked,
    totalReplied,
    totalBounced,
    unsubscribed,
    openRate,
    clickRate,
    replyRate,
    bounceRate,
    interestedLeads: await prisma.lead.count({ where: { status: 'interested' } }),
  }
}
