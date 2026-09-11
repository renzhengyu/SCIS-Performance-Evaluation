import type { Metadata } from 'next';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';
import GlobalImpersonationBanner from '@/components/GlobalImpersonationBanner';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'SCIS Staff Performance Evaluation Portal',
  description: 'Performance Evaluation System for Shanghai Community International School',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-50 antialiased" style={{ colorScheme: 'light' }}>
      <body className="min-h-full flex flex-col font-sans text-slate-900 bg-white">
        <SessionProvider>
          <GlobalImpersonationBanner />
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}
