import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Near - AI 助手',
  description: '你的 AI 智能助手，随时为你解答问题、提供帮助',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css"
          media="(prefers-color-scheme: dark)"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css"
          media="(prefers-color-scheme: light)"
        />
      </head>
      <body className="dark:bg-[#1a1a2e] bg-slate-50 dark:text-[#e8e8f0] text-slate-800">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
