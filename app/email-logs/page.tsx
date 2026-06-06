'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

interface EmailLog {
  id: string
  leadId: string
  templateId: string
  type: string
  status: string
  sentAt: string | null
  error: string | null
  openCount?: number
  clickCount?: number
  retryCount: number
  createdAt: string
  lead: {
    name: string
    email: string
  }
  template: {
    name: string
    subject: string
  }
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  retrying: 'bg-orange-100 text-orange-800',
}

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/email-logs')
      const data = await response.json()
      
      if (response.ok) {
        setLogs(data.logs || data || [])
        setError(null)
      } else {
        setError(data.error || 'Email logs are unavailable.')
        setLogs([])
      }
    } catch {
      setError('Email logs are unavailable. Check your database connection.')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading email logs...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Email Logs</h1>
      {error && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="py-4 text-sm text-orange-900">
            {error}
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Email History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Opens</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Retries</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{formatDate(log.createdAt)}</TableCell>
                  <TableCell className="font-medium">{log.lead?.name || 'N/A'}</TableCell>
                  <TableCell>{log.lead?.email || 'N/A'}</TableCell>
                  <TableCell>{log.template?.name || 'N/A'}</TableCell>
                  <TableCell className="capitalize">{log.type}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[log.status] || 'bg-gray-100'}>
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{log.openCount ?? 0}</TableCell>
                  <TableCell>{log.clickCount ?? 0}</TableCell>
                  <TableCell>{log.retryCount}</TableCell>
                </TableRow>
              ))}
              {(!logs || logs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No email logs found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
