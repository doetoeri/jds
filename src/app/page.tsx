'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Bird } from 'lucide-react';

const Orb = () => {
  const orbRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number>();
  const [isMobile, setIsMobile] = useState(false);

  // Position and velocity for physics simulation
  const pos = useRef({ x: 0, y: 0 });
  const vel = useRef({ x: 0, y: 0 });
  const acc = useRef({ x: 0, y: 0 });

  // Handle device orientation for mobile
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    // Android and iOS handle gamma/beta differently
    const isIOS = typeof (window as any).DeviceOrientationEvent.requestPermission === 'function';
    const gamma = event.gamma || 0; // -90 to 90 (left-right)
    const beta = event.beta || 0;   // -180 to 180 (front-back)

    // Normalize acceleration values
    let ax = gamma / 45;
    let ay = (beta - 45) / 45; // Start with a baseline for Android

    if (isIOS) {
      ay = beta / 90; // Different scaling for iOS
    }
    
    acc.current = { x: ax, y: ay };
  }, []);
  
  // Handle mouse movement for desktop
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!orbRef.current || isMobile) return;
    const { clientX, clientY } = event;
    const { left, top, width, height } = orbRef.current.getBoundingClientRect();
    const x = ((clientX - left) / width) * 100;
    const y = ((clientY - top) / height) * 100;
    orbRef.current.style.setProperty('--highlight-x', `${x}%`);
    orbRef.current.style.setProperty('--highlight-y', `${y}%`);
  }, [isMobile]);


  useEffect(() => {
    const checkIsMobile = () => window.matchMedia("(max-width: 768px)").matches;
    const mobileCheck = checkIsMobile();
    setIsMobile(mobileCheck);

    const orb = orbRef.current;
    if (orb) {
      // Initialize position
      pos.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      // Set initial transform to avoid flicker
      orb.style.transform = `translate(${pos.current.x - orb.offsetWidth / 2}px, ${pos.current.y - orb.offsetHeight / 2}px)`;
    }
    
    // Permission request for iOS 13+
    const requestOrientationPermission = async () => {
      if (typeof (window as any).DeviceOrientationEvent.requestPermission === 'function') {
        try {
          const permission = await (window as any).DeviceOrientationEvent.requestPermission();
          if (permission === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        } catch (error) {
          console.error("Device orientation permission request failed:", error);
        }
      } else {
         window.addEventListener('deviceorientation', handleOrientation);
      }
    };
    
    if (mobileCheck) {
        requestOrientationPermission();
    } else {
        window.addEventListener('mousemove', handleMouseMove);
    }

    // Physics loop
    const animate = () => {
      if (orb && mobileCheck) {
        const friction = 0.98;
        vel.current.x += acc.current.x;
        vel.current.y += acc.current.y;
        vel.current.x *= friction;
        vel.current.y *= friction;
        pos.current.x += vel.current.x;
        pos.current.y += vel.current.y;

        // Collision detection with viewport edges
        const orbRadius = orb.offsetWidth / 2;
        if (pos.current.x < orbRadius) {
            pos.current.x = orbRadius;
            vel.current.x *= -0.7;
        }
        if (pos.current.x > window.innerWidth - orbRadius) {
            pos.current.x = window.innerWidth - orbRadius;
            vel.current.x *= -0.7;
        }
        if (pos.current.y < orbRadius) {
            pos.current.y = orbRadius;
            vel.current.y *= -0.7;
        }
        if (pos.current.y > window.innerHeight - orbRadius) {
            pos.current.y = window.innerHeight - orbRadius;
            vel.current.y *= -0.7;
        }
        
        orb.style.transform = `translate(${pos.current.x - orbRadius}px, ${pos.current.y - orbRadius}px)`;
      }
      animationFrameId.current = requestAnimationFrame(animate);
    };
    
    // Start the animation loop regardless
    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [handleOrientation, handleMouseMove]);

  return (
    <div ref={orbRef} className="orb-container">
      <div className="orb"></div>
    </div>
  );
};


export default function LandingPage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden flex items-center justify-center p-4 bg-transparent">

      <Orb />

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

       <style jsx global>{`
        .orb-container {
          --highlight-x: 50%;
          --highlight-y: 50%;
          position: absolute;
          top: 0;
          left: 0;
          transform-style: preserve-3d;
          pointer-events: none;
          z-index: 0;
        }

        .orb {
            width: 300px;
            height: 300px;
            border-radius: 50%;
            background: radial-gradient(
                circle at var(--highlight-x) var(--highlight-y),
                hsla(25, 100%, 80%, 0.9),
                hsl(19, 100%, 50%) 60%
            );
            box-shadow:
                inset 0 -20px 40px hsla(19, 100%, 30%, 0.5), /* Inner shadow for depth */
                inset 0 20px 30px hsla(25, 100%, 80%, 0.8), /* Inner highlight */
                0 10px 50px hsla(0, 0%, 0%, 0.2);     /* Outer shadow */
            transition: transform 0.1s ease-out;
        }

        @media (max-width: 768px) {
            .orb {
                width: 200px;
                height: 200px;
            }
            .orb-container {
                /* On mobile, the container takes the whole screen for physics */
                width: 100vw;
                height: 100vh;
            }
        }

        @media (min-width: 769px) {
            .orb-container {
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }
        }
      `}</style>
    </main>
  );
}
