import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { templateCreateSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/errors'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const templates = await prisma.template.findMany({
      orderBy: { createdAt: 'desc' },
    }).catch((e) => {
      console.error('Error fetching templates:', e)
      return []
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching templates:', error)
    const errorMessage = error instanceof Error && error.message.includes('connect')
      ? 'Database connection failed. Please check your DATABASE_URL in .env'
      : 'Failed to fetch templates'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = templateCreateSchema.parse(await request.json())

    const template = await prisma.template.create({
      data: {
        name: parsed.name,
        type: parsed.type,
        subject: parsed.subject,
        htmlContent: parsed.htmlContent,
        variables: parsed.variables || ['name', 'email', 'company'],
        isActive: parsed.isActive ?? true,
      },
    })

    return NextResponse.json(template)
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
