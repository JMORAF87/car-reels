import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Car Reels Creator',
  description: 'Create viral car dealership reels for TikTok & Instagram',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
