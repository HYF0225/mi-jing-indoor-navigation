import type { Metadata } from 'next';
import './globals.css';
import './digital-night.css';

export const metadata: Metadata = {
  title: '觅径 · 室内导航实验室',
  description: '在公开展厅模型中体验路线规划、三维预览与路口确认。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body>
        {children}
      </body>
    </html>
  );
}
