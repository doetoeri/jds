'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Bird } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

// 감성 인터랙티브 아쿠아 오브 컴포넌트
const InteractiveAquaOrbs = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePointerMove = (e: PointerEvent) => {
      const { clientX, clientY } = e;
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      container.style.setProperty('--pointer-x', `${x}px`);
      container.style.setProperty('--pointer-y', `${y}px`);
    };

    container.addEventListener('pointermove', handlePointerMove);

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  const orbs = [
    // [top, left, size, text]
    ['5%', '15%', 80, '우정'],
    ['10%', '80%', 120, '꿈'],
    ['25%', '5%', 60, '추억'],
    ['30%', '90%', 90, '도전'],
    ['50%', '55%', 150, '열정'],
    ['60%', '10%', 100, '성장'],
    ['75%', '85%', 70, '미래'],
    ['85%', '20%', 110, '희망'],
  ];

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 -z-10 overflow-hidden"
      style={
        {
          '--pointer-x': '50%',
          '--pointer-y': '50%',
        } as React.CSSProperties
      }
    >
      {/* 스포트라이트 효과 */}
      <div className="pointer-events-none fixed inset-0 z-20 bg-[radial-gradient(400px_at_var(--pointer-x)_var(--pointer-y),rgba(255,85,0,0.15),transparent_80%)]" />

      {orbs.map(([top, left, size, text], i) => (
        <div
          key={i}
          className="aqua-orb-container group"
          style={{ top, left, width: `${size}px`, height: `${size}px` }}
        >
          <div className="aqua-orb-glow" />
          <div className="aqua-orb" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold text-white opacity-0 shadow-black/50 drop-shadow-lg transition-opacity duration-300 group-hover:opacity-100 sm:text-base">
            {text}
          </div>
        </div>
      ))}
    </div>
  );
};

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-transparent p-8 relative overflow-hidden">
      <style jsx global>{`
        .aqua-orb-container {
          position: absolute;
          transform: translate(-50%, -50%);
          filter: drop-shadow(0 0 20px hsl(var(--primary) / 0.3));
          transition: transform 0.3s ease-out;
        }
        .aqua-orb,
        .aqua-orb-glow {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          transition: all 0.3s ease-out;
        }
        .aqua-orb-glow {
          background: hsl(var(--primary) / 0.4);
          filter: blur(20px);
          transform: scale(0.9);
        }
        .aqua-orb {
          background: radial-gradient(
            circle at 30% 30%,
            hsl(var(--background) / 0.8),
            hsl(var(--primary) / 0.5) 80%
          );
          border: 1px solid hsl(var(--background) / 0.5);
          backdrop-filter: blur(4px);
        }
        .group:hover .aqua-orb {
          transform: scale(1.1);
          box-shadow: inset 0 0 20px hsl(var(--background) / 0.7),
            0 0 30px hsl(var(--primary) / 0.5);
        }
        .group:hover .aqua-orb-glow {
          transform: scale(1.1);
        }
      `}</style>
      <InteractiveAquaOrbs />
      <div className="text-center relative z-10">
        <div className="mb-8 inline-flex items-center justify-center rounded-full bg-primary/10 p-4 backdrop-blur-sm">
          <Bird className="h-12 w-12 text-primary" />
        </div>
        <h1 className="font-headline text-5xl font-bold text-primary drop-shadow-lg">
          종달샘 허브
        </h1>
        <p className="mt-4 max-w-md text-lg text-muted-foreground drop-shadow">
          고촌중학교 학생자치회 종달샘에 오신 것을 환영합니다. 포인트를
          관리하고 다양한 활동에 참여해보세요.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button asChild size="lg" className="font-bold">
            <Link href="/login">로그인</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="font-bold bg-background/50 backdrop-blur-sm"
          >
            <Link href="/signup">회원가입</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
