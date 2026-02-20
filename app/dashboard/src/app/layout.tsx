import type { ReactNode } from 'react'
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google'

import './globals.css'

const headingFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--heading-font',
})

const monoFont = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--mono-font',
})

type RootLayoutProps = {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
  return (
    <html lang="en">
      <body className={`${headingFont.variable} ${monoFont.variable}`}>{children}</body>
    </html>
  )
}
