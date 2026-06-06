# Resend Webhooks

Use these URLs in Resend for the production app:

| Purpose | URL | Events |
| --- | --- | --- |
| Delivery and engagement events | `https://lead.growphone.in/api/webhooks/resend` | `email.delivered`, `email.bounced`, `email.complained`, `email.opened`, `email.clicked` |
| Inbound replies | `https://lead.growphone.in/api/webhooks/inbound` | Inbound email route for replies, unsubscribes, bounces, and out-of-office detection |

For production, set these environment variables:

```env
NEXTAUTH_URL="https://lead.growphone.in"
APP_URL="https://lead.growphone.in"
RESEND_FROM_EMAIL="info@growphone.in"
RESEND_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxxx"
EMAIL_TRACKING_ENABLED="false"
```

For local development, use:

```env
NEXTAUTH_URL="http://localhost:3000"
APP_URL="http://localhost:3000"
```

Resend cannot send webhooks directly to `localhost:3000` from the internet. To test webhooks locally, expose your local server with a tunnel such as ngrok or Cloudflare Tunnel, then register the tunnel URLs in Resend:

```text
https://your-tunnel-url/api/webhooks/resend
https://your-tunnel-url/api/webhooks/inbound
```

Keep `EMAIL_TRACKING_ENABLED="false"` for better deliverability. Turn it on only when you specifically need open and click tracking.
