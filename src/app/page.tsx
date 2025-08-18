'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Bird } from 'lucide-react';

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
    // Fade out as it expands
    if (this.radius > this.maxRadius * 0.3) {
       this.life -= 0.015;
    }
    if (this.life < 0) {
      this.life = 0;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.life <= 0) return;

    // Draw the main ripple point (Glassmorphism feel)
    ctx.beginPath();
    ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(19, 100%, 70%, ${this.life * 0.8})`;
    ctx.shadowColor = `hsl(19, 100%, 60%)`;
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0; // Reset shadow for particles
  }
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
    this.baseAlpha = 0;
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
        this.alpha = intensity * 0.8;
      }
    }

    // If not touched by any ripple, fade back to base alpha
    if (!touched) {
      if (this.alpha > this.baseAlpha) {
        this.alpha -= 0.02; // Fade out speed
      } else {
        this.alpha = this.baseAlpha;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.alpha <= 0) return; // Don't draw if invisible
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(19, 100%, 70%, ${this.alpha})`;
    ctx.fill();
  }
}

const ParticleCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();
  const particles = useRef<Particle[]>([]);
  const ripples = useRef<Ripple[]>([]);
  const dpr = useRef(1);
  
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    dpr.current = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr.current;
    canvas.height = rect.height * dpr.current;
    ctx.scale(dpr.current, dpr.current);
    
    particles.current = [];
    ripples.current = [];

    const gap = 20; // How dense the particles are
    for (let x = 0; x < rect.width; x += gap) {
      for (let y = 0; y < rect.height; y += gap) {
        particles.current.push(new Particle(x, y, 1.5));
      }
    }
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
     const rect = e.currentTarget.getBoundingClientRect();
     const x = e.clientX - rect.left;
     const y = e.clientY - rect.top;
     ripples.current.push(new Ripple(x, y, Math.max(rect.width, rect.height), 2));
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

      // Update and draw ripples
      for (let i = ripples.current.length - 1; i >= 0; i--) {
        const r = ripples.current[i];
        r.update();
        r.draw(ctx);
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
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0"
      onClick={handleClick}
    />
  );
};


export default function LandingPage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden flex items-center justify-center p-4 bg-transparent isolate">
      
      <ParticleCanvas />
      
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
