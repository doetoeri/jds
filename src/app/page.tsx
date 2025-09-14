
import type { Metadata } from 'next';
import HomeClient from './home-client';

export const metadata: Metadata = {
  title: '홈',
  description: '종달샘 허브에 오신 것을 환영합니다! 고촌중학교 학생들을 위한 공식 포인트 및 커뮤니티 플랫폼입니다.',
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

export default function HomePage() {
  return <HomeClient />;
}
