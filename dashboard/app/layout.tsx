import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ui/toast'
import { Navigation } from '@/components/Navigation'

// Use system fonts as fallback for offline builds
const fontClass = 'font-sans'

export const metadata: Metadata = {
  title: 'Dropship Monitor - Enterprise Dashboard',
  description: 'AI-powered dropshipping monitoring and automation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <ToastProvider>
          <Navigation>{children}</Navigation>
        </ToastProvider>
      </body>
    </html>
  )
}
