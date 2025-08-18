'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Bird } from 'lucide-react';

const ParticleWaveCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();
  const particles = useRef<any[]>([]);
  const mouse = useRef({ x: -1000, y: -1000, radius: 60 });

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    particles.current = [];
    const gap = 25;
    for (let x = 0; x < rect.width; x += gap) {
      for (let y = 0; y < rect.height; y += gap) {
        particles.current.push({
          x: x,
          y: y,
          ox: x, // original x
          oy: y, // original y
          vx: 0,
          vy: 0,
        });
      }
    }
  }, []);

  useEffect(() => {
    initCanvas();
    window.addEventListener('resize', initCanvas);

    const animate = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      particles.current.forEach(p => {
        const dx = p.x - mouse.current.x;
        const dy = p.y - mouse.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const forceDirectionX = dx / dist;
        const forceDirectionY = dy / dist;
        
        const maxDistance = mouse.current.radius;
        const force = (maxDistance - dist) / maxDistance;
        
        // Spring force to return to original position
        const springForceX = (p.ox - p.x) * 0.08;
        const springForceY = (p.oy - p.y) * 0.08;

        if (dist < maxDistance) {
            p.vx += forceDirectionX * force * 2.5 + springForceX;
            p.vy += forceDirectionY * force * 2.5 + springForceY;
        } else {
            p.vx += springForceX;
            p.vy += springForceY;
        }

        p.vx *= 0.92;
        p.vy *= 0.92;
        p.x += p.vx;
        p.y += p.vy;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'hsl(19, 100%, 70%)';
        ctx.fill();
      });

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      window.removeEventListener('resize', initCanvas);
    };
  }, [initCanvas]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    mouse.current.x = e.clientX;
    mouse.current.y = e.clientY;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      mouse.current.x = e.touches[0].clientX;
      mouse.current.y = e.touches[0].clientY;
    }
  };

   const handleMouseLeave = () => {
    mouse.current.x = -1000;
    mouse.current.y = -1000;
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0"
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseLeave}
      onMouseLeave={handleMouseLeave}
    />
  );
};


export default function LandingPage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden flex items-center justify-center p-4 bg-transparent isolate">
      
      <ParticleWaveCanvas />
      
      <div className="relative z-10 flex flex-col items-center text-center">
         <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10 backdrop-blur-sm">
          <Bird className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-headline text-5xl md:text-6xl font-bold text-gray-800">
          종달샘 허브
        </h1>
        <p className="mt-4 max-w-md text-lg text-gray-600">
          고촌중학교 학생자치회 종달샘에 오신 것을 환영합니다. 포인트를
          관리하고 다양한 활동에 참여해보세요.
        </p>
        <div className="mt-8 flex w-full flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="font-bold w-full sm:w-auto">
            <Link href="/login">로그인</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="font-bold w-full sm:w-auto bg-white/50"
          >
            <Link href="/signup">회원가입</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
