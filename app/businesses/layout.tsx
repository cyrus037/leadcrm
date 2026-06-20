import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function BusinessesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    redirect('/')
  }
  
  return <>{children}</>
}
