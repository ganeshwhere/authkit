'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const navItems = [
  { href: '/', label: 'Overview' },
  { href: '/projects', label: 'Projects' },
  { href: '/users', label: 'Users' },
  { href: '/sessions', label: 'Sessions' },
  { href: '/webhooks', label: 'Webhooks' },
  { href: '/audit', label: 'Audit' },
  { href: '/providers', label: 'Providers' },
  { href: '/sso', label: 'SAML SSO' },
  { href: '/orgs', label: 'Organizations' },
  { href: '/anomaly', label: 'Anomaly Signals' },
]

type DashboardShellProps = {
  children: ReactNode
}

export function DashboardShell({ children }: DashboardShellProps): JSX.Element {
  const pathname = usePathname()

  return (
    <div className="dashboard-root">
      <aside className="sidebar">
        <div className="brand">
          AuthKit
          <small>Control Plane</small>
        </div>
        <ul className="nav-list">
          {navItems.map((item) => {
            const isActive = pathname === item.href

            return (
              <li key={item.href}>
                <Link className={`nav-link${isActive ? ' active' : ''}`} href={item.href}>
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </aside>
      <section className="content">{children}</section>
    </div>
  )
}
