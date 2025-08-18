'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Bird } from 'lucide-react';

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
}

const RippleEffect = () => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const animationFrameId = useRef<number>();
  const nextId = useRef(0);

  const createRipple = useCallback((x: number, y: number) => {
    const newRipple: Ripple = {
      id: nextId.current++,
      x,
      y,
      size: 0,
      opacity: 0.7,
    };
    setRipples(prev => [...prev, newRipple]);
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    createRipple(e.clientX, e.clientY);
  };
  
  const handleTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    createRipple(touch.clientX, touch.clientY);
  };

  useEffect(() => {
    const animate = () => {
      setRipples(currentRipples => {
        const updatedRipples = currentRipples.map(ripple => ({
          ...ripple,
          size: ripple.size + 2,
          opacity: ripple.opacity * 0.98,
        }));

        return updatedRipples.filter(ripple => ripple.opacity > 0.01);
      });
      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  return (
    <div 
      className="absolute inset-0 z-0 overflow-hidden" 
      onClick={handleClick}
      onTouchStart={handleTouch}
    >
      {ripples.map(({ id, x, y, size, opacity }) => (
        <div
          key={id}
          className="absolute rounded-full"
          style={{
            left: x,
            top: y,
            width: size,
            height: size,
            transform: 'translate(-50%, -50%)',
            opacity,
            backgroundColor: 'hsla(19, 100%, 50%, 0.3)',
            border: '2px solid hsl(19, 100%, 50%)',
          }}
        />
      ))}
    </div>
  );
};

export default function LandingPage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden flex items-center justify-center p-4 bg-transparent">
      
      <RippleEffect />

      <div className="relative z-10 flex flex-col items-center text-center">
         <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-orange-400/20 bg-orange-400/10 backdrop-blur-sm">
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
            className="font-bold w-full sm:w-auto"
          >
            <Link href="/signup">회원가입</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
