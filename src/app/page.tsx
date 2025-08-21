'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Bird, Gift } from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

// A single ripple wave
class Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  life: number;

  constructor(x: number, y: number, maxRadius: number, speed: number) {
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.maxRadius = maxRadius;
    this.speed = speed;
    this.life = 1; // Represents opacity
  }

  update() {
    this.radius += this.speed;
    if (this.radius > this.maxRadius) {
      this.life = 0;
    }
  }

  // We don't draw the ripple itself, it only affects particles
}

// A single particle in the grid
class Particle {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  alpha: number;

  constructor(x: number, y: number, size: number) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.baseAlpha = 0; // Invisible by default
    this.alpha = this.baseAlpha;
  }

  update(ripples: Ripple[]) {
    let touched = false;
    for (let i = 0; i < ripples.length; i++) {
      const dx = this.x - ripples[i].x;
      const dy = this.y - ripples[i].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const rippleRadius = ripples[i].radius;
      const waveWidth = 50; // How wide the visible wave is

      // Check if the particle is within the wave band
      if (distance < rippleRadius && distance > rippleRadius - waveWidth) {
        touched = true;
        // The closer to the wave front, the brighter
        const intensity = 1 - (rippleRadius - distance) / waveWidth;
        this.alpha = Math.max(this.alpha, intensity * 0.8);
      }
    }

    // If not touched by any ripple, fade back to base alpha
    if (this.alpha > this.baseAlpha) {
      this.alpha -= 0.02; // Fade out speed
    } else {
      this.alpha = this.baseAlpha;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.alpha <= 0) return; // Don't draw if invisible
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(19, 100%, 50%, ${this.alpha})`;
    ctx.fill();
  }
}

const ParticleCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();
  const particles = useRef<Particle[]>([]);
  const ripples = useRef<Ripple[]>([]);
  
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
    ripples.current = [];

    const gap = 12; // Make particles smaller and denser
    for (let x = 0; x < rect.width; x += gap) {
      for (let y = 0; y < rect.height; y += gap) {
        particles.current.push(new Particle(x, y, 1.2));
      }
    }
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
     const canvas = canvasRef.current;
     if (!canvas) return;
     const rect = canvas.getBoundingClientRect();

     const getCoords = (event: typeof e): {x: number, y: number} => {
        if ('touches' in event && event.touches.length > 0) {
            return { x: event.touches[0].clientX, y: event.touches[0].clientY };
        }
        if ('clientX' in event) {
            return { x: event.clientX, y: event.clientY };
        }
        return { x: 0, y: 0 }; // Fallback
     }

     const {x: clientX, y: clientY} = getCoords(e);
     
     const x = clientX - rect.left;
     const y = clientY - rect.top;

     ripples.current.push(new Ripple(x, y, Math.max(rect.width, rect.height) * 1.2, 4));
  };
  
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

      // Update and remove dead ripples
      for (let i = ripples.current.length - 1; i >= 0; i--) {
        const r = ripples.current[i];
        r.update();
        if (r.life <= 0) {
          ripples.current.splice(i, 1);
        }
      }

      // Update and draw particles
      particles.current.forEach(p => {
        p.update(ripples.current);
        p.draw(ctx);
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

  return (
    <div
      className="absolute inset-0 z-0"
      onClick={handleClick}
      onTouchStart={handleClick}
    >
        <canvas
            ref={canvasRef}
            className="h-full w-full"
        />
    </div>
  );
};


export default function LandingPage() {
  const [unusedCodeCount, setUnusedCodeCount] = useState<number | null>(null);

  const FADE_IN_ANIMATION_VARIANTS = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' } },
  };

  useEffect(() => {
    const q = query(
      collection(db, 'codes'),
      where('type', '==', '종달코드'),
      where('used', '==', false)
    );

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        setUnusedCodeCount(snapshot.size);
      },
      error => {
        console.error('Error fetching unused code count:', error);
        setUnusedCodeCount(0);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-transparent isolate">
      
      <ParticleCanvas />
      
      <motion.div 
        className="relative z-10 flex min-h-screen flex-col items-center justify-center text-center p-4"
        initial="hidden"
        animate="show"
        viewport={{ once: true }}
        variants={{
          hidden: {},
          show: {
            transition: {
              staggerChildren: 0.15,
            },
          },
        }}
      >
        <motion.div
          variants={FADE_IN_ANIMATION_VARIANTS}
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10 backdrop-blur-sm">
          <Bird className="h-8 w-8 text-primary" />
        </motion.div>
        <motion.h1 
          variants={FADE_IN_ANIMATION_VARIANTS}
          className="font-headline text-5xl md:text-6xl font-bold text-gray-800">
          종달샘 허브
        </motion.h1>
        <motion.p 
           variants={FADE_IN_ANIMATION_VARIANTS}
           className="mt-4 max-w-md text-lg text-gray-600">
          고촌중학교 학생자치회 종달샘에 오신 것을 환영합니다. 포인트를
          관리하고 다양한 활동에 참여해보세요.
        </motion.p>
        
        <motion.div
          variants={FADE_IN_ANIMATION_VARIANTS}
          className="mt-6 -mb-2"
        >
          {unusedCodeCount === null ? (
            <Skeleton className="h-10 w-64 rounded-lg" />
          ) : (
            <div className="flex items-center justify-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary backdrop-blur-sm">
              <Gift className="h-5 w-5" />
              <span>
                찾아보세요! 학교에 숨겨진 종달새의 선물{' '}
                <span className="font-bold text-base">{unusedCodeCount}</span>개
              </span>
            </div>
          )}
        </motion.div>

        <motion.div 
          variants={FADE_IN_ANIMATION_VARIANTS}
          className="mt-8 flex w-full flex-col gap-4 sm:flex-row sm:justify-center">
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
        </motion.div>
      </motion.div>
    </main>
  );
}
