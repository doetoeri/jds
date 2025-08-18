'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Bird } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

// 감성 인터랙티브 컴포넌트
const InteractiveOrbs = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const orbsRef = useRef<any[]>([]);
  const animationFrameId = useRef<number>();

  const keywords = ['우정', '꿈', '추억', '도전', '열정', '성장', '미래', '희망', '행복', '웃음'];

  useEffect(() => {
    const pointerPos = { x: -1000, y: -1000, isTouching: false };

    const handlePointerMove = (x: number, y: number) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        pointerPos.x = x - rect.left;
        pointerPos.y = y - rect.top;
        pointerPos.isTouching = true;
      }
    };
    
    const handleMouseMove = (event: MouseEvent) => handlePointerMove(event.clientX, event.clientY);
    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches[0]) {
        handlePointerMove(event.touches[0].clientX, event.touches[0].clientY);
      }
    };
    const handleMouseLeave = () => { pointerPos.isTouching = false; };
    const handleTouchEnd = () => { pointerPos.isTouching = false; };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchstart', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
    
    // Orb 초기화
    if (containerRef.current && orbsRef.current.length === 0) {
      orbsRef.current = Array.from({ length: 15 }, (_, i) => {
        const orbDiv = document.createElement('div');
        const keywordDiv = document.createElement('div');
        
        const size = 40 + Math.random() * 40;
        const targetOpacity = 0.2 + Math.random() * 0.4;

        orbDiv.className = "group absolute rounded-full transition-opacity duration-500 ease-out";
        orbDiv.style.width = `${size}px`;
        orbDiv.style.height = `${size}px`;
        orbDiv.style.background = `radial-gradient(circle at 30% 30%, hsl(var(--primary) / 0.5), hsl(var(--primary) / 0.1) 80%)`;
        orbDiv.style.boxShadow = 'inset 0 0 10px hsl(var(--primary-foreground) / 0.3), 0 0 20px hsl(var(--primary) / 0.2)';
        orbDiv.style.border = '1px solid hsl(var(--primary) / 0.3)';
        orbDiv.style.backdropFilter = 'blur(4px)';
        orbDiv.style.opacity = '0';
        orbDiv.style.willChange = 'transform, opacity';

        keywordDiv.className = "absolute inset-0 flex items-center justify-center text-white text-xs sm:text-sm font-bold opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 pointer-events-none";
        keywordDiv.textContent = keywords[i % keywords.length];
        
        orbDiv.appendChild(keywordDiv);
        containerRef.current?.appendChild(orbDiv);

        return {
          id: i,
          el: orbDiv,
          x: Math.random() * (containerRef.current?.clientWidth || 0),
          y: Math.random() * (containerRef.current?.clientHeight || 0),
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          opacity: 0,
          targetOpacity: targetOpacity,
        };
      });
    }

    const animate = () => {
      const container = containerRef.current;
      if (!container) {
          animationFrameId.current = requestAnimationFrame(animate);
          return;
      };

      orbsRef.current.forEach(orb => {
        let newVx = orb.vx;
        let newVy = orb.vy;

        // Pointer interaction
        if (pointerPos.isTouching) {
          const dx = pointerPos.x - orb.x;
          const dy = pointerPos.y - orb.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            const force = (1 - dist / 150) * 0.3;
            newVx -= dx * force * 0.05;
            newVy -= dy * force * 0.05;
          }
        }
        
        orb.x += newVx;
        orb.y += newVy;
        
        // Wall bouncing
        if (orb.x < 0 || orb.x > container.clientWidth) newVx *= -1;
        if (orb.y < 0 || orb.y > container.clientHeight) newVy *= -1;

        // Damping
        newVx *= 0.99;
        newVy *= 0.99;
        
        orb.vx = newVx;
        orb.vy = newVy;
        
        // Update opacity
        if (Math.abs(orb.opacity - orb.targetOpacity) > 0.01) {
            orb.opacity += (orb.targetOpacity - orb.opacity) * 0.05;
            orb.el.style.opacity = `${orb.opacity}`;
        }

        // Apply transform
        orb.el.style.transform = `translate(${orb.x}px, ${orb.y}px) translate(-50%, -50%)`;
      });
      animationFrameId.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      // Cleanup DOM elements
      orbsRef.current.forEach(orb => {
        if(orb.el.parentNode) {
            orb.el.parentNode.removeChild(orb.el);
        }
      });
      orbsRef.current = [];
    };
  }, [keywords]);

  return (
    <div ref={containerRef} className="absolute inset-0 -z-10 overflow-hidden" />
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
