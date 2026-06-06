import type { ReplyType } from '@prisma/client'

export interface ParsedReply {
  type: ReplyType
  preview: string
  isStopFollowup: boolean
  updateLeadStatus?: 'replied' | 'ignored'
}

const OOO_PATTERNS = [
  /out of (the )?office/i,
  /automatic reply/i,
  /auto.?reply/i,
  /away from (my )?desk/i,
  /on vacation/i,
  /on leave/i,
  /i am currently out/i,
]

const BOUNCE_PATTERNS = [
  /delivery (status )?notification/i,
  /mail delivery failed/i,
  /undeliverable/i,
  /address rejected/i,
  /user unknown/i,
  /mailbox unavailable/i,
  /550[\s-]/i,
  /554[\s-]/i,
  /message blocked/i,
]

const SPAM_BLOCK_PATTERNS = [
  /spam/i,
  /blocked by/i,
  /rejected by recipient/i,
  /content filter/i,
  /policy violation/i,
]

const UNSUBSCRIBE_PATTERNS = [
  /unsubscribe/i,
  /remove me from/i,
  /stop emailing/i,
  /do not contact/i,
  /opt.?out/i,
  /take me off/i,
  /no longer interested/i,
]

export function parseReplyContent(
  subject: string,
  body: string,
  fromEmail?: string
): ParsedReply {
  const combined = `${subject}\n${body}`.trim()
  const preview = combined.slice(0, 500)

  if (fromEmail && /mailer-daemon|postmaster|mail-delivery/i.test(fromEmail)) {
    return {
      type: 'bounce',
      preview,
      isStopFollowup: true,
      updateLeadStatus: 'ignored',
    }
  }

  for (const pattern of BOUNCE_PATTERNS) {
    if (pattern.test(combined)) {
      return {
        type: 'bounce',
        preview,
        isStopFollowup: true,
        updateLeadStatus: 'ignored',
      }
    }
  }

  for (const pattern of UNSUBSCRIBE_PATTERNS) {
    if (pattern.test(combined)) {
      return {
        type: 'unsubscribe',
        preview,
        isStopFollowup: true,
        updateLeadStatus: 'ignored',
      }
    }
  }

  for (const pattern of SPAM_BLOCK_PATTERNS) {
    if (pattern.test(combined)) {
      return {
        type: 'spam_block',
        preview,
        isStopFollowup: true,
        updateLeadStatus: 'ignored',
      }
    }
  }

  for (const pattern of OOO_PATTERNS) {
    if (pattern.test(combined)) {
      return {
        type: 'out_of_office',
        preview,
        isStopFollowup: false,
      }
    }
  }

  return {
    type: 'human',
    preview,
    isStopFollowup: true,
    updateLeadStatus: 'replied',
  }
}
