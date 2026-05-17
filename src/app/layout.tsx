import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'ADITYA .ai | Kling V3 Pro Motion Control',
  description: 'Future of Motion Control. AI premium video production tool.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="bg-mesh"></div>
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(15, 35, 60, 0.9)',
              backdropFilter: 'blur(12px)',
              color: '#EAF4FF',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '16px'
            },
          }}
        />
        {children}
      </body>
    </html>
  )
}
