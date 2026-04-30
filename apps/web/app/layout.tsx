import type { Metadata } from 'next'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import Providers from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'FreeColors ERP',
  description: 'Sistema de gestión — Pinturerias FreeColors',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Providers>
          <AuthProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  )
}
