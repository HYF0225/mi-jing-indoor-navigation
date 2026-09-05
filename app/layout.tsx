import type { Metadata } from 'next';
import './globals.css';
import './digital-night.css';

export const metadata: Metadata = {
  title: '觅径 · 室内导航实验室',
  description: '选择展厅或三层商场，体验跨楼层路线、三维视频与路口确认。',
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
