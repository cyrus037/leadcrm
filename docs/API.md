# API Documentation

Base URL: `{APP_URL}` (e.g. `http://localhost:3000`)

All authenticated routes require a valid NextAuth session cookie.

---

## Authentication

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/auth/[...nextauth]` | NextAuth handlers |

---

## Leads

### `GET /api/leads`
Query: `page`, `limit`, `status`, `search`

### `POST /api/leads`
Body: `{ email, name, company?, status?, notes? }`  
Auto-schedules initial outreach for new leads.

### `GET /api/leads/:id`
Returns lead with activities, email logs (with tracking events), follow-up queue.

### `PATCH /api/leads/:id`
Body: `{ status?, notes?, tags?, name?, company? }`

### `DELETE /api/leads/:id`

### `POST /api/leads/:id/send-email`
Body: `{ templateId? }` — sends immediately with tracking.

---

## Templates

### `GET /api/templates`
### `POST /api/templates`
### `GET/PATCH/DELETE /api/templates/:id`
### `POST /api/templates/:id/test`
Body: `{ testEmail }`

---

## Email Logs

### `GET /api/email-logs`
Query: `page`, `limit`, `leadId?`  
Returns `{ logs, pagination }` with open/click events.

---

## Dashboard

### `GET /api/dashboard/stats`
Returns lead counts, engagement rates, recent activities.

---

## Sync

### `POST /api/sync` — Import from Google Sheets (auth required)
### `POST /api/sync-to-sheet` — Export to Google Sheets

---

## Tracking (Public)

### `GET /api/track/open/:token`
Returns 1×1 GIF; records open event.

### `GET /api/track/click/:token?url={encodedUrl}`
Redirects to original URL; records click event.

---

## Webhooks (Public)

### `POST /api/webhooks/resend`
Resend delivery events: `email.delivered`, `email.bounced`, `email.opened`, `email.clicked`

### `POST /api/webhooks/inbound`
Inbound reply emails. Matches via `X-Lead-Thread-Token` or lead email.

---

## Cron (Bearer `CRON_SECRET`)

| Path | Schedule | Description |
|------|----------|-------------|
| `GET /api/cron/sync-sheets` | */5 min | Import leads |
| `GET /api/cron/process-followups` | Hourly | Process due follow-ups |
| `GET /api/cron/check-replies` | */30 min | Reconcile reply activities |

Authorization header: `Bearer {CRON_SECRET}`
