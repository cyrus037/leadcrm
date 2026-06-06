'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Settings, Database, Mail, Key, Save, RefreshCw, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SettingsResponse {
  googleSheetId: string | null
  googleSheetRange: string | null
  ownerEmail: string | null
  followupDay1: number
  followupDay2: number
  emailRateLimit: number
  emailDelayMs: number
  dailySendLimit: number
  syncIntervalMinutes: number
  warmupEnabled: boolean
  warmupDailyLimit: number
  env: {
    databaseConfigured: boolean
    resendConfigured: boolean
    resendFromEmail: string | null
    googleCredentialsConfigured: boolean
    appUrl: string
    nextAuthUrl: string | null
    adminEmail: string | null
    cronSecretConfigured: boolean
    resendWebhookSecretConfigured: boolean
    resendWebhookUrls: {
      events: string
      inbound: string
    }
  }
}

const emptySettings: SettingsResponse = {
  googleSheetId: '',
  googleSheetRange: 'Sheet1!A:E',
  ownerEmail: '',
  followupDay1: 7,
  followupDay2: 14,
  emailRateLimit: 2,
  emailDelayMs: 5000,
  dailySendLimit: 100,
  syncIntervalMinutes: 5,
  warmupEnabled: false,
  warmupDailyLimit: 20,
  env: {
    databaseConfigured: false,
    resendConfigured: false,
    resendFromEmail: null,
    googleCredentialsConfigured: false,
    appUrl: '',
    nextAuthUrl: null,
    adminEmail: null,
    cronSecretConfigured: false,
    resendWebhookSecretConfigured: false,
    resendWebhookUrls: {
      events: 'http://localhost:3000/api/webhooks/resend',
      inbound: 'http://localhost:3000/api/webhooks/inbound',
    },
  },
}

function StatusBadge({ configured }: { configured: boolean }) {
  return (
    <Badge variant={configured ? 'default' : 'secondary'}>
      {configured ? 'Configured' : 'Missing'}
    </Badge>
  )
}

export default function SettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<SettingsResponse>(emptySettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load settings')
      setSettings({ ...emptySettings, ...data })
    } catch (error) {
      toast({
        title: 'Settings unavailable',
        description: error instanceof Error ? error.message : 'Failed to load settings',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateField = (field: keyof SettingsResponse, value: string | number | boolean) => {
    setSettings((current) => ({ ...current, [field]: value }))
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const payload = {
        googleSheetId: settings.googleSheetId || null,
        googleSheetRange: settings.googleSheetRange || 'Sheet1!A:E',
        ownerEmail: settings.ownerEmail || null,
        followupDay1: settings.followupDay1,
        followupDay2: settings.followupDay2,
        emailRateLimit: settings.emailRateLimit,
        emailDelayMs: settings.emailDelayMs,
        dailySendLimit: settings.dailySendLimit,
        syncIntervalMinutes: settings.syncIntervalMinutes,
        warmupEnabled: settings.warmupEnabled,
        warmupDailyLimit: settings.warmupDailyLimit,
      }

      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save settings')
      setSettings((current) => ({ ...current, ...data }))
      toast({ title: 'Settings saved', description: 'Automation settings were updated.' })
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Could not save settings',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Tune sync, follow-ups, and sending limits.</p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database
              </span>
              <StatusBadge configured={settings.env.databaseConfigured} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Database URL</Label>
              <Input type="password" value="Configured in .env" disabled />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email
              </span>
              <StatusBadge configured={settings.env.resendConfigured} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>From Email</Label>
              <Input value={settings.env.resendFromEmail || 'Configure RESEND_FROM_EMAIL in .env'} disabled />
            </div>
            <div>
              <Label htmlFor="ownerEmail">Reply Notification Email</Label>
              <Input
                id="ownerEmail"
                type="email"
                value={settings.ownerEmail || ''}
                onChange={(event) => updateField('ownerEmail', event.target.value)}
                placeholder="owner@example.com"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Auth & Hooks
              </span>
              <StatusBadge configured={settings.env.cronSecretConfigured} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Admin Email</Label>
              <Input value={settings.env.adminEmail || 'Configure ADMIN_EMAIL in .env'} disabled />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3 text-sm">
              <span>Resend webhook secret</span>
              <StatusBadge configured={settings.env.resendWebhookSecretConfigured} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5" />
              Follow-up Automation
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="followupDay1">First Follow-up Day</Label>
              <Input
                id="followupDay1"
                type="number"
                min={1}
                value={settings.followupDay1}
                onChange={(event) => updateField('followupDay1', Number(event.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="followupDay2">Second Follow-up Day</Label>
              <Input
                id="followupDay2"
                type="number"
                min={1}
                value={settings.followupDay2}
                onChange={(event) => updateField('followupDay2', Number(event.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="dailySendLimit">Daily Send Limit</Label>
              <Input
                id="dailySendLimit"
                type="number"
                min={1}
                value={settings.dailySendLimit}
                onChange={(event) => updateField('dailySendLimit', Number(event.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="emailDelayMs">Delay Between Emails (ms)</Label>
              <Input
                id="emailDelayMs"
                type="number"
                min={0}
                value={settings.emailDelayMs}
                onChange={(event) => updateField('emailDelayMs', Number(event.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Google Sheets
              </span>
              <StatusBadge configured={settings.env.googleCredentialsConfigured} />
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="googleSheetId">Sheet ID</Label>
              <Input
                id="googleSheetId"
                value={settings.googleSheetId || ''}
                onChange={(event) => updateField('googleSheetId', event.target.value)}
                placeholder="Google Sheet ID"
              />
            </div>
            <div>
              <Label htmlFor="googleSheetRange">Range</Label>
              <Input
                id="googleSheetRange"
                value={settings.googleSheetRange || ''}
                onChange={(event) => updateField('googleSheetRange', event.target.value)}
                placeholder="Sheet1!A:E"
              />
            </div>
            <div>
              <Label htmlFor="syncIntervalMinutes">Sync Interval (minutes)</Label>
              <Input
                id="syncIntervalMinutes"
                type="number"
                min={1}
                value={settings.syncIntervalMinutes}
                onChange={(event) => updateField('syncIntervalMinutes', Number(event.target.value))}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Runtime</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Application URL</Label>
            <Input value={settings.env.appUrl} disabled />
          </div>
          <div>
            <Label>NextAuth URL</Label>
            <Input value={settings.env.nextAuthUrl || 'Using APP_URL or localhost fallback'} disabled />
          </div>
          <div>
            <Label>Resend Event Webhook</Label>
            <Input value={settings.env.resendWebhookUrls.events} disabled />
          </div>
          <div>
            <Label>Resend Inbound Webhook</Label>
            <Input value={settings.env.resendWebhookUrls.inbound} disabled />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
