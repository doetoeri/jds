
'use client';

import { ChevronRight, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function HomePage() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 text-center overflow-hidden bg-primary text-black">
      <motion.div
        className="w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full flex flex-col sm:flex-row justify-center items-center gap-4">
          <Button
            asChild
            size="lg"
            className="font-bold w-full sm:w-auto bg-black text-primary hover:bg-black/80"
          >
            <Link href="/login">
              로그인하여 시작하기 <ChevronRight className="ml-2" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="ghost"
            className="w-full sm:w-auto bg-black text-primary hover:bg-black/80"
          >
            <Link href="/guide">
              <HelpCircle className="mr-2" /> 사용 가이드
            </Link>
          </Button>
        </div>
      </motion.div>

      <motion.div
        className="w-full select-none mt-auto"
        aria-hidden="true"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4, type: 'spring', stiffness: 100 }}
      >
        <svg
          viewBox="0 0 1100 220"
          preserveAspectRatio="xMidYMid meet"
          className="w-full"
        >
          <text
            x="50%"
            y="50%"
            dy=".35em"
            textAnchor="middle"
            className="font-batang font-black"
            style={{ fontSize: '180px', fill: 'black' }}
          >
            JongDalSam
          </text>
        </svg>
      </motion.div>
    </div>
  );
}
