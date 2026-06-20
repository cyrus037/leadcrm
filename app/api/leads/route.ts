import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { leadCreateSchema, paginationSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/errors'
import { scheduleInitialOutreach } from '@/lib/automation'
import type { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const { page, limit } = paginationSchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '50',
    })

    const where: Prisma.LeadWhereInput = {}

    // Filter by businessId for non-super-admin users
    if (session.user.role !== 'SUPER_ADMIN' && session.user.businessId) {
      where.businessId = session.user.businessId
    }

    if (status && status !== 'all') {
      where.status = status as Prisma.LeadWhereInput['status']
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { dateAdded: 'desc' },
      }),
      prisma.lead.count({ where }),
    ])

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = leadCreateSchema.parse(body)

    // For non-super-admin users, assign lead to their business
    const businessId = session.user.role !== 'SUPER_ADMIN' ? session.user.businessId : null

    const lead = await prisma.lead.create({
      data: {
        email: parsed.email.toLowerCase().trim(),
        name: parsed.name,
        company: parsed.company,
        status: parsed.status || 'new',
        notes: parsed.notes,
        tags: parsed.tags || [],
        businessId,
      },
    })

    await prisma.activity.create({
      data: {
        leadId: lead.id,
        type: 'status_change',
        description: `Lead created with status: ${parsed.status || 'new'}`,
        businessId,
      },
    })

    if (parsed.status === 'new' || !parsed.status) {
      await scheduleInitialOutreach(lead.id)
    }

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
