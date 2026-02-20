import { describe, expect, it } from 'vitest'

import {
  anomalySignals,
  dashboardMetrics,
  projects,
  providerStatuses,
  ssoProfiles,
  teams,
  users,
  webhooks,
} from './mock-data'

describe('dashboard mock data', () => {
  it('contains non-empty datasets for key admin surfaces', () => {
    expect(dashboardMetrics.length).toBeGreaterThan(0)
    expect(projects.length).toBeGreaterThan(0)
    expect(users.length).toBeGreaterThan(0)
    expect(webhooks.length).toBeGreaterThan(0)
    expect(providerStatuses.length).toBeGreaterThan(0)
    expect(ssoProfiles.length).toBeGreaterThan(0)
    expect(teams.length).toBeGreaterThan(0)
    expect(anomalySignals.length).toBeGreaterThan(0)
  })

  it('uses unique ids for keyed tables', () => {
    const ids = new Set<string>()
    for (const row of [...projects, ...users, ...webhooks, ...ssoProfiles, ...anomalySignals]) {
      if ('id' in row) {
        expect(ids.has(row.id)).toBe(false)
        ids.add(row.id)
      }
    }
  })
})
