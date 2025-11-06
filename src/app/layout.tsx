import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import Script from 'next/script';
import type { Metadata } from 'next';
import RootLayoutClient from '@/components/root-layout-client';
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: {
    template: '%s | 고촌중학교 종달샘 허브',
    default: '고촌중학교 종달샘 허브',
  },
  description: '고촌중학교 학생들을 위한 공식 포인트 및 커뮤니티 플랫폼, 종달샘 허브입니다. 친구들과 소통하고, 미니게임을 즐기며 포인트를 쌓아보세요.',
  keywords: ['종달샘', '고촌중', '고촌중학교', '종달샘 허브', '포인트', '커뮤니티', '학생회'],
  openGraph: {
    title: '고촌중학교 종달샘 허브',
    description: '포인트, 커뮤니티, 미니게임까지! 고촌중 학생들을 위한 공간입니다.',
    images: ['/og-image.png'],
  },
   twitter: {
    card: 'summary_large_image',
    title: '고촌중학교 종달샘 허브',
    description: '포인트, 커뮤니티, 미니게임까지! 고촌중 학생들을 위한 공간입니다.',
    images: ['/og-image.png'],
  },
};


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
        
        {/* Google Analytics */}
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-0B6DFH42ML"></Script>
        <Script id="google-analytics">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-0B6DFH42ML');
          `}
        </Script>
      </head>
      <body className="font-body antialiased">
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <filter id="frosted" primitiveUnits="objectBoundingBox">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.02" result="blur"/>
            <feDisplacementMap in="blur" in2="SourceGraphic" scale="0.02" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </svg>
        <RootLayoutClient>{children}</RootLayoutClient>
        <Analytics />
      </body>
    </html>
  );
}
