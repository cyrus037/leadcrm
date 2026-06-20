import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { settingsUpdateSchema } from '@/lib/validations'
import { getAppUrl, getResendWebhookUrls } from '@/lib/env'

const DEFAULT_SETTINGS = {
  followupDay1: 7,
  followupDay2: 14,
  emailRateLimit: 2,
  emailDelayMs: 5000,
  dailySendLimit: 100,
  syncIntervalMinutes: 5,
  warmupEnabled: false,
  warmupDailyLimit: 20,
}

async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

async function getOrCreateSettings(businessId?: string | null) {
  const where = businessId ? { businessId } : {}
  const existing = await prisma.settings.findFirst({ where })
  if (existing) return existing

  return prisma.settings.create({
    data: {
      googleSheetId: process.env.GOOGLE_SHEET_ID || null,
      googleSheetRange: process.env.GOOGLE_SHEET_RANGE || 'Sheet1!A:E',
      ownerEmail: process.env.OWNER_EMAIL || null,
      resendApiKey: process.env.RESEND_API_KEY || null,
      resendFromEmail: process.env.RESEND_FROM_EMAIL || null,
      businessId,
      ...DEFAULT_SETTINGS,
    },
  })
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For non-super-admin users, get their business settings
    const businessId = session.user.role !== 'SUPER_ADMIN' ? session.user.businessId : null
    const settings = await getOrCreateSettings(businessId)
    const appUrl = getAppUrl()

    return NextResponse.json({
      ...settings,
      env: {
        databaseConfigured: Boolean(process.env.DATABASE_URL),
        resendConfigured: Boolean(process.env.RESEND_API_KEY),
        resendFromEmail: process.env.RESEND_FROM_EMAIL || null,
        googleCredentialsConfigured: Boolean(
          process.env.GOOGLE_CLIENT_EMAIL &&
            process.env.GOOGLE_PRIVATE_KEY &&
            process.env.GOOGLE_PROJECT_ID
        ),
        appUrl,
        nextAuthUrl: process.env.NEXTAUTH_URL || null,
        adminEmail: process.env.ADMIN_EMAIL || null,
        cronSecretConfigured: Boolean(process.env.CRON_SECRET),
        resendWebhookSecretConfigured: Boolean(process.env.RESEND_WEBHOOK_SECRET),
        resendWebhookUrls: getResendWebhookUrls(appUrl),
      },
    })
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = settingsUpdateSchema.parse(body)

    // For non-super-admin users, update their business settings
    const businessId = session.user.role !== 'SUPER_ADMIN' ? session.user.businessId : null
    const current = await getOrCreateSettings(businessId)

    const settings = await prisma.settings.update({
      where: { id: current.id },
      data: parsed,
    })

    return NextResponse.json(settings)
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
