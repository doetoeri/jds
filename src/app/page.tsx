'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Bird } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

// 감성 인터랙티브 컴포넌트
const InteractiveOrbs = () => {
  const [orbs, setOrbs] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerPos = useRef({ x: -1000, y: -1000, isTouching: false });

  const keywords = ['우정', '꿈', '추억', '도전', '열정', '성장', '미래', '희망', '행복', '웃음'];

  useEffect(() => {
    const handlePointerMove = (x: number, y: number) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        pointerPos.current = { 
          x: x - rect.left, 
          y: y - rect.top,
          isTouching: true
        };
      }
    };
    
    const handleMouseMove = (event: MouseEvent) => {
      handlePointerMove(event.clientX, event.clientY);
    };
    
    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches[0]) {
        handlePointerMove(event.touches[0].clientX, event.touches[0].clientY);
      }
    };

    const handleTouchEnd = () => {
      pointerPos.current.isTouching = false;
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleTouchMove);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);


    const initialOrbs = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: 40 + Math.random() * 40,
      keyword: keywords[i % keywords.length],
      opacity: 0,
      targetOpacity: 0.2 + Math.random() * 0.4
    }));
    setOrbs(initialOrbs);

    let animationFrameId: number;
    const animate = () => {
      setOrbs(currentOrbs =>
        currentOrbs.map(orb => {
          if (!containerRef.current) return orb;
          
          let newVx = orb.vx;
          let newVy = orb.vy;
          let newX = orb.x + newVx;
          let newY = orb.y + newVy;

          // Wall bouncing
          if (newX < 0 || newX > containerRef.current.clientWidth) newVx *= -1;
          if (newY < 0 || newY > containerRef.current.clientHeight) newVy *= -1;
          
          // Pointer interaction
          if (pointerPos.current.isTouching) {
            const dx = pointerPos.current.x - newX;
            const dy = pointerPos.current.y - newY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
              const force = (1 - dist / 150) * 0.3;
              newVx -= dx * force * 0.05;
              newVy -= dy * force * 0.05;
            }
          }

          // Damping
          newVx *= 0.99;
          newVy *= 0.99;

          return {
            ...orb,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
            opacity: orb.opacity + (orb.targetOpacity - orb.opacity) * 0.1
          };
        })
      );
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouchMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 -z-10 overflow-hidden">
      {orbs.map(orb => (
        <div
          key={orb.id}
          className="group absolute rounded-full transition-all duration-300 ease-out"
          style={{
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            opacity: orb.opacity,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle at 30% 30%, hsl(var(--primary) / 0.5), hsl(var(--primary) / 0.1) 80%)`,
            boxShadow: 'inset 0 0 10px hsl(var(--primary-foreground) / 0.3), 0 0 20px hsl(var(--primary) / 0.2)',
            border: '1px solid hsl(var(--primary) / 0.3)',
            backdropFilter: 'blur(4px)',
          }}
        >
           <div className="absolute inset-0 flex items-center justify-center text-white text-xs sm:text-sm font-bold opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 pointer-events-none">
             {orb.keyword}
           </div>
        </div>
      ))}
    </div>
  );
};


export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-transparent p-8 relative overflow-hidden">
       <InteractiveOrbs />
      <div className="text-center relative z-10">
        <div className="mb-8 inline-flex items-center justify-center rounded-full bg-primary/10 p-4 backdrop-blur-sm">
          <Bird className="h-12 w-12 text-primary" />
        </div>
        <h1 className="font-headline text-5xl font-bold text-primary drop-shadow-lg">
          종달샘 허브
        </h1>
        <p className="mt-4 max-w-md text-lg text-muted-foreground drop-shadow">
          고촌중학교 학생자치회 종달샘에 오신 것을 환영합니다.
          포인트를 관리하고 다양한 활동에 참여해보세요.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button asChild size="lg" className="font-bold">
            <Link href="/login">로그인</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="font-bold bg-background/50 backdrop-blur-sm">
            <Link href="/signup">회원가입</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
