import type { Metadata } from 'next'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import Providers from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Freecolors',
  description: 'Sistema de gestión — Pinturerias Freecolors',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
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
