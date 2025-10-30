
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, KeyRound, Briefcase, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signIn, db, auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { sendPasswordResetEmail } from 'firebase/auth';


const FADE_IN_VARIANTS = {
  hidden: { opacity: 0, filter: 'blur(16px)', scale: 1.1 },
  show: { 
      opacity: 1, 
      filter: 'blur(0px)',
      scale: 1,
      transition: { 
          duration: 0.9,
          ease: [0.25, 1, 0.5, 1] 
      }
  }
};

export default function TeacherLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await signIn(email, password);
      
      if (!user) {
          throw new Error("사용자를 찾을 수 없습니다.");
      }
      
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists() || (userDoc.data().role !== 'teacher' && userDoc.data().role !== 'pending_teacher')) {
        await auth.signOut();
        toast({
            title: '로그인 오류',
            description: '교직원 계정이 아닙니다. 학생용 로그인 페이지를 이용해주세요.',
            variant: 'destructive',
        });
        setIsLoading(false);
        router.push('/login');
        return;
      }
      
      if (userDoc.data().role === 'pending_teacher') {
          toast({
              title: '승인 대기중',
              description: '관리자 승인 후 로그인할 수 있습니다.',
              variant: 'default',
          });
          setIsLoading(false);
      } else {
        router.push('/teacher/rewards');
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
     <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <Button asChild variant="ghost" className="absolute top-4 left-4">
            <Link href="/teacher">
                <ArrowLeft className="mr-2 h-4 w-4"/>
                교직원 홈으로
            </Link>
        </Button>
        <motion.div
        className="w-full max-w-md"
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
            <motion.div variants={FADE_IN_VARIANTS} className="flex items-center justify-center text-primary">
                <Briefcase className="h-10 w-10 mr-2"/>
                <h1 className="text-4xl font-headline font-bold tracking-tighter">교직원 로그인</h1>
            </motion.div>
            <motion.div variants={FADE_IN_VARIANTS}>
            <p className="text-lg text-muted-foreground mt-2">
                교직원 계정으로 로그인하세요.
            </p>
            </motion.div>
        </div>

        <form onSubmit={handleLogin}>
            <div className="space-y-4">
                <motion.div variants={FADE_IN_VARIANTS}>
                <div className="space-y-2">
                    <Label htmlFor="email">이메일</Label>
                    <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="teacher@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="h-12 text-base"
                    />
                </div>
            </motion.div>
                <motion.div variants={FADE_IN_VARIANTS}>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="password">비밀번호</Label>
                        <p className="text-xs text-muted-foreground">비밀번호를 잊으셨나요? 관리자에게 문의하여 초기화하세요.</p>
                    </div>
                    <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                        className="h-12 text-base"
                    />
                </div>
                </motion.div>
            </div>
            <div className="flex flex-col gap-4 mt-8">
                <motion.div variants={FADE_IN_VARIANTS} className="w-full">
                <Button type="submit" className="w-full font-bold h-12 text-base" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                로그인
                </Button>
            </motion.div>
                <motion.div variants={FADE_IN_VARIANTS}>
                <div className="text-center text-sm text-muted-foreground">
                아직 계정이 없으신가요?{' '}
                <Link href="/signup" className={`font-semibold text-primary underline ${isLoading ? 'pointer-events-none opacity-50' : ''}`}>
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
