import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendTemplateEmail } from '@/lib/resend'
import { scheduleFollowup1 } from '@/lib/automation'
import { handleApiError } from '@/lib/errors'

const PRESERVE_STATUSES = ['replied', 'interested', 'closed', 'ignored']

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

    let templateId: string | null = null
    try {
      const body = await request.json()
      templateId = body.templateId || null
    } catch {
      // No body — use initial template
    }

    const lead = await prisma.lead.findUnique({ where: { id } })
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    if (lead.unsubscribed || lead.bounced) {
      return NextResponse.json(
        { error: 'Cannot send to unsubscribed or bounced lead' },
        { status: 400 }
      )
    }

    const isInitialSend = !templateId

    if (templateId) {
      await sendTemplateEmail(id, templateId, 'manual', true)
    } else {
      const initialTemplate = await prisma.template.findFirst({
        where: { type: 'initial', isActive: true },
      })

      if (!initialTemplate) {
        return NextResponse.json(
          { error: 'No initial template found. Create an initial template first.' },
          { status: 400 }
        )
      }

      await sendTemplateEmail(id, initialTemplate.id, 'initial', true)
      await scheduleFollowup1(id)
    }

    if (isInitialSend && !PRESERVE_STATUSES.includes(lead.status)) {
      await prisma.lead.update({
        where: { id },
        data: { status: 'contacted', lastContacted: new Date() },
      })
    }

    await prisma.activity.create({
      data: {
        leadId: id,
        type: 'email_sent',
        description: 'Manual email sent',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
