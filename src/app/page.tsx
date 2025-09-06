
'use client';

import { ChevronRight, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { motion } from 'framer-motion';

const FADE_UP_VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 20 } },
};

export default function HomePage() {
  return (
    <div className="relative flex flex-col items-center justify-between min-h-screen p-4 text-center overflow-hidden">
        <motion.div
            initial="hidden"
            animate="show"
            viewport={{ once: true }}
            variants={{
                hidden: {},
                show: {
                transition: {
                    staggerChildren: 0.2,
                },
                },
            }}
            className="w-full max-w-4xl pt-16 sm:pt-24"
        >
            <motion.div variants={FADE_UP_VARIANTS}>
                 <h1 className="text-5xl sm:text-6xl font-bold font-batang tracking-tighter text-primary">
                    JongDalSam
                 </h1>
                <p className="mt-2 text-lg sm:text-xl text-muted-foreground font-semibold">
                    고촌중학교 학생들을 위한 포인트 & 커뮤니티
                </p>
            </motion.div>

            <motion.p variants={FADE_UP_VARIANTS} className="mt-4 max-w-xl mx-auto text-sm sm:text-base text-foreground/80">
                다양한 학교 활동에 참여하여 포인트를 쌓고, 친구들과 소통하며 즐거운 학교 생활을 만들어보세요. 종달샘 허브는 여러분의 모든 활동을 응원합니다.
            </motion.p>
        </motion.div>
        
        <motion.div 
            className="w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.4 }}
        >
            <div className="mb-12 flex flex-col sm:flex-row justify-center items-center gap-4">
                <Button asChild size="lg" className="font-bold w-full sm:w-auto">
                    <Link href="/login">
                        로그인하여 시작하기 <ChevronRight className="ml-2"/>
                    </Link>
                </Button>
                 <Button asChild size="lg" variant="ghost" className="w-full sm:w-auto text-muted-foreground">
                    <Link href="/guide">
                       <HelpCircle className="mr-2"/> 사용 가이드
                    </Link>
                </Button>
            </div>
            <div 
                className="w-full select-none text-center font-batang font-black text-[18vw] sm:text-[15vw] md:text-[12vw] leading-none text-primary/10"
                aria-hidden="true"
            >
                JongDalSam
            </div>
        </motion.div>
    </div>
  );
}
