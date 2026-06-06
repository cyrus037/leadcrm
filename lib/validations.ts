import { z } from 'zod'

export const leadCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  company: z.string().max(200).optional(),
  status: z.enum(['new', 'contacted', 'followup1', 'followup2', 'replied', 'interested', 'closed', 'ignored']).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
})

export const leadUpdateSchema = z.object({
  status: z.enum(['new', 'contacted', 'followup1', 'followup2', 'replied', 'interested', 'closed', 'ignored']).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
  name: z.string().min(1).max(200).optional(),
  company: z.string().max(200).optional(),
})

export const templateCreateSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['initial', 'followup1', 'followup2', 'notification']),
  subject: z.string().min(1).max(500),
  htmlContent: z.string().min(1),
  variables: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

export const settingsUpdateSchema = z.object({
  googleSheetId: z.string().max(200).optional().nullable(),
  googleSheetRange: z.string().max(200).optional().nullable(),
  ownerEmail: z.string().email().optional().nullable(),
  followupDay1: z.coerce.number().int().min(1).max(365).optional(),
  followupDay2: z.coerce.number().int().min(1).max(365).optional(),
  emailRateLimit: z.coerce.number().int().min(1).max(50).optional(),
  emailDelayMs: z.coerce.number().int().min(0).max(60000).optional(),
  dailySendLimit: z.coerce.number().int().min(1).max(10000).optional(),
  syncIntervalMinutes: z.coerce.number().int().min(1).max(1440).optional(),
  warmupEnabled: z.boolean().optional(),
  warmupDailyLimit: z.coerce.number().int().min(1).max(1000).optional(),
})

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})
