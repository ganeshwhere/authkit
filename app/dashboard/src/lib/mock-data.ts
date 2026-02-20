export type Metric = {
  label: string
  value: string
  delta: string
}

export type ProviderStatus = {
  provider: string
  enabled: boolean
  riskNote: string
}

export const dashboardMetrics: Metric[] = [
  { label: 'Monthly Active Users', value: '42,318', delta: '+12.4%' },
  { label: 'Token Refresh Success', value: '99.72%', delta: '+0.2%' },
  { label: 'MFA Adoption', value: '63.1%', delta: '+8.1%' },
  { label: 'Anomaly Alerts', value: '14', delta: '-3' },
]

export const projects = [
  { id: 'proj_core', name: 'Core API', region: 'us-east-1', users: 18342, signups: 411, status: 'healthy' },
  { id: 'proj_growth', name: 'Growth Portal', region: 'eu-west-1', users: 9562, signups: 278, status: 'healthy' },
  { id: 'proj_enterprise', name: 'Enterprise Console', region: 'us-west-2', users: 1456, signups: 32, status: 'watch' },
]

export const users = [
  { id: 'usr_1001', email: 'lina@bright.io', role: 'admin', mfa: true, lastSeen: '2026-02-20T18:21:00Z' },
  { id: 'usr_1002', email: 'devon@bright.io', role: 'developer', mfa: true, lastSeen: '2026-02-20T17:04:00Z' },
  { id: 'usr_1003', email: 'ops@bright.io', role: 'viewer', mfa: false, lastSeen: '2026-02-19T23:09:00Z' },
]

export const sessions = [
  { id: 'sess_01', user: 'usr_1001', ip: '34.77.21.4', device: 'Safari / macOS', risk: 'low', expiresAt: '2026-03-20T09:00:00Z' },
  { id: 'sess_02', user: 'usr_1002', ip: '141.98.11.21', device: 'Chrome / Linux', risk: 'medium', expiresAt: '2026-03-01T12:00:00Z' },
  { id: 'sess_03', user: 'usr_1003', ip: '102.10.90.7', device: 'Edge / Windows', risk: 'high', expiresAt: '2026-02-21T06:10:00Z' },
]

export const webhooks = [
  { id: 'wh_01', endpoint: 'https://api.bright.io/auth/webhooks', eventCount: 8, successRate: '99.1%', status: 'active' },
  { id: 'wh_02', endpoint: 'https://audit.bright.io/hooks/auth', eventCount: 3, successRate: '96.8%', status: 'active' },
  { id: 'wh_03', endpoint: 'https://staging.bright.io/hooks/auth', eventCount: 5, successRate: '88.2%', status: 'degraded' },
]

export const auditEvents = [
  { id: 'evt_4301', event: 'session.compromised', actor: 'usr_1003', source: 'Warsaw, PL', at: '2026-02-20T16:41:00Z' },
  { id: 'evt_4300', event: 'mfa.enabled', actor: 'usr_1002', source: 'Berlin, DE', at: '2026-02-20T15:12:00Z' },
  { id: 'evt_4299', event: 'oauth.connected', actor: 'usr_1001', source: 'Austin, US', at: '2026-02-20T11:05:00Z' },
]

export const providerStatuses: ProviderStatus[] = [
  { provider: 'google', enabled: true, riskNote: 'Healthy callback latency' },
  { provider: 'github', enabled: true, riskNote: 'Healthy callback latency' },
  { provider: 'discord', enabled: true, riskNote: 'Healthy callback latency' },
  { provider: 'apple', enabled: false, riskNote: 'Needs team key rotation' },
  { provider: 'microsoft', enabled: false, riskNote: 'Pending tenant consent' },
  { provider: 'linkedin', enabled: false, riskNote: 'Awaiting app review' },
]

export const ssoProfiles = [
  { id: 'sso_ent_01', tenant: 'Northwind Holdings', protocol: 'SAML 2.0', domain: 'northwind.com', status: 'active' },
  { id: 'sso_ent_02', tenant: 'BluePeak Finance', protocol: 'SAML 2.0', domain: 'bluepeak.io', status: 'staged' },
]

export const teams = [
  { name: 'Platform Security', members: 6, permission: 'manage_security' },
  { name: 'Growth Engineering', members: 11, permission: 'manage_users' },
  { name: 'Support Operations', members: 14, permission: 'read_audit' },
]

export const anomalySignals = [
  { id: 'an_801', type: 'impossible_travel', user: 'usr_1003', severity: 'high', confidence: '0.93' },
  { id: 'an_802', type: 'refresh_reuse', user: 'usr_1201', severity: 'high', confidence: '0.98' },
  { id: 'an_803', type: 'credential_stuffing_pattern', user: 'unknown', severity: 'medium', confidence: '0.79' },
]
