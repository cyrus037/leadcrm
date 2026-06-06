import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { templateCreateSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/errors'

const templateUpdateSchema = templateCreateSchema.partial()

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
    const template = await prisma.template.findUnique({
      where: { id },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
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
    const parsed = templateUpdateSchema.parse(await request.json())

    const template = await prisma.template.update({
      where: { id },
      data: {
        ...(parsed.name && { name: parsed.name }),
        ...(parsed.type && { type: parsed.type }),
        ...(parsed.subject && { subject: parsed.subject }),
        ...(parsed.htmlContent && { htmlContent: parsed.htmlContent }),
        ...(parsed.variables !== undefined && { variables: parsed.variables }),
        ...(parsed.isActive !== undefined && { isActive: parsed.isActive }),
      },
    })

    return NextResponse.json(template)
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
    const [emailLogCount, followupCount] = await Promise.all([
      prisma.emailLog.count({ where: { templateId: id } }),
      prisma.followupQueue.count({ where: { templateId: id } }),
    ])

    if (emailLogCount > 0 || followupCount > 0) {
      const template = await prisma.template.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({
        success: true,
        archived: true,
        template,
        message: 'Template is used by history or scheduled follow-ups, so it was archived.',
      })
    }

    await prisma.template.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
