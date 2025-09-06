
'use client';

import { ChevronRight, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.3,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 12,
    },
  },
};

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center overflow-hidden">
      <motion.div
        className="flex flex-col items-center justify-center gap-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="w-full select-none"
          aria-hidden="true"
          variants={itemVariants}
        >
          <svg
            viewBox="0 0 1100 220"
            preserveAspectRatio="xMidYMid meet"
            className="w-full max-w-2xl"
          >
            <text
              x="50%"
              y="50%"
              dy=".35em"
              textAnchor="middle"
              className="font-batang font-black"
              style={{ fontSize: '180px', fill: 'hsl(var(--primary))' }}
            >
              JongDalSam
            </text>
          </svg>
        </motion.div>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-sm"
          variants={itemVariants}
        >
          <Button
            asChild
            size="lg"
            className="font-bold w-full"
          >
            <Link href="/login">
              로그인하여 시작하기 <ChevronRight className="ml-2" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
             className="w-full"
          >
            <Link href="/guide">
              <HelpCircle className="mr-2" /> 사용 가이드
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
