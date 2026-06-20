import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleApiError } from '@/lib/errors'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const business = await prisma.business.findUnique({
      where: { id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, slug, resendApiKey, resendFromEmail, ownerEmail, isActive } = body

    const business = await prisma.business.update({
      where: { id },
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
        where: { businessId: id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await prisma.business.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
