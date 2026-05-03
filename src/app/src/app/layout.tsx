import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'The Invisible Rule',
  description: 'A belief you have carried most of your life is still making your choices for you. And you have no idea it is there.',
  openGraph: {
    title: 'The Invisible Rule',
    description: 'You keep starting over. But nothing changes. Discover the hidden belief that has been running your life.',
    url: 'https://invisible-rule.vercel.app',
    siteName: 'The Invisible Rule',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Invisible Rule',
    description: 'You keep starting over. But nothing changes. Discover the hidden belief that has been running your life.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className + ' bg-slate-900 text-white antialiased'}>
        {children}
      </body>
    </html>
  );
}
