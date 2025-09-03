
'use client';

import { Bird, Gamepad2, Gift, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { motion } from 'framer-motion';

const FADE_DOWN_ANIMATION_VARIANTS = {
  hidden: { opacity: 0, y: -10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' } },
};

const FADE_UP_ANIMATION_VARIANTS = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' } },
};


export default function HomePage() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center text-center p-4 overflow-hidden">
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
            className="flex flex-col items-center"
        >
            <motion.div
                variants={FADE_DOWN_ANIMATION_VARIANTS}
                className="flex items-center justify-center mb-4"
            >
                <Bird className="h-16 w-16 text-primary" />
            </motion.div>
            
            <motion.h1 
                variants={FADE_DOWN_ANIMATION_VARIANTS}
                className="text-4xl md:text-5xl font-bold tracking-tight font-headline text-gray-800"
            >
                고촌중학교 학생자치회 종달샘
            </motion.h1>
            
            <motion.p 
                variants={FADE_DOWN_ANIMATION_VARIANTS}
                className="mt-4 max-w-xl text-lg text-muted-foreground"
            >
                학교 생활을 더욱 즐겁고 의미있게. 다양한 활동에 참여하고 포인트를 모아 특별한 혜택을 누려보세요!
            </motion.p>

            <motion.div 
                variants={FADE_UP_ANIMATION_VARIANTS}
                className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
                <Button asChild size="lg" className="font-bold w-full sm:w-auto">
                    <Link href="/login">로그인</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="font-bold w-full sm:w-auto">
                    <Link href="/signup">회원가입</Link>
                </Button>
            </motion.div>
             <motion.div 
                variants={FADE_UP_ANIMATION_VARIANTS}
                className="mt-2"
            >
                <Button asChild variant="link" size="sm">
                    <Link href="/guide">이용 방법이 궁금하신가요?</Link>
                </Button>
            </motion.div>

            <motion.div 
                variants={FADE_UP_ANIMATION_VARIANTS}
                className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl"
            >
                 <div className="p-6 bg-white/50 rounded-lg shadow-soft-lg border border-white/80">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-4">
                        <Gift className="h-6 w-6"/>
                    </div>
                    <h3 className="text-lg font-bold">포인트 시스템</h3>
                    <p className="mt-2 text-sm text-muted-foreground">다양한 활동으로 포인트를 모아 상점에서 상품으로 교환하세요.</p>
                </div>
                 <div className="p-6 bg-white/50 rounded-lg shadow-soft-lg border border-white/80">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-4">
                        <Gamepad2 className="h-6 w-6"/>
                    </div>
                    <h3 className="text-lg font-bold">미니 게임</h3>
                    <p className="mt-2 text-sm text-muted-foreground">친구들과 함께 즐기는 실시간 끝말잇기 게임에 참여해보세요.</p>
                </div>
                 <div className="p-6 bg-white/50 rounded-lg shadow-soft-lg border border-white/80">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-4">
                        <ShieldCheck className="h-6 w-6"/>
                    </div>
                    <h3 className="text-lg font-bold">안전한 커뮤니티</h3>
                    <p className="mt-2 text-sm text-muted-foreground">모든 활동은 학생들의 안전을 위해 관리되고 있습니다.</p>
                </div>
            </motion.div>
        </motion.div>
    </div>
  );
}
