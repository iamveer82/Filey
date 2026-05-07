import './globals.css';
import Providers from '@/components/dashboard/Providers';

export const metadata = {
  metadataBase: new URL('https://filey.ae'),
  title: {
    default: 'Filey · Private, offline-first finance copilot for UAE',
    template: '%s · Filey',
  },
  description: 'Scan receipts, invoice clients, track VAT, ask AI — all offline-first and private. Built for freelancers and SMBs in the UAE. Free forever.',
  keywords: ['UAE finance app', 'VAT tracker UAE', 'FTA invoice', 'AI accountant', 'receipt scanner UAE', 'offline finance app', 'freelancer invoice Dubai', 'bring your own AI'],
  authors: [{ name: 'Filey Technologies' }],
  creator: 'Filey',
  publisher: 'Filey',
  applicationName: 'Filey',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Filey',
  },
  formatDetection: { telephone: false, email: false, address: false },
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Filey · Private finance copilot for UAE freelancers',
    description: 'Offline-first receipts, invoices, VAT reports and AI. Free forever. Your data stays on your device.',
    url: 'https://filey.ae',
    siteName: 'Filey',
    locale: 'en_AE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Filey · Private finance copilot for UAE',
    description: 'Scan receipts, invoice clients, track VAT — offline-first, BYO AI. Free forever.',
    creator: '@fileyapp',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F8FA' },
    { media: '(prefers-color-scheme: dark)',  color: '#0B1220' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Filey" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="antialiased overscroll-none">
        <Providers>{children}</Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
