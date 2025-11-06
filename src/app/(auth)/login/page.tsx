'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, KeyRound, User, Briefcase, UserCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signIn, db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Metadata } from 'next';

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

export const metadata: Metadata = {
    title: '로그인',
    description: '종달샘 허브에 로그인하여 포인트를 확인하고 커뮤니티 활동에 참여하세요.',
};


export default function LoginPage() {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const handleRedirect = (role: string) => {
      if (role === 'admin') {
        router.push('/admin');
      } else if (role === 'council') {
        router.push('/council');
      }
      else if (role === 'teacher') {
        router.push('/teacher/rewards');
      } else if (role === 'kiosk') {
        router.push('/kiosk');
      } else if (role === 'pending_teacher') {
          toast({
              title: '승인 대기중',
              description: '관리자 승인 후 로그인할 수 있습니다.',
              variant: 'default',
          });
          setIsLoading(false);
      }
      else {
        router.push('/dashboard');
      }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const user = await signIn(studentId, password);
      
      if (!user) {
          throw new Error("사용자를 찾을 수 없습니다.");
      }
      
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      let userRole = '';
      if (userDoc.exists()) {
        userRole = userDoc.data().role;
         if (userRole === 'teacher') {
            await auth.signOut();
            toast({
                title: '로그인 오류',
                description: '교직원께서는 교직원 전용 로그인 페이지를 이용해주세요.',
                variant: 'destructive',
            });
            setIsLoading(false);
            router.push('/teacher/login');
            return;
        }
      }

      handleRedirect(userRole);

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
    <motion.div
      className="w-full"
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
            <User className="h-10 w-10 mr-2"/>
            <h1 className="text-4xl font-headline font-bold tracking-tighter">학생 로그인</h1>
        </motion.div>
        <motion.div variants={FADE_IN_VARIANTS}>
          <p className="text-lg text-muted-foreground mt-2">
            종달샘 허브 계정으로 로그인하세요.
          </p>
        </motion.div>
      </div>
      
       <Alert variant="default" className="mb-6">
        <Briefcase className="h-4 w-4" />
        <AlertTitle className="font-bold">교직원이신가요?</AlertTitle>
        <AlertDescription>
          교직원께서는 전용 로그인 페이지를 이용해주세요.
          <Button variant="link" asChild className="p-0 h-auto ml-2"><Link href="/teacher/login">교직원 로그인 페이지로 이동</Link></Button>
        </AlertDescription>
      </Alert>

      <form onSubmit={handleLogin}>
        <div className="space-y-4">
            <motion.div variants={FADE_IN_VARIANTS}>
              <div className="space-y-2">
                <Label htmlFor="studentId">학번</Label>
                <Input
                  id="studentId"
                  type="text"
                  placeholder="5자리 학번"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  disabled={isLoading}
                  className="h-12 text-base"
                />
              </div>
          </motion.div>
            <motion.div variants={FADE_IN_VARIANTS}>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <Label htmlFor="password">비밀번호</Label>
                    <p className="text-xs text-muted-foreground">비밀번호를 잊으셨나요? 학생회에 문의하여 초기화하세요.</p>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-12 text-base"
                  placeholder="비밀번호 입력"
                  required
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
              계정이 없으신가요?{' '}
              <Link href="/signup" className={`font-semibold text-primary underline ${isLoading ? 'pointer-events-none opacity-50' : ''}`}>
                회원가입
              </Link>
            </div>
          </motion.div>
        </div>
      </form>
    </motion.div>
  );
}
