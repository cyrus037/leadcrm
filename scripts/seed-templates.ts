import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const templates = [
    {
      name: 'Initial Outreach',
      type: 'initial' as const,
      subject: 'Hello {{name}} - Introduction',
      htmlContent: `
        <h2>Hello {{name}},</h2>
        <p>I hope this email finds you well. I wanted to reach out to introduce myself and our services.</p>
        <p>At {{company}}, we specialize in helping businesses like yours achieve their goals.</p>
        <p>I'd love to schedule a quick call to discuss how we can help you.</p>
        <p>Best regards,<br>GrowPhone Digital Team</p>
      `,
      variables: ['name', 'company', 'email'],
      isActive: true,
    },
    {
      name: 'Follow-up 1',
      type: 'followup1' as const,
      subject: 'Following up - {{name}}',
      htmlContent: `
        <h2>Hi {{name}},</h2>
        <p>I wanted to follow up on my previous email regarding our services.</p>
        <p>I understand you're busy, but I believe we can add significant value to {{company}}.</p>
        <p>Would you be available for a brief call this week?</p>
        <p>Best regards,<br>GrowPhone Digital Team</p>
      `,
      variables: ['name', 'company', 'email'],
      isActive: true,
    },
    {
      name: 'Follow-up 2',
      type: 'followup2' as const,
      subject: 'Final follow-up - {{name}}',
      htmlContent: `
        <h2>Hello {{name}},</h2>
        <p>This is my final follow-up regarding our services for {{company}}.</p>
        <p>I'll be moving on to other opportunities, but if you're still interested in discussing how we can help, please feel free to reach out.</p>
        <p>Best of luck with your endeavors,<br>GrowPhone Digital Team</p>
      `,
      variables: ['name', 'company', 'email'],
      isActive: true,
    },
  ]

  for (const template of templates) {
    const existing = await prisma.template.findFirst({
      where: { type: template.type as any },
    })

    if (!existing) {
      await prisma.template.create({
        data: template,
      })
      console.log(`Created template: ${template.name}`)
    } else {
      console.log(`Template already exists: ${template.name}`)
    }
  }

  console.log('Templates seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
