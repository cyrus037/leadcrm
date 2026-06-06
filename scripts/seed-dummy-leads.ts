import { PrismaClient, LeadStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const dummyLeads: {
    email: string
    name: string
    company: string
    status: LeadStatus
    dateAdded: Date
  }[] = [
    {
      email: 'growphonedigital@gmail.com',
      name: 'GrowPhone Digital',
      company: 'GrowPhone Digital Agency',
      status: 'new',
      dateAdded: new Date(),
    },
    {
      email: 'nishilsoni01@gmail.com',
      name: 'Nishil Soni',
      company: 'Tech Solutions Inc',
      status: 'new',
      dateAdded: new Date(),
    },
    {
      email: 'nishilsoni02@gmail.com',
      name: 'Nishil Soni 2',
      company: 'Digital Marketing Co',
      status: 'new',
      dateAdded: new Date(),
    },
  ]

  for (const lead of dummyLeads) {
    const existing = await prisma.lead.findUnique({
      where: { email: lead.email },
    })

    if (!existing) {
      await prisma.lead.create({ data: lead })
      console.log(`Created lead: ${lead.email}`)
    } else {
      console.log(`Lead already exists: ${lead.email}`)
    }
  }

  console.log('Dummy leads seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
