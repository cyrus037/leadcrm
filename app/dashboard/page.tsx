'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Mail, TrendingUp, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface DashboardStats {
  totalLeads: number
  newLeads: number
  contactedLeads: number
  repliedLeads: number
  interestedLeads: number
  conversionRate: string
  emailsSentToday: number
  pendingFollowups: number
  recentActivities: any[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      const data = await response.json()
      
      if (response.ok) {
        setStats(data)
        setError(null)
      } else {
        setError(data.error || 'Dashboard data is unavailable.')
        setStats({
          totalLeads: 0,
          newLeads: 0,
          contactedLeads: 0,
          repliedLeads: 0,
          interestedLeads: 0,
          conversionRate: '0',
          emailsSentToday: 0,
          pendingFollowups: 0,
          recentActivities: [],
        })
      }
    } catch {
      setError('Dashboard data is unavailable. Check your database connection.')
      setStats({
        totalLeads: 0,
        newLeads: 0,
        contactedLeads: 0,
        repliedLeads: 0,
        interestedLeads: 0,
        conversionRate: '0',
        emailsSentToday: 0,
        pendingFollowups: 0,
        recentActivities: [],
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    try {
      const response = await fetch('/api/sync', { method: 'POST' })
      const data = await response.json()
      alert(`Sync completed: ${data.added} added, ${data.updated} updated`)
      fetchStats()
    } catch (error) {
      console.error('Error syncing:', error)
      alert('Sync failed')
    }
  }

  const handleSyncToSheet = async () => {
    try {
      const response = await fetch('/api/sync-to-sheet', { method: 'POST' })
      const data = await response.json()
      alert(`Synced ${data.synced} leads to Google Sheet`)
      fetchStats()
    } catch (error) {
      console.error('Error syncing to sheet:', error)
      alert('Sync to sheet failed')
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-muted-foreground">Failed to load dashboard</div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Leads',
      value: stats.totalLeads,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'New Leads',
      value: stats.newLeads,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Replied',
      value: stats.repliedLeads,
      icon: Mail,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Interested',
      value: stats.interestedLeads,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Emails Sent Today',
      value: stats.emailsSentToday,
      icon: Mail,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
    },
    {
      title: 'Pending Followups',
      value: stats.pendingFollowups,
      icon: Clock,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ]

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your lead management</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSync} variant="outline">Sync from Sheet</Button>
          <Button onClick={handleSyncToSheet}>Sync to Sheet</Button>
        </div>
      </div>

      {error && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="py-4 text-sm text-orange-900">
            {error}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats.conversionRate}%</div>
            <p className="text-sm text-muted-foreground mt-2">
              Percentage of leads marked as interested
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivities?.slice(0, 5).map((activity: any) => (
                <div key={activity.id} className="flex items-start gap-3 text-sm">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="font-medium">{activity.description}</p>
                    <p className="text-muted-foreground">
                      {activity.lead?.name || 'System'} • {formatDate(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              {(!stats.recentActivities || stats.recentActivities.length === 0) && (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
