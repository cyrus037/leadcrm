'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Building2, Users, Mail, Trash2, Edit } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Business {
  id: string
  name: string
  slug: string
  resendFromEmail: string | null
  ownerEmail: string | null
  isActive: boolean
  createdAt: string
  _count: {
    users: number
    leads: number
    templates: number
    emailLogs: number
  }
}

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newBusiness, setNewBusiness] = useState({
    name: '',
    slug: '',
    resendApiKey: '',
    resendFromEmail: '',
    ownerEmail: '',
  })

  const fetchBusinesses = useCallback(async () => {
    try {
      const response = await fetch('/api/businesses')
      const data = await response.json()
      
      if (response.ok) {
        setBusinesses(data || [])
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch businesses')
        setBusinesses([])
      }
    } catch {
      setError('Failed to fetch businesses. Check your connection.')
      setBusinesses([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBusinesses()
  }, [fetchBusinesses])

  const handleAddBusiness = async () => {
    try {
      const response = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBusiness),
      })
      const data = await response.json()
      if (response.ok) {
        setShowAddDialog(false)
        setNewBusiness({
          name: '',
          slug: '',
          resendApiKey: '',
          resendFromEmail: '',
          ownerEmail: '',
        })
        fetchBusinesses()
        alert('Business created successfully')
      } else {
        alert(data.error || 'Failed to create business')
      }
    } catch (error) {
      console.error('Error creating business:', error)
      alert('Failed to create business')
    }
  }

  const handleDeleteBusiness = async (id: string) => {
    if (!confirm('Are you sure you want to delete this business? This will also delete all associated data.')) {
      return
    }

    try {
      const response = await fetch(`/api/businesses/${id}`, { method: 'DELETE' })
      if (response.ok) {
        fetchBusinesses()
        alert('Business deleted successfully')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete business')
      }
    } catch (error) {
      console.error('Error deleting business:', error)
      alert('Failed to delete business')
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/businesses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (response.ok) {
        fetchBusinesses()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update business')
      }
    } catch (error) {
      console.error('Error updating business:', error)
      alert('Failed to update business')
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading businesses...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Businesses</h1>
          <p className="text-muted-foreground">Manage multi-tenant businesses and their settings</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Business
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Business</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Business Name</Label>
                <Input
                  id="name"
                  value={newBusiness.name}
                  onChange={(e) => setNewBusiness({ ...newBusiness, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug (URL-friendly identifier)</Label>
                <Input
                  id="slug"
                  value={newBusiness.slug}
                  onChange={(e) => setNewBusiness({ ...newBusiness, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="resendApiKey">Resend API Key</Label>
                <Input
                  id="resendApiKey"
                  type="password"
                  value={newBusiness.resendApiKey}
                  onChange={(e) => setNewBusiness({ ...newBusiness, resendApiKey: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="resendFromEmail">Resend From Email</Label>
                <Input
                  id="resendFromEmail"
                  type="email"
                  value={newBusiness.resendFromEmail}
                  onChange={(e) => setNewBusiness({ ...newBusiness, resendFromEmail: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="ownerEmail">Owner Email</Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  value={newBusiness.ownerEmail}
                  onChange={(e) => setNewBusiness({ ...newBusiness, ownerEmail: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleAddBusiness}>Create Business</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="py-4 text-sm text-orange-900">
            {error}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Businesses</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>From Email</TableHead>
                <TableHead>Owner Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Templates</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {businesses?.map((business) => (
                <TableRow key={business.id}>
                  <TableCell className="font-medium">{business.name}</TableCell>
                  <TableCell className="font-mono text-sm">{business.slug}</TableCell>
                  <TableCell>{business.resendFromEmail || '-'}</TableCell>
                  <TableCell>{business.ownerEmail || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={business.isActive ? 'default' : 'secondary'}>
                      {business.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {business._count.users}
                    </div>
                  </TableCell>
                  <TableCell>{business._count.leads}</TableCell>
                  <TableCell>{business._count.templates}</TableCell>
                  <TableCell>{formatDate(business.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(business.id, business.isActive)}
                      >
                        {business.isActive ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteBusiness(business.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!businesses || businesses.length === 0) && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    No businesses found
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
