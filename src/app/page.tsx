
'use client';

import { ShieldCheck, Star, Zap, ChevronRight, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { motion } from 'framer-motion';

const FADE_IN_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' } },
};

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <motion.div
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
            className="w-full max-w-4xl"
        >
            <motion.div variants={FADE_IN_VARIANTS}>
                 <div className="mb-4 flex items-center justify-center gap-2">
                    <h1 className="text-6xl font-bold font-batang tracking-tighter text-primary">
                        JongDalSam
                    </h1>
                 </div>
                <p className="text-xl text-muted-foreground font-semibold">
                    고촌중학교 학생들을 위한 포인트 & 커뮤니티
                </p>
            </motion.div>

            <motion.p variants={FADE_IN_VARIANTS} className="mt-6 max-w-2xl mx-auto text-base text-foreground/80">
                다양한 학교 활동에 참여하여 포인트를 쌓고, 친구들과 소통하며 즐거운 학교 생활을 만들어보세요. 종달샘 허브는 여러분의 모든 활동을 응원합니다.
            </motion.p>
            
            <motion.div variants={FADE_IN_VARIANTS} className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                <Button asChild size="lg" className="font-bold">
                    <Link href="/login">
                        로그인하여 시작하기 <ChevronRight className="ml-2"/>
                    </Link>
                </Button>
                 <Button asChild size="lg" variant="outline">
                    <Link href="/guide">
                       <HelpCircle className="mr-2"/> 사용 가이드
                    </Link>
                </Button>
            </motion.div>
        </motion.div>
    </div>
  );
}
