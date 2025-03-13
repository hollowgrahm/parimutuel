'use client'

import { ThemeProvider } from 'next-themes'
import { NotificationProvider } from '../../providers/NotificationProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </ThemeProvider>
  )
} 