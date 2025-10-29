'use client';

import { ChevronRight, MessageCircleQuestion, User, Briefcase, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.35,
      delayChildren: 0.3,
    },
  },
};


const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: { type: 'spring', stiffness: 200, damping: 25 }
    }
};


export default function HomeClient() {
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center overflow-hidden">
      <motion.div
        className="flex flex-col items-center justify-center gap-6"
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
           <div 
                className="flex items-center justify-center -mt-2"
            >
                <User className="h-8 w-8 text-primary"/>
                <p className="text-2xl font-bold text-primary font-headline ml-2">학생용</p>
            </div>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md"
          variants={itemVariants}
        >
          <Button
            asChild
            size="lg"
            className="font-bold sm:col-span-2"
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
            <Link href="/dashboard/shop">
              <ShoppingCart className="mr-2" /> 매점 둘러보기
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full"
          >
            <Link href="/guide">
              <MessageCircleQuestion className="mr-2" /> 사용 가이드
            </Link>
          </Button>
        </motion.div>
        
        <motion.div variants={itemVariants} className="mt-4">
            <Button asChild variant="link">
                <Link href="/teacher">
                    <Briefcase className="mr-2"/>
                    교직원용 페이지로 이동
                </Link>
            </Button>
        </motion.div>

      </motion.div>
    </div>
  );
}
