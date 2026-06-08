import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'YuGiOh Stock Monitor',
  description: 'Monitoreo de disponibilidad de cartas YuGiOh',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: 0, background: '#0f0f0f', color: '#e0e0e0' }}>
        {children}
      </body>
    </html>
  )
}
