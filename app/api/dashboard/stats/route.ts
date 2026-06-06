import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGlobalEngagementStats } from '@/lib/services/engagement'
import { handleApiError } from '@/lib/errors'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [
      totalLeads,
      newLeads,
      contactedLeads,
      repliedLeads,
      interestedLeads,
      emailsSentToday,
      pendingFollowups,
      failedEmails,
      recentActivities,
      engagement,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { status: 'new' } }),
      prisma.lead.count({ where: { status: 'contacted' } }),
      prisma.lead.count({ where: { status: 'replied' } }),
      prisma.lead.count({ where: { status: 'interested' } }),
      prisma.emailLog.count({
        where: { status: { in: ['sent', 'delivered'] }, sentAt: { gte: today } },
      }),
      prisma.followupQueue.count({
        where: { status: 'pending', scheduledAt: { lte: new Date() } },
      }),
      prisma.emailLog.count({ where: { status: 'failed' } }),
      prisma.activity.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { lead: { select: { name: true, email: true } } },
      }),
      getGlobalEngagementStats(),
    ])

    const conversionRate =
      totalLeads > 0 ? ((interestedLeads / totalLeads) * 100).toFixed(2) : '0'

    return NextResponse.json({
      totalLeads,
      newLeads,
      contactedLeads,
      repliedLeads,
      interestedLeads,
      conversionRate,
      emailsSentToday,
      pendingFollowups,
      failedEmails,
      recentActivities,
      engagement,
    })
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
