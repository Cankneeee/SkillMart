import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { Montserrat, Roboto } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import NavigationBar from '@/components/NavigationBar';
import { AuthProvider } from '@/context/AuthContext';
import { UserProvider } from "@/context/UserContext";
import Chatbot from '@/components/Chatbot';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-montserrat',
});

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-roboto',
});

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Prevents zooming on iOS when tapping inputs
};

export const metadata: Metadata = {
  title: {
    default: 'SkillMart - Learn, Share, Trade Skills',
    template: '%s | SkillMart'
  },
  description: 'A skills-sharing marketplace where passionate individuals connect to exchange knowledge and services.',
  keywords: [
    'skills marketplace', 
    'skill sharing', 
    'freelance', 
    'learning platform', 
    'skill trading'
  ],
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/favicon.ico',
    shortcut: '/icons/android-chrome-192x192.png',
    apple: '/icons/apple-touch-icon.png'
  },
  // Enhanced PWA support for Apple devices
  appleWebApp: {
    capable: true,
    title: 'SkillMart',
    statusBarStyle: 'black-translucent'
  },
  openGraph: {
    title: 'SkillMart - Skill Sharing Platform',
    description: 'Connect, Learn, and Trade Skills with Experts',
    type: 'website',
    locale: 'en_US',
    url: 'https://skillmart.com',
    siteName: 'SkillMart'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large'
    }
  },
  verification: {
    google: ''
  },
  alternates: {
    canonical: 'https://skillmart.com'
  },
  generator: 'Next.js',
  applicationName: 'SkillMart'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} ${roboto.variable}`}>
      <head>
        {/* PWA-specific meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="application-name" content="SkillMart" />
      </head>
      <body>
        <AuthProvider>
          <UserProvider>
            <NavigationBar />
            <main className="min-h-screen">{children}</main>
            <Chatbot />
            {/* Add offline fallback notification */}
            <div id="offline-notification" style={{ display: 'none', position: 'fixed', bottom: '0', width: '100%', background: '#f8d7da', padding: '10px', textAlign: 'center', zIndex: '9999' }}>
              You are currently offline. Some features may be limited.
            </div>
          </UserProvider>
        </AuthProvider>
        
        {/* Optional: Script to detect and notify about offline status */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if (typeof window !== 'undefined') {
              window.addEventListener('online', () => {
                document.getElementById('offline-notification').style.display = 'none';
              });
              window.addEventListener('offline', () => {
                document.getElementById('offline-notification').style.display = 'block';
              });
            }
          `
        }} />
      </body>
    </html>
  );
}