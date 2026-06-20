import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { paginationSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/errors'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    const { page, limit } = paginationSchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '50',
    })

    const where: any = leadId ? { leadId } : {}

    // Filter by businessId for non-super-admin users
    if (session.user.role !== 'SUPER_ADMIN' && session.user.businessId) {
      where.businessId = session.user.businessId
    }

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          lead: { select: { name: true, email: true } },
          template: { select: { name: true, subject: true } },
          openEvents: { orderBy: { openedAt: 'desc' }, take: 5 },
          clickEvents: { orderBy: { clickedAt: 'desc' }, take: 5 },
        },
      }),
      prisma.emailLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
