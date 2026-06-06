import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTemplateEmail } from '@/lib/resend'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
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
    const { testEmail } = body

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Test email is required' },
        { status: 400 }
      )
    }

    const template = await prisma.template.findUnique({
      where: { id },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Create a temporary lead for testing
    const testLead = await prisma.lead.create({
      data: {
        email: testEmail,
        name: 'Test User',
        company: 'Test Company',
        status: 'new',
      },
    })

    await sendTemplateEmail(testLead.id, template.id, 'manual')

    // Clean up test lead
    await prisma.lead.delete({
      where: { id: testLead.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error testing template:', error)
    return NextResponse.json(
      { error: 'Failed to test template' },
      { status: 500 }
    )
  }
}
