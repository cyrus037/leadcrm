import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(16),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  OWNER_EMAIL: z.string().email().optional(),
  APP_URL: z.string().url().optional(),
  CRON_SECRET: z.string().min(16).optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  GOOGLE_SHEET_ID: z.string().optional(),
  GOOGLE_SHEET_RANGE: z.string().optional(),
  GOOGLE_CLIENT_EMAIL: z.string().optional(),
  GOOGLE_PRIVATE_KEY: z.string().optional(),
  GOOGLE_PROJECT_ID: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

let cachedEnv: Env | null = null

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv

  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ')
    throw new Error(`Invalid environment configuration: ${missing}`)
  }

  cachedEnv = parsed.data
  return cachedEnv
}

export function getAppUrl(): string {
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return appUrl.replace(/\/$/, '')
}

export function getResendWebhookUrls(appUrl = getAppUrl()) {
  const baseUrl = appUrl.replace(/\/$/, '')

  return {
    events: `${baseUrl}/api/webhooks/resend`,
    inbound: `${baseUrl}/api/webhooks/inbound`,
  }
}
