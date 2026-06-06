# Audit Report — Lead Management CRM

**Date:** May 27, 2026  
**Scope:** Full codebase audit, refactor, and productionization

---

## Executive Summary

The application was a functional Next.js 15 + MongoDB + Resend prototype with critical gaps in email tracking, reply detection, queue reliability, and API correctness. This release refactors core automation into service modules, adds enterprise-grade tracking, hardens the follow-up engine, and fixes multiple production-blocking bugs.

---

## Critical Bugs Fixed

| Issue | Severity | Resolution |
|-------|----------|------------|
| Follow-up type detected via `templateId.includes('followup1')` | Critical | Uses `template.type` from DB relation |
| In-memory email queue lost on serverless cold starts | Critical | Direct send with DB-backed `EmailLog` + `FollowupQueue` |
| Reply detection was a no-op placeholder | Critical | Inbound webhook + reply parser + cron reconciliation |
| Leads search used Mongo `$regex` in Prisma | High | Prisma `contains` + `mode: 'insensitive'` |
| Sync activity logged invalid `leadId` (email string) | High | Uses valid ObjectId from first new lead |
| No duplicate follow-up prevention | High | `hasPendingFollowup()` guard before scheduling |
| Missing follow-up chain after initial send | High | Auto-schedules followup1/2 after each step |
| `pendingFollowups` stat excluded overdue jobs | Medium | Counts all pending where `scheduledAt <= now` |
| Empty-state JSX operator precedence | Medium | Fixed `&&` grouping in tables |
| Build failed on seed script types | Medium | Excluded `scripts/` from TS build |
| Plain-text password check for DB users | High | bcrypt comparison when `passwordHash` exists |
| No route protection middleware | High | NextAuth middleware + security headers |

---

## Architecture Improvements

```
lib/
├── services/
│   ├── tracking.ts       # Pixel, click rewrite, UA parsing
│   ├── reply-parser.ts   # OOO, bounce, unsubscribe detection
│   ├── engagement.ts     # Open/click/reply rates, scores
│   └── followup-queue.ts # DB queue, locks, daily limits
├── resend.ts             # Tracked email sending
├── automation.ts         # Re-exports queue service
├── env.ts                # Zod env validation
├── validations.ts        # API input schemas
└── errors.ts             # Centralized error handling
```

**Queue strategy:** Database-backed `FollowupQueue` with optimistic locking (`processing` + `lockedAt`) instead of in-memory arrays. BullMQ/Redis documented for future scale on dedicated workers.

---

## New Features

### Email Tracking
- Invisible 1×1 tracking pixel per email
- Link click redirect with token
- Open/click event logs (device, browser, IP, timestamp)
- Resend webhook integration for delivery/bounce events

### Reply Detection
- Inbound email webhook (`/api/webhooks/inbound`)
- Thread token in HTML comment + `X-Lead-Thread-Token` header
- Classification: human, OOO, bounce, spam_block, unsubscribe
- Auto-cancel pending follow-ups on stop events

### Analytics
- Global engagement stats (open/click/reply/bounce rates)
- Per-lead engagement score
- Lead detail page with tracking timeline

---

## Performance Notes

- Parallel `Promise.all` for dashboard stats
- Pagination on leads and email logs (max 100/page)
- Follow-up batch limit of 50 per cron run
- Indexed fields on `EmailLog.trackingToken`, `FollowupQueue` status/schedule

---

## Security Audit Summary

| Area | Status |
|------|--------|
| API auth (NextAuth session) | ✅ Protected routes |
| Cron endpoints | ✅ `CRON_SECRET` bearer |
| Tracking endpoints | ✅ Public (required for pixels) |
| Webhook endpoints | ✅ Optional `RESEND_WEBHOOK_SECRET` |
| Security headers | ✅ nosniff, DENY frame, referrer policy |
| Password storage | ✅ bcrypt for DB users |
| Input validation | ✅ Zod schemas on leads API |
| CSRF | ⚠️ NextAuth handles session cookies; add CSRF tokens for forms if exposing publicly |

**Recommended next steps:** Email verification, 2FA, refresh tokens, rate limiting middleware (e.g. `@upstash/ratelimit`).

---

## Remaining / Future Work

1. **BullMQ + Redis** — For high-volume sending on dedicated worker (optional `REDIS_URL`)
2. **Gmail API polling** — Alternative reply source if Resend inbound not configured
3. **Real-time dashboard** — WebSockets or SSE for live open notifications
4. **Campaign model** — Multi-sequence campaigns per lead list
5. **2FA / email verification** — Full auth hardening

---

## Test Checklist

- [ ] `npx prisma db push` applies schema
- [ ] Login with admin credentials
- [ ] Create lead → initial follow-up scheduled
- [ ] Cron `process-followups` sends and chains followup1/2
- [ ] Open tracking pixel increments `openCount`
- [ ] Click tracking redirects and logs event
- [ ] Inbound webhook stops follow-ups on reply
- [ ] Google Sheets sync creates leads without invalid activities
