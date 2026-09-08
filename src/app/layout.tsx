import type { Metadata } from 'next';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';

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
    <html lang="en" className="h-full bg-slate-50 antialiased">
      <body className="min-h-full flex flex-col font-sans text-slate-900">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
