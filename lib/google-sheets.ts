import { google } from 'googleapis'
import type { LeadStatus } from '@prisma/client'
import { prisma } from './prisma'
import { scheduleInitialOutreach, hasPendingFollowup } from './automation'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']
const TERMINAL_STATUSES: LeadStatus[] = ['replied', 'interested', 'closed', 'ignored']

function normalizeSheetDate(value: unknown): Date {
  if (!value) return new Date()
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function normalizeEmail(value: unknown): string {
  return String(value || '').toLowerCase().trim()
}

async function getSheetConfig() {
  const settings = await prisma.settings.findFirst()
  return {
    spreadsheetId: settings?.googleSheetId || process.env.GOOGLE_SHEET_ID,
    range: settings?.googleSheetRange || process.env.GOOGLE_SHEET_RANGE || 'Sheet1!A:E',
  }
}

export async function getGoogleSheetsData(): Promise<
  { name: string; email: string; company: string; status: string; dateAdded: Date }[]
> {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      project_id: process.env.GOOGLE_PROJECT_ID,
    },
    scopes: SCOPES,
  })

  const sheets = google.sheets({ version: 'v4', auth })
  const { spreadsheetId, range } = await getSheetConfig()

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID is not configured')
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  })

  const rows = response.data.values || []

  const statusMap: Record<string, string> = {
    new: 'new',
    'not contacted': 'new',
    contacted: 'contacted',
    followup1: 'followup1',
    followup2: 'followup2',
    replied: 'replied',
    interested: 'interested',
    closed: 'closed',
    ignored: 'ignored',
  }

  return rows.slice(1).map((row) => {
    const sheetStatus = (row[3] || 'new').toLowerCase().trim()
    return {
      name: String(row[0] || '').trim(),
      email: normalizeEmail(row[1]),
      company: String(row[2] || '').trim(),
      status: statusMap[sheetStatus] || 'new',
      dateAdded: normalizeSheetDate(row[4]),
    }
  }).filter((row) => row.email && row.name)
}

export async function syncLeadsFromSheets(): Promise<{
  added: number
  updated: number
  error: string | null
}> {
  try {
    const sheetData = await getGoogleSheetsData()
    let added = 0
    let updated = 0
    let firstNewLeadId: string | null = null

    for (const row of sheetData) {
      if (!row.email) continue

      const existingLead = await prisma.lead.findUnique({
        where: { email: row.email },
      })

      if (existingLead) {
        const shouldPreserveLocalStatus =
          TERMINAL_STATUSES.includes(existingLead.status) ||
          existingLead.unsubscribed ||
          existingLead.bounced

        await prisma.lead.update({
          where: { email: row.email },
          data: {
            name: row.name,
            company: row.company,
            status: shouldPreserveLocalStatus ? existingLead.status : row.status as LeadStatus,
          },
        })
        updated++
      } else {
        const newLead = await prisma.lead.create({
          data: {
            email: row.email,
            name: row.name,
            company: row.company,
            status: row.status as LeadStatus,
            dateAdded: row.dateAdded,
          },
        })

        if (!firstNewLeadId) firstNewLeadId = newLead.id

        const initialTemplate = await prisma.template.findFirst({
          where: { type: 'initial', isActive: true },
        })

        if (initialTemplate && !(await hasPendingFollowup(newLead.id, initialTemplate.id))) {
          await scheduleInitialOutreach(newLead.id)
        }

        added++
      }
    }

    if (firstNewLeadId) {
      await prisma.activity.create({
        data: {
          leadId: firstNewLeadId,
          type: 'sync_completed',
          description: `Synced ${added} new leads and updated ${updated} leads from Google Sheets`,
        },
      })
    }

    return { added, updated, error: null }
  } catch (error) {
    console.error('Error syncing leads:', error)
    return { added: 0, updated: 0, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function syncLeadsToSheets(): Promise<{ synced: number; error: string | null }> {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        project_id: process.env.GOOGLE_PROJECT_ID,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    const sheets = google.sheets({ version: 'v4', auth })
    const { spreadsheetId, range } = await getSheetConfig()

    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not configured')
    }

    const leads = await prisma.lead.findMany({
      orderBy: { dateAdded: 'desc' },
    })

    const sheetData = [
      ['Name', 'Email', 'Company', 'Status', 'Date Added'],
      ...leads.map((lead) => [
        lead.name,
        lead.email,
        lead.company || '',
        lead.status,
        lead.dateAdded.toISOString().split('T')[0],
      ]),
    ]

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: sheetData },
    })

    if (leads[0]) {
      await prisma.activity.create({
        data: {
          leadId: leads[0].id,
          type: 'sync_completed',
          description: `Synced ${leads.length} leads from database to Google Sheets`,
        },
      })
    }

    return { synced: leads.length, error: null }
  } catch (error) {
    console.error('Error syncing leads to sheets:', error)
    return { synced: 0, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
