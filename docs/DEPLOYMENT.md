# Deployment Guide

## Prerequisites

- Node.js 18+
- MongoDB Atlas cluster
- Resend account with verified domain
- Google Cloud service account (optional, for Sheets)
- Vercel account (recommended)

---

## 1. Environment Setup

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | MongoDB connection string |
| `NEXTAUTH_SECRET` | Min 16 chars random string |
| `NEXTAUTH_URL` | Production URL |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin login |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Verified sender |
| `APP_URL` | Public app URL (for tracking pixels) |
| `CRON_SECRET` | Min 16 chars for cron auth |

Optional:

| Variable | Description |
|----------|-------------|
| `RESEND_WEBHOOK_SECRET` | Webhook signature verification |
| `OWNER_EMAIL` | Reply notification recipient |
| Google Sheets vars | Sheet sync |

---

## 2. Database Migration

```bash
npm install
npx prisma generate
npx prisma db push
```

Seed templates (optional):

```bash
npx ts-node scripts/seed-templates.ts
```

---

## 3. Resend Configuration

1. Verify sending domain in Resend dashboard
2. Configure webhooks:
   - **Events:** `https://your-app.com/api/webhooks/resend`
   - Events: `email.delivered`, `email.bounced`, `email.opened`, `email.clicked`
3. Configure inbound (for reply detection):
   - **Inbound:** `https://your-app.com/api/webhooks/inbound`
   - Point receiving domain MX to Resend

---

## 4. Vercel Deployment

```bash
npm i -g vercel
vercel
```

Add all environment variables in Vercel project settings.

`vercel.json` includes cron schedules — requires Vercel Pro for sub-hourly crons.

Set cron authorization in Vercel:
- Vercel automatically sends `Authorization: Bearer {CRON_SECRET}` when `CRON_SECRET` is set in env.

---

## 5. Post-Deploy Verification

1. Login at `/login`
2. Create email templates (initial, followup1, followup2)
3. Add a test lead
4. Send manual email — verify in Resend dashboard
5. Open email — check `openCount` on lead detail page
6. Click a link — verify click event logged
7. Trigger cron: `curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.com/api/cron/process-followups`

---

## Scaling Notes

- **Current:** DB-backed queue, serverless-friendly
- **High volume:** Add Redis + BullMQ worker on Railway/Fly.io
- **Daily limits:** Configure in Settings model (`dailySendLimit`, `emailDelayMs`)
