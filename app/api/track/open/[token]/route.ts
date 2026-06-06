import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseUserAgent, getClientIp, TRACKING_PIXEL } from '@/lib/services/tracking'
import { recalculateLeadEngagement } from '@/lib/services/engagement'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const userAgent = request.headers.get('user-agent')
    const ip = getClientIp(request)
    const { deviceType, browser } = parseUserAgent(userAgent)

    const emailLog = await prisma.emailLog.findUnique({
      where: { trackingToken: token },
      include: { lead: true },
    })

    if (emailLog) {
      const isFirstOpen = emailLog.openCount === 0

      await prisma.$transaction([
        prisma.emailOpenEvent.create({
          data: {
            emailLogId: emailLog.id,
            userAgent,
            ip,
            deviceType,
            browser,
          },
        }),
        prisma.emailLog.update({
          where: { id: emailLog.id },
          data: {
            openCount: { increment: 1 },
            firstOpenedAt: isFirstOpen ? new Date() : emailLog.firstOpenedAt,
            lastOpenedAt: new Date(),
          },
        }),
        prisma.activity.create({
          data: {
            leadId: emailLog.leadId,
            type: 'email_opened',
            description: `Email opened (${browser} on ${deviceType})`,
            metadata: JSON.stringify({ ip, userAgent, deviceType, browser }),
          },
        }),
      ])

      await recalculateLeadEngagement(emailLog.leadId)
    }

    return new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error) {
    console.error('Open tracking error:', error)
    return new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: { 'Content-Type': 'image/gif' },
    })
  }
}
