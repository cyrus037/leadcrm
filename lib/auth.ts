import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        const email = credentials.email.toLowerCase().trim()

        if (email === process.env.ADMIN_EMAIL?.toLowerCase()) {
          if (credentials.password === process.env.ADMIN_PASSWORD) {
            return {
              id: 'admin',
              email,
              name: 'Admin',
              role: 'SUPER_ADMIN',
              businessId: null,
            }
          }
          throw new Error('Invalid password')
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { business: true },
        })

        if (!user || !user.passwordHash) {
          throw new Error('User not found')
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!isValid) {
          throw new Error('Invalid password')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          businessId: user.businessId,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.businessId = user.businessId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.businessId = token.businessId as string | null
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
