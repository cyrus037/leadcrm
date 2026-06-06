import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { leadUpdateSchema } from '@/lib/validations'
import { cancelPendingFollowups } from '@/lib/automation'
import { handleApiError } from '@/lib/errors'

const STOP_STATUSES = ['replied', 'interested', 'closed', 'ignored']

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        emailLogs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            template: true,
            openEvents: { orderBy: { openedAt: 'desc' }, take: 10 },
            clickEvents: { orderBy: { clickedAt: 'desc' }, take: 10 },
          },
        },
        followupQueue: {
          orderBy: { scheduledAt: 'asc' },
          include: { template: true },
        },
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json(lead)
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = leadUpdateSchema.parse(body)

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...(parsed.status && { status: parsed.status }),
        ...(parsed.notes !== undefined && { notes: parsed.notes }),
        ...(parsed.tags !== undefined && { tags: parsed.tags }),
        ...(parsed.name && { name: parsed.name }),
        ...(parsed.company !== undefined && { company: parsed.company }),
      },
    })

    if (parsed.status) {
      await prisma.activity.create({
        data: {
          leadId: lead.id,
          type: 'status_change',
          description: `Status changed to ${parsed.status}`,
        },
      })

      if (STOP_STATUSES.includes(parsed.status)) {
        await cancelPendingFollowups(lead.id, `Follow-ups cancelled because status changed to ${parsed.status}`)
      }
    }

    return NextResponse.json(lead)
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const emailLogs = await prisma.emailLog.findMany({
      where: { leadId: id },
      select: { id: true },
    })
    const emailLogIds = emailLogs.map((log) => log.id)

    await prisma.$transaction([
      prisma.emailOpenEvent.deleteMany({
        where: { emailLogId: { in: emailLogIds } },
      }),
      prisma.emailClickEvent.deleteMany({
        where: { emailLogId: { in: emailLogIds } },
      }),
      prisma.emailLog.deleteMany({ where: { leadId: id } }),
      prisma.followupQueue.deleteMany({ where: { leadId: id } }),
      prisma.activity.deleteMany({ where: { leadId: id } }),
      prisma.lead.delete({ where: { id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
