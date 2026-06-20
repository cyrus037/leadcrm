import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleApiError } from '@/lib/errors'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const business = await prisma.business.findUnique({
      where: { id: params.id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        },
        settings: true,
        _count: {
          select: {
            users: true,
            leads: true,
            templates: true,
            emailLogs: true,
          },
        },
      },
    })

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    return NextResponse.json(business)
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, slug, resendApiKey, resendFromEmail, ownerEmail, isActive } = body

    const business = await prisma.business.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(resendApiKey !== undefined && { resendApiKey }),
        ...(resendFromEmail !== undefined && { resendFromEmail }),
        ...(ownerEmail !== undefined && { ownerEmail }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    // Update settings if resend credentials changed
    if (resendApiKey !== undefined || resendFromEmail !== undefined || ownerEmail !== undefined) {
      await prisma.settings.updateMany({
        where: { businessId: params.id },
        data: {
          ...(resendApiKey !== undefined && { resendApiKey }),
          ...(resendFromEmail !== undefined && { resendFromEmail }),
          ...(ownerEmail !== undefined && { ownerEmail }),
        },
      })
    }

    return NextResponse.json(business)
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.business.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
