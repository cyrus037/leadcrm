'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, TrendingUp, Mail, Users, MousePointerClick, Eye, AlertTriangle } from 'lucide-react'

interface AnalyticsData {
  totalLeads: number
  emailsSent: number
  responseRate: string
  conversionRate: string
  openRate: string
  clickRate: string
  bounceRate: string
  unsubscribed: number
  failedEmails: number
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>({
    totalLeads: 0,
    emailsSent: 0,
    responseRate: '0',
    conversionRate: '0',
    openRate: '0',
    clickRate: '0',
    bounceRate: '0',
    unsubscribed: 0,
    failedEmails: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      const stats = await response.json()

      if (response.ok) {
        setData({
          totalLeads: stats.totalLeads || 0,
          emailsSent: stats.engagement?.totalSent || stats.emailsSentToday || 0,
          responseRate: stats.engagement?.replyRate || '0',
          conversionRate: stats.conversionRate || '0',
          openRate: stats.engagement?.openRate || '0',
          clickRate: stats.engagement?.clickRate || '0',
          bounceRate: stats.engagement?.bounceRate || '0',
          unsubscribed: stats.engagement?.unsubscribed || 0,
          failedEmails: stats.failedEmails || 0,
        })
        setError(null)
      } else {
        setError(stats.error || 'Analytics are unavailable.')
      }
    } catch {
      setError('Analytics are unavailable. Check your database connection.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
      </div>
    )
  }

  const metrics = [
    { title: 'Total Leads', value: data.totalLeads, icon: Users, desc: 'Leads in pipeline' },
    { title: 'Open Rate', value: `${data.openRate}%`, icon: Eye, desc: 'Emails opened' },
    { title: 'Click Rate', value: `${data.clickRate}%`, icon: MousePointerClick, desc: 'Links clicked' },
    { title: 'Reply Rate', value: `${data.responseRate}%`, icon: Mail, desc: 'Human replies' },
    { title: 'Conversion Rate', value: `${data.conversionRate}%`, icon: TrendingUp, desc: 'Interested leads' },
    { title: 'Bounce Rate', value: `${data.bounceRate}%`, icon: AlertTriangle, desc: 'Failed deliveries' },
    { title: 'Unsubscribed', value: data.unsubscribed, icon: BarChart3, desc: 'Opt-out leads' },
    { title: 'Failed Emails', value: data.failedEmails, icon: AlertTriangle, desc: 'Send failures' },
  ]

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Campaign performance and engagement metrics</p>
      </div>

      {error && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="py-4 text-sm text-orange-900">
            {error}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">{metric.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Engagement Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Open Rate</p>
              <div className="mt-2 h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${Math.min(parseFloat(data.openRate), 100)}%` }}
                />
              </div>
              <p className="mt-1 text-lg font-semibold">{data.openRate}%</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Click Rate</p>
              <div className="mt-2 h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-green-500 transition-all"
                  style={{ width: `${Math.min(parseFloat(data.clickRate), 100)}%` }}
                />
              </div>
              <p className="mt-1 text-lg font-semibold">{data.clickRate}%</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Reply Rate</p>
              <div className="mt-2 h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-purple-500 transition-all"
                  style={{ width: `${Math.min(parseFloat(data.responseRate), 100)}%` }}
                />
              </div>
              <p className="mt-1 text-lg font-semibold">{data.responseRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
