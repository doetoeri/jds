
'use client';

import { Bird, ShieldCheck, Star, Zap, ChevronRight, HelpCircle } from 'lucide-react';
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
                    <Bird className="h-10 w-10 text-primary"/>
                    <h1 className="text-5xl font-bold font-headline tracking-tighter text-primary">
                        종달샘 허브
                    </h1>
                 </div>
                <p className="text-2xl text-muted-foreground font-semibold">
                    고촌중학교 학생들을 위한 포인트 & 커뮤니티
                </p>
            </motion.div>

            <motion.p variants={FADE_IN_VARIANTS} className="mt-6 max-w-2xl mx-auto text-lg text-foreground/80">
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
            
            <motion.div 
                variants={FADE_IN_VARIANTS} 
                className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left"
            >
                <div className="p-6 bg-white/50 rounded-lg shadow-soft-lg border border-white/80">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-4">
                        <Star className="h-6 w-6"/>
                    </div>
                    <h3 className="font-bold text-lg">포인트 적립</h3>
                    <p className="text-muted-foreground mt-1">
                        이벤트 참여, 코드 등록, 친구 초대 등 다양한 방법으로 포인트를 모아 상점에서 사용할 수 있습니다.
                    </p>
                </div>
                <div className="p-6 bg-white/50 rounded-lg shadow-soft-lg border border-white/80">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-4">
                        <Zap className="h-6 w-6"/>
                    </div>
                    <h3 className="font-bold text-lg">실시간 커뮤니티</h3>
                    <p className="text-muted-foreground mt-1">
                        친구들과 편지를 주고받고, 함께 끝말잇기 게임에 참여하며 즐거운 추억을 만들어보세요.
                    </p>
                </div>
                <div className="p-6 bg-white/50 rounded-lg shadow-soft-lg border border-white/80">
                     <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-4">
                        <ShieldCheck className="h-6 w-6"/>
                    </div>
                    <h3 className="font-bold text-lg">안전한 활동</h3>
                    <p className="text-muted-foreground mt-1">
                        모든 활동은 관리자의 감독 하에 안전하게 운영되며, 학생들의 개인정보를 소중하게 생각합니다.
                    </p>
                </div>
            </motion.div>
        </motion.div>
    </div>
  );
}
