'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Mail, MousePointerClick, Eye } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface LeadDetail {
  id: string
  name: string
  email: string
  company: string | null
  status: string
  engagementScore: number
  emailsSent: number
  emailsOpened: number
  emailsClicked: number
  unsubscribed: boolean
  bounced: boolean
  dateAdded: string
  lastContacted: string | null
  activities: { id: string; type: string; description: string; createdAt: string }[]
  emailLogs: {
    id: string
    type: string
    status: string
    subject: string | null
    openCount: number
    clickCount: number
    sentAt: string | null
    repliedAt: string | null
    replyType: string | null
    template: { name: string }
    openEvents: { openedAt: string; deviceType: string | null; browser: string | null }[]
    clickEvents: { clickedAt: string; originalUrl: string }[]
  }[]
  followupQueue: { id: string; status: string; scheduledAt: string; template: { name: string } }[]
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  followup1: 'bg-orange-100 text-orange-800',
  followup2: 'bg-purple-100 text-purple-800',
  replied: 'bg-green-100 text-green-800',
  interested: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-gray-100 text-gray-800',
  ignored: 'bg-red-100 text-red-800',
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchLead = useCallback(async () => {
    try {
      const response = await fetch(`/api/leads/${params.id}`)
      const data = await response.json()
      if (response.ok) {
        setLead(data)
      } else {
        toast({ title: 'Error', description: data.error })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load lead' })
    } finally {
      setLoading(false)
    }
  }, [params.id, toast])

  useEffect(() => {
    fetchLead()
  }, [fetchLead])

  const handleSendEmail = async () => {
    try {
      const response = await fetch(`/api/leads/${params.id}/send-email`, { method: 'POST' })
      const data = await response.json()
      if (response.ok) {
        toast({ title: 'Email sent', description: 'Outreach email sent successfully' })
        fetchLead()
      } else {
        toast({ title: 'Failed', description: data.error })
      }
    } catch {
      toast({ title: 'Failed', description: 'Could not send email' })
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading lead...</div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Lead not found</p>
        <Button variant="outline" onClick={() => router.push('/leads')}>
          Back to leads
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/leads">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{lead.name}</h1>
          <p className="text-muted-foreground">{lead.email}</p>
        </div>
        <Badge className={statusColors[lead.status]}>{lead.status}</Badge>
        <Button onClick={handleSendEmail} disabled={lead.unsubscribed || lead.bounced}>
          <Mail className="mr-2 h-4 w-4" />
          Send Email
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Engagement Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lead.engagementScore.toFixed(0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Eye className="h-4 w-4" /> Opens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lead.emailsOpened}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <MousePointerClick className="h-4 w-4" /> Clicks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lead.emailsClicked}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lead.emailsSent}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Email History & Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Opens</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lead.emailLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.template?.name || log.type}</TableCell>
                    <TableCell className="capitalize">{log.status}</TableCell>
                    <TableCell>{log.openCount}</TableCell>
                    <TableCell>{log.clickCount}</TableCell>
                    <TableCell>{log.sentAt ? formatDate(log.sentAt) : '-'}</TableCell>
                  </TableRow>
                ))}
                {lead.emailLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No emails sent yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {lead.activities.map((activity) => (
                <div key={activity.id} className="flex gap-3 text-sm border-l-2 pl-3 border-primary/30">
                  <div>
                    <p className="font-medium">{activity.description}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatDateTime(activity.createdAt)} · {activity.type.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              ))}
              {lead.activities.length === 0 && (
                <p className="text-muted-foreground text-sm">No activity yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {lead.followupQueue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Follow-ups</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lead.followupQueue.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.template?.name}</TableCell>
                    <TableCell className="capitalize">{item.status}</TableCell>
                    <TableCell>{formatDateTime(item.scheduledAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
