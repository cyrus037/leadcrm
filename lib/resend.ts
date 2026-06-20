import { Resend } from 'resend'
import { prisma } from './prisma'
import { sleep, replaceVariables } from './utils'
import {
  generateTrackingToken,
  prepareTrackedHtml,
} from './services/tracking'
import type { EmailType } from '@prisma/client'
import { getAppUrl } from './env'

const FROM_EMAIL_FALLBACK = 'info@growphone.in'

function getResendClient(apiKey?: string): Resend {
  const key = apiKey || process.env.RESEND_API_KEY
  if (!key) {
    throw new Error('RESEND_API_KEY is not configured')
  }
  return new Resend(key)
}

function isEmailTrackingEnabled(): boolean {
  return process.env.EMAIL_TRACKING_ENABLED === 'true'
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function appendUnsubscribeFooter(html: string, unsubscribeUrl: string): string {
  if (html.includes(unsubscribeUrl)) return html

  const footer = `
    <p style="margin-top:24px;font-size:12px;line-height:18px;color:#64748b;">
      If you do not want to receive follow-up emails, you can
      <a href="${unsubscribeUrl}" style="color:#475569;">unsubscribe here</a>.
    </p>
  `

  if (html.includes('</body>')) {
    return html.replace('</body>', `${footer}</body>`)
  }
  return `${html}${footer}`
}

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  leadId: string
  templateId: string
  type: EmailType
  trackingToken?: string
  threadId?: string
  businessId?: string | null
  resendApiKey?: string | null
  resendFromEmail?: string | null
}

export async function sendEmailWithTracking(options: SendEmailOptions): Promise<string> {
  const resend = getResendClient(options.resendApiKey || undefined)
  const trackingToken = options.trackingToken || generateTrackingToken()
  const threadId = options.threadId || trackingToken
  const appUrl = getAppUrl()
  const unsubscribeUrl = `${appUrl}/api/unsubscribe/${trackingToken}`
  const htmlWithUnsubscribe = appendUnsubscribeFooter(options.html, unsubscribeUrl)
  const trackedHtml = prepareTrackedHtml(
    htmlWithUnsubscribe,
    trackingToken,
    isEmailTrackingEnabled()
  )
  const fromEmail = options.resendFromEmail || process.env.RESEND_FROM_EMAIL || FROM_EMAIL_FALLBACK
  const text = `${stripHtmlToText(htmlWithUnsubscribe)}\n\nUnsubscribe: ${unsubscribeUrl}`

  const emailLog = await prisma.emailLog.create({
    data: {
      leadId: options.leadId,
      templateId: options.templateId,
      type: options.type,
      status: 'pending',
      trackingToken,
      threadId,
      subject: options.subject,
      businessId: options.businessId,
    },
  })

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: trackedHtml,
      text,
      headers: {
        'X-Lead-Thread-Token': trackingToken,
        'X-Lead-Thread-Id': threadId,
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: [
        { name: 'lead_id', value: options.leadId },
        { name: 'tracking_token', value: trackingToken },
      ],
    })

    await prisma.$transaction([
      prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
          resendMessageId: result.data?.id || null,
        },
      }),
      prisma.lead.update({
        where: { id: options.leadId },
        data: {
          lastContacted: new Date(),
          emailsSent: { increment: 1 },
        },
      }),
    ])

    return emailLog.id
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: 'failed',
        error: errorMessage,
        retryCount: { increment: 1 },
      },
    })

    throw error
  }
}

export async function sendTemplateEmail(
  leadId: string,
  templateId: string,
  type: EmailType,
  immediate = false
): Promise<void> {
  const [lead, template] = await Promise.all([
    prisma.lead.findUnique({ where: { id: leadId } }),
    prisma.template.findUnique({ where: { id: templateId } }),
  ])

  if (!lead || !template) {
    throw new Error('Lead or template not found')
  }

  if (lead.unsubscribed || lead.bounced) {
    throw new Error('Lead is unsubscribed or bounced')
  }

  // Fetch business-specific settings
  const businessId = lead.businessId
  const where = businessId ? { businessId } : {}
  const settings = await prisma.settings.findFirst({ where })

  const variables = {
    name: lead.name,
    email: lead.email,
    company: lead.company || '',
  }

  const subject = replaceVariables(template.subject, variables)
  const html = replaceVariables(template.htmlContent, variables)

  const lastEmail = await prisma.emailLog.findFirst({
    where: { leadId },
    orderBy: { createdAt: 'desc' },
  })

  const threadId = lastEmail?.threadId || generateTrackingToken()

  if (immediate) {
    await sendEmailWithTracking({
      to: lead.email,
      subject,
      html,
      leadId,
      templateId,
      type,
      threadId,
      businessId,
      resendApiKey: settings?.resendApiKey,
      resendFromEmail: settings?.resendFromEmail,
    })

    await prisma.activity.create({
      data: {
        leadId,
        type: 'email_sent',
        description: `Sent ${type} email: ${subject}`,
        businessId,
      },
    })
  } else {
    const delayMs = settings?.emailDelayMs || 5000
    await sleep(delayMs)
    await sendEmailWithTracking({
      to: lead.email,
      subject,
      html,
      leadId,
      templateId,
      type,
      threadId,
      businessId,
      resendApiKey: settings?.resendApiKey,
      resendFromEmail: settings?.resendFromEmail,
    })
  }
}

export async function sendNotificationEmail(
  leadName: string,
  leadCompany: string,
  leadEmail: string,
  replyPreview: string,
  businessId?: string | null
): Promise<void> {
  const where = businessId ? { businessId } : {}
  const settings = await prisma.settings.findFirst({ where })
  const ownerEmail = settings?.ownerEmail || process.env.OWNER_EMAIL || 'growphonedigital@gmail.com'
  const fromEmail = settings?.resendFromEmail || process.env.RESEND_FROM_EMAIL || FROM_EMAIL_FALLBACK
  const resend = getResendClient(settings?.resendApiKey || undefined)

  const notificationTemplate = await prisma.template.findFirst({
    where: { type: 'notification', isActive: true, ...(businessId && { businessId }) },
  })

  const html = notificationTemplate
    ? replaceVariables(notificationTemplate.htmlContent, {
        name: leadName,
        company: leadCompany,
        email: leadEmail,
        reply: replyPreview,
      })
    : `
    <h2>New Reply Received</h2>
    <p><strong>Lead:</strong> ${leadName}</p>
    <p><strong>Company:</strong> ${leadCompany}</p>
    <p><strong>Email:</strong> ${leadEmail}</p>
    <p><strong>Reply Preview:</strong></p>
    <p>${replyPreview}</p>
    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
  `

  await resend.emails.send({
    from: fromEmail,
    to: ownerEmail,
    subject: `New Reply from ${leadName}`,
    html,
    text: stripHtmlToText(html),
  })
}
