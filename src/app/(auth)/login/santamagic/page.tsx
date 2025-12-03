'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, KeyRound, User, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signIn, db, auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';

const FADE_IN_VARIANTS = {
  hidden: { opacity: 0, filter: 'blur(16px)', scale: 1.1 },
  show: {
    opacity: 1,
    filter: 'blur(0px)',
    scale: 1,
    transition: {
      duration: 0.9,
      ease: [0.25, 1, 0.5, 1],
    },
  },
};

export default function SantaMagicLoginPage() {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const user = await signIn(studentId, password);

      if (!user) {
        throw new Error('사용자를 찾을 수 없습니다.');
      }

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      let userRole = '';
      if (userDoc.exists()) {
        userRole = userDoc.data().role;
      }

      if (userRole === 'admin') {
        router.push('/santamagic/admin');
      } else {
        router.push('/santamagic/vote');
      }
    } catch (error: any) {
      toast({
        title: '로그인 실패',
        description: error.message,
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full isolate flex items-center justify-center p-4 bg-red-800 text-white">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/santamagic-bg.jpg')",
          filter: 'blur(4px) brightness(0.7)',
        }}
      />

      <Button asChild variant="ghost" className="absolute top-4 left-4 text-white hover:bg-white/10 hover:text-white">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          처음으로
        </Link>
      </Button>

      <motion.div
        className="relative z-10 w-full max-w-md"
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
        <div className="text-center mb-8">
          <motion.div variants={FADE_IN_VARIANTS}>
            <h1 className="text-5xl font-headline font-black tracking-tight text-white drop-shadow-lg">
              Santa's Magic
            </h1>
          </motion.div>
          <motion.div variants={FADE_IN_VARIANTS}>
            <p className="text-lg text-red-100 mt-2">
              가장 선물을 받아야 할 것 같은 친구에게 투표하세요.
            </p>
          </motion.div>
        </div>

        <form onSubmit={handleLogin}>
          <div className="space-y-4">
            <motion.div variants={FADE_IN_VARIANTS}>
              <div className="space-y-2">
                <Label htmlFor="studentId">학번 또는 ID</Label>
                <Input
                  id="studentId"
                  type="text"
                  placeholder="5자리 학번 또는 'admin'"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  disabled={isLoading}
                  className="h-12 text-base bg-white/10 border-white/20 text-white placeholder:text-red-100 focus:bg-white/20"
                />
              </div>
            </motion.div>
            <motion.div variants={FADE_IN_VARIANTS}>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">비밀번호</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-12 text-base bg-white/10 border-white/20 text-white placeholder:text-red-100 focus:bg-white/20"
                  placeholder="비밀번호 입력"
                  required
                />
              </div>
            </motion.div>
          </div>
          <div className="flex flex-col gap-4 mt-8">
            <motion.div variants={FADE_IN_VARIANTS} className="w-full">
              <Button
                type="submit"
                className="w-full font-bold h-12 text-base bg-white text-red-700 hover:bg-red-100"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                마법 시작하기
              </Button>
            </motion.div>
            <motion.div variants={FADE_IN_VARIANTS}>
              <div className="text-center text-sm text-red-100">
                계정이 없다면?{' '}
                <Link
                  href="/signup"
                  className={`font-semibold text-white underline ${
                    isLoading ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  회원가입
                </Link>
              </div>
            </motion.div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
