import { generateSecureToken } from '../../utils/crypto'

export const webhookEventTypes = [
  'user.created',
  'user.updated',
  'user.deleted',
  'user.signed_in',
  'user.signed_out',
  'user.banned',
  'password.changed',
  'password.reset',
  'email.verified',
  'oauth.connected',
  'oauth.disconnected',
  'mfa.enabled',
  'mfa.disabled',
  'session.created',
  'session.revoked',
  'session.compromised',
  'passkey.registered',
  'passkey.removed',
] as const

export type WebhookEventType = (typeof webhookEventTypes)[number]

export type WebhookEventPayload = {
  id: string
  type: WebhookEventType
  projectId: string
  createdAt: string
  data: Record<string, unknown>
}

export type WebhookEventInput = {
  type: WebhookEventType
  projectId: string
  data: Record<string, unknown>
}

export function createWebhookEventPayload(input: WebhookEventInput): WebhookEventPayload {
  return {
    id: `evt_${generateSecureToken(12)}`,
    type: input.type,
    projectId: input.projectId,
    createdAt: new Date().toISOString(),
    data: input.data,
  }
}
