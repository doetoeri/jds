
'use client';

import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { motion } from 'framer-motion';

const leftVariants = {
    hidden: { opacity: 0, x: -100 },
    visible: { 
        opacity: 1, 
        x: 0,
        transition: { 
            duration: 0.8,
            ease: [0.25, 1, 0.5, 1] 
        }
    }
};

const rightVariants = {
    hidden: { opacity: 0, x: 100 },
    visible: { 
        opacity: 1, 
        x: 0,
        transition: { 
            duration: 0.8,
            delay: 0.2,
            ease: [0.25, 1, 0.5, 1] 
        }
    }
};

export default function HomeClient() {
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen overflow-hidden">
      <motion.div
        className="flex items-center justify-center bg-primary"
        variants={leftVariants}
        initial="hidden"
        animate="visible"
      >
        <svg
          viewBox="0 0 1100 220"
          preserveAspectRatio="xMidYMid meet"
          className="w-full max-w-2xl px-8"
        >
          <text
            x="50%"
            y="50%"
            dy=".35em"
            textAnchor="middle"
            className="font-batang font-black"
            style={{ fontSize: '180px', fill: 'hsl(var(--primary-foreground))' }}
          >
            JongDalSam
          </text>
        </svg>
      </motion.div>
      
      <motion.div 
        className="flex flex-col items-center justify-center p-8 text-center"
        variants={rightVariants}
        initial="hidden"
        animate="visible"
      >
         <div className="max-w-xs w-full space-y-6">
             <h2 className="text-3xl font-bold font-headline">종달샘 허브에 오신 것을 환영합니다.</h2>
              <Button
                asChild
                size="lg"
                className="font-bold w-full"
              >
                <Link href="/login">
                  로그인하여 시작하기 <ChevronRight className="ml-2" />
                </Link>
              </Button>
         </div>
      </motion.div>
    </div>
  );
}
