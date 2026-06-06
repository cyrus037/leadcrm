import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

async function unsubscribe(token: string) {
  const emailLog = await prisma.emailLog.findUnique({
    where: { trackingToken: token },
    select: { id: true, leadId: true },
  })

  if (!emailLog) {
    return false
  }

  await prisma.$transaction([
    prisma.lead.update({
      where: { id: emailLog.leadId },
      data: { unsubscribed: true, status: 'ignored' },
    }),
    prisma.emailLog.update({
      where: { id: emailLog.id },
      data: { replyType: 'unsubscribe', repliedAt: new Date() },
    }),
    prisma.activity.create({
      data: {
        leadId: emailLog.leadId,
        type: 'unsubscribed',
        description: 'Lead unsubscribed from email follow-ups',
      },
    }),
  ])

  return true
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const success = await unsubscribe(token)

  return new NextResponse(
    success
      ? 'You have been unsubscribed from follow-up emails.'
      : 'This unsubscribe link is invalid or has expired.',
    {
      status: success ? 200 : 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    }
  )
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  await request.formData().catch(() => null)
  const success = await unsubscribe(token)

  return NextResponse.json(
    { success },
    { status: success ? 200 : 404 }
  )
}
