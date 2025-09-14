import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | 고촌중학교 종달샘 허브',
    default: '고촌중학교 종달샘 허브',
  },
  description: '종달샘 허브에 오신 것을 환영합니다! 고촌중학교 학생들을 위한 공식 포인트 및 커뮤니티 플랫폼입니다.',
  openGraph: {
    title: '고촌중학교 종달샘 허브',
    description: '포인트, 커뮤니티, 미니게임까지! 고촌중 학생들을 위한 공간입니다.',
    images: ['/og-image.png'],
  },
};

function RootLayoutClient({ children }: { children: React.ReactNode }) {
  'use client';
  const pathname = usePathname();

  useEffect(() => {
    let theme = 'theme-student'; // Default theme
    if (pathname.startsWith('/teacher') || pathname.startsWith('/guide/teachers')) {
      theme = 'theme-teacher';
    }
    document.documentElement.className = theme;
  }, [pathname]);

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Gowun+Batang:wght@400;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <meta name="theme-color" content="#FF781F" />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8017235617839629"
     crossOrigin="anonymous"></script>
        
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-body antialiased">
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-0B6DFH42ML"></Script>
        <Script id="google-analytics">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-0B6DFH42ML');
          `}
        </Script>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
