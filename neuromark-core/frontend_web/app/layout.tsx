import './globals.css'

export const metadata = {
  title: 'NeuroMark | Enterprise Cyber-Security Hub',
  description: 'Adversarial Neural Watermarking & Forensics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-cyber-900 bg-grid-pattern overflow-x-hidden" style={{backgroundSize: '40px 40px'}}>
        <div className="absolute inset-0 bg-gradient-to-t from-cyber-900 via-transparent to-cyber-900 z-[-1]" />
        {children}
      </body>
    </html>
  )
}
