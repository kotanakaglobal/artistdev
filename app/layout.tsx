import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from '@/components/navigation';

export const metadata: Metadata = {
  title: 'Artist Scout MVP',
  description: '来そうな音楽アーティストを記録し、的中判定とランキングを可視化するMVP'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <main className="container">
          <Navigation />
          <div className="stack">{children}</div>
        </main>
      </body>
    </html>
  );
}
