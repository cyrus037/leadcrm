import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function normalizeDatabaseUrl(url: string | undefined): string | undefined {
  if (!url) return url

  const compactUrl = url.replace(/[\r\n]+/g, '')

  try {
    const parsed = new URL(compactUrl)
    if (parsed.protocol !== 'mongodb+srv:' && parsed.protocol !== 'mongodb:') {
      return compactUrl
    }

    parsed.searchParams.set('serverSelectionTimeoutMS', parsed.searchParams.get('serverSelectionTimeoutMS') || '5000')
    parsed.searchParams.set('connectTimeoutMS', parsed.searchParams.get('connectTimeoutMS') || '5000')
    return parsed.toString()
  } catch {
    return compactUrl
  }
}

process.env.DATABASE_URL = normalizeDatabaseUrl(process.env.DATABASE_URL)

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
