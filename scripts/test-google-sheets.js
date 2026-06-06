require('dotenv').config({ path: '.env' })
const { google } = require('googleapis')

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']

async function testGoogleSheets() {
  console.log('Testing Google Sheets connection...')
  console.log('Config:', {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    has_private_key: !!process.env.GOOGLE_PRIVATE_KEY,
    project_id: process.env.GOOGLE_PROJECT_ID,
    spreadsheet_id: process.env.GOOGLE_SHEET_ID,
    range: process.env.GOOGLE_SHEET_RANGE,
  })

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        project_id: process.env.GOOGLE_PROJECT_ID,
      },
      scopes: SCOPES,
    })
    
    const sheets = google.sheets({ version: 'v4', auth })
    
    const spreadsheetId = process.env.GOOGLE_SHEET_ID
    const range = process.env.GOOGLE_SHEET_RANGE || 'Sheet1!A:E'
    
    console.log(`Fetching from sheet: ${spreadsheetId}, range: ${range}`)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    })
    
    const rows = response.data.values || []
    console.log(`Success! Fetched ${rows.length} rows`)
    console.log('First row (header):', rows[0])
    console.log('Data rows:', rows.slice(1))
  } catch (error) {
    console.error('Error:', error.message)
    console.error('Full error:', error)
  }
}

testGoogleSheets()
