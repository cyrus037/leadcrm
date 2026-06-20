'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  Mail, 
  Settings, 
  FileText,
  BarChart3,
  Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSession } from 'next-auth/react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Templates', href: '/templates', icon: FileText },
  { name: 'Email Logs', href: '/email-logs', icon: Mail },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const superAdminNavigation = [
  { name: 'Businesses', href: '/businesses', icon: Building2 },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold text-primary">Lead CRM</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {isSuperAdmin && superAdminNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
        {isSuperAdmin && superAdminNavigation.length > 0 && (
          <div className="my-2 border-t" />
        )}
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
            A
          </div>
          <div>
            <p className="text-sm font-medium">Admin</p>
            <p className="text-xs text-muted-foreground">admin@lead.growphone.in</p>
          </div>
        </div>
      </div>
    </div>
  )
}
