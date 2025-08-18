'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Bird } from 'lucide-react';

// A component to create a realistic, interactive liquid effect
const LiquidCanvas = () => {
  const [blobs, setBlobs] = useState<any[]>([]);
  const animationFrameId = useRef<number>();
  const lastAddTime = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });

  const updatePointer = useCallback((x: number, y: number) => {
    pointer.current = { x, y };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    updatePointer(e.clientX, e.clientY);
  }, [updatePointer]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    updatePointer(touch.clientX, touch.clientY);
  }, [updatePointer]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    const animate = (time: number) => {
      // Add a new blob periodically based on pointer movement
      if (time - lastAddTime.current > 50) {
        lastAddTime.current = time;
        if (pointer.current.x !== 0 || pointer.current.y !== 0) { // Only add if pointer has moved
            setBlobs(prevBlobs => {
                const newBlob = {
                    id: time,
                    x: pointer.current.x,
                    y: pointer.current.y,
                    size: 40 + Math.random() * 40, // Random size for more organic look
                    opacity: 1,
                    createdAt: time,
                };
                return [...prevBlobs, newBlob];
            });
        }
      }

      // Update size and opacity of existing blobs
      setBlobs(currentBlobs => {
        const updatedBlobs = currentBlobs.map(blob => {
            const age = (time - blob.createdAt) / 1000; // age in seconds
            const opacity = Math.max(0, 1 - age * 0.8); // Fades out over ~1.25 seconds
            const size = Math.max(0, blob.size * (1 - age * 0.5));
            return {...blob, opacity, size};
        });
        
        // Filter out blobs that have faded away
        return updatedBlobs.filter(blob => blob.opacity > 0 && blob.size > 0);
      });

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [handleMouseMove, handleTouchMove]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden" style={{ filter: 'url(#goo)' }}>
      {blobs.map(({ id, x, y, size, opacity }) => (
        <div
          key={id}
          className="absolute rounded-full bg-primary/50"
          style={{
            left: x,
            top: y,
            width: size,
            height: size,
            transform: 'translate(-50%, -50%)',
            opacity,
            willChange: 'transform, opacity, width, height',
          }}
        />
      ))}
    </div>
  );
};


export default function LandingPage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden flex items-center justify-center p-4 bg-transparent isolate">
      
      <LiquidCanvas />

      {/* SVG filter for the "gooey" effect */}
      <svg className="absolute w-0 h-0">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      
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
