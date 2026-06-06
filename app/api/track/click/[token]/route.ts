import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClientIp } from '@/lib/services/tracking'
import { recalculateLeadEngagement } from '@/lib/services/engagement'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { searchParams } = new URL(request.url)
    const targetUrl = searchParams.get('url')

    if (!targetUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
    }

    let decodedUrl: string
    try {
      decodedUrl = decodeURIComponent(targetUrl)
      new URL(decodedUrl)
    } catch {
      return NextResponse.json({ error: 'Invalid url parameter' }, { status: 400 })
    }

    const userAgent = request.headers.get('user-agent')
    const ip = getClientIp(request)

    const emailLog = await prisma.emailLog.findUnique({
      where: { trackingToken: token },
    })

    if (emailLog) {
      await prisma.$transaction([
        prisma.emailClickEvent.create({
          data: {
            emailLogId: emailLog.id,
            originalUrl: decodedUrl,
            userAgent,
            ip,
          },
        }),
        prisma.emailLog.update({
          where: { id: emailLog.id },
          data: { clickCount: { increment: 1 } },
        }),
        prisma.activity.create({
          data: {
            leadId: emailLog.leadId,
            type: 'email_clicked',
            description: `Link clicked: ${decodedUrl}`,
            metadata: JSON.stringify({ url: decodedUrl, ip, userAgent }),
          },
        }),
      ])

      await recalculateLeadEngagement(emailLog.leadId)
    }

    return NextResponse.redirect(decodedUrl, 302)
  } catch (error) {
    console.error('Click tracking error:', error)
    const { searchParams } = new URL(request.url)
    const fallback = searchParams.get('url')
    if (fallback) {
      return NextResponse.redirect(decodeURIComponent(fallback), 302)
    }
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 })
  }
}
