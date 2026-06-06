require('dotenv').config()
const { Resend } = require('resend')

const resend = new Resend(process.env.RESEND_API_KEY)

async function testResend() {
  console.log('Testing Resend API...')
  console.log('API Key:', process.env.RESEND_API_KEY ? 'Set' : 'Not set')
  console.log('From Email:', process.env.RESEND_FROM_EMAIL)
  
  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: 'growphonedigital@gmail.com',
      subject: 'Test Email from Lead CRM',
      html: '<h1>Test Email</h1><p>This is a test email from your Lead CRM application.</p>',
    })
    
    console.log('Email sent successfully!')
    console.log('Result:', result)
  } catch (error) {
    console.error('Error sending email:', error)
    console.error('Error message:', error.message)
    console.error('Error code:', error.code)
  }
}

testResend()
