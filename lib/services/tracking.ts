import { randomUUID } from 'crypto'
import { getAppUrl } from '@/lib/env'

export interface ParsedUserAgent {
  deviceType: string
  browser: string
}

export function generateTrackingToken(): string {
  return randomUUID().replace(/-/g, '')
}

export function parseUserAgent(userAgent: string | null): ParsedUserAgent {
  if (!userAgent) {
    return { deviceType: 'unknown', browser: 'unknown' }
  }

  const ua = userAgent.toLowerCase()
  let deviceType = 'desktop'
  if (/mobile|android|iphone|ipod/.test(ua)) deviceType = 'mobile'
  else if (/ipad|tablet/.test(ua)) deviceType = 'tablet'

  let browser = 'unknown'
  if (ua.includes('edg/')) browser = 'Edge'
  else if (ua.includes('chrome/') && !ua.includes('chromium')) browser = 'Chrome'
  else if (ua.includes('firefox/')) browser = 'Firefox'
  else if (ua.includes('safari/') && !ua.includes('chrome')) browser = 'Safari'
  else if (ua.includes('outlook')) browser = 'Outlook'

  return { deviceType, browser }
}

export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  return request.headers.get('x-real-ip')
}

export function injectTrackingPixel(html: string, trackingToken: string): string {
  const appUrl = getAppUrl()
  const pixel = `<img src="${appUrl}/api/track/open/${trackingToken}" width="1" height="1" alt="" style="display:none!important;visibility:hidden!important;opacity:0!important;border:0!important;" />`
  const tokenComment = `<!-- lead-token:${trackingToken} -->`

  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}${tokenComment}</body>`)
  }
  return `${html}${pixel}${tokenComment}`
}

export function appendTrackingTokenComment(html: string, trackingToken: string): string {
  const tokenComment = `<!-- lead-token:${trackingToken} -->`
  if (html.includes(tokenComment)) return html
  if (html.includes('</body>')) {
    return html.replace('</body>', `${tokenComment}</body>`)
  }
  return `${html}${tokenComment}`
}

export function rewriteLinksForTracking(html: string, trackingToken: string): string {
  const appUrl = getAppUrl()

  return html.replace(
    /href=["'](https?:\/\/[^"']+)["']/gi,
    (_match, url: string) => {
      if (url.includes('/api/track/')) return `href="${url}"`
      const encoded = encodeURIComponent(url)
      return `href="${appUrl}/api/track/click/${trackingToken}?url=${encoded}"`
    }
  )
}

export function prepareTrackedHtml(
  html: string,
  trackingToken: string,
  trackingEnabled = true
): string {
  if (!trackingEnabled) {
    return appendTrackingTokenComment(html, trackingToken)
  }

  const withLinks = rewriteLinksForTracking(html, trackingToken)
  return injectTrackingPixel(withLinks, trackingToken)
}

export function extractTrackingTokenFromContent(content: string): string | null {
  const match = content.match(/lead-token:([a-f0-9]+)/i)
  return match?.[1] || null
}

// 1x1 transparent GIF
export const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)
