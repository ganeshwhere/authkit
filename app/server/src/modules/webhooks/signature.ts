import { signHMAC, verifyHMAC } from '../../utils/crypto'

export function buildWebhookSignatureHeader(
  payload: string,
  secret: string,
  timestamp = Math.floor(Date.now() / 1000),
): string {
  const signature = signHMAC(`${timestamp}.${payload}`, secret)
  return `t=${timestamp},v1=${signature}`
}

export function verifyWebhookSignature(
  payload: string,
  header: string,
  secret: string,
  toleranceSeconds = 300,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const segments = header.split(',').map((segment) => segment.trim())
  const timestampRaw = segments.find((segment) => segment.startsWith('t='))?.slice(2)
  const signature = segments.find((segment) => segment.startsWith('v1='))?.slice(3)

  if (!timestampRaw || !signature) {
    return false
  }

  const timestamp = Number.parseInt(timestampRaw, 10)

  if (!Number.isFinite(timestamp)) {
    return false
  }

  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return false
  }

  return verifyHMAC(`${timestamp}.${payload}`, signature, secret)
}
