'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Gift } from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ParticleBackground } from '@/components/particle-background';

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
      
      <ParticleBackground />
      
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
        <motion.h1 
          variants={FADE_IN_ANIMATION_VARIANTS}
          className="font-headline text-6xl md:text-8xl font-bold text-gray-800 tracking-tighter">
          JongDalSam
        </motion.h1>
        <motion.p 
           variants={FADE_IN_ANIMATION_VARIANTS}
           className="mt-4 max-w-md text-lg text-gray-600">
          Welcome to the hub for Gochon Middle School's student council.
          Manage your points and participate in various activities.
        </motion.p>
        
        <motion.div
          variants={FADE_IN_ANIMATION_VARIANTS}
          className="mt-6 -mb-2"
        >
          {unusedCodeCount === null ? (
            <Skeleton className="h-10 w-64 rounded-lg" />
          ) : (
            <div className="flex items-center justify-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary backdrop-blur-sm animate-highlight-pulse">
              <Gift className="h-5 w-5" />
              <span>
                Find the hidden gifts! There are{' '}
                <span className="font-bold text-base">{unusedCodeCount}</span> unused codes around the school.
              </span>
            </div>
          )}
        </motion.div>

        <motion.div 
          variants={FADE_IN_ANIMATION_VARIANTS}
          className="mt-8 flex w-full flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="font-bold w-full sm:w-auto">
            <Link href="/login">Log In</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="font-bold w-full sm:w-auto bg-white/50"
          >
            <Link href="/signup">Sign Up</Link>
          </Button>
        </motion.div>
      </motion.div>
    </main>
  );
}
