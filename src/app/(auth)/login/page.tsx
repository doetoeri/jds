
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, KeyRound, User, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signIn, db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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

// This metadata object is not used in a client component, but can be here for co-location.
// For it to work, it would need to be moved to a page.tsx that is a server component.
// I am adding it here for reference in case this page is converted.
// export const metadata: Metadata = {
//   title: '학생 로그인',
//   description: '종달샘 허브 학생 계정으로 로그인하여 다양한 활동에 참여하세요.',
// };


const FADE_IN_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' } },
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const router = useRouter();
  const { toast } = useToast();

  const handleRedirect = (role: string) => {
      if (role === 'admin') {
        router.push('/admin');
      } else if (role === 'council') {
        router.push('/council');
      } else if (role === 'council_booth') {
        router.push('/council/booth');
      }
      else if (role === 'teacher') {
        router.push('/teacher/rewards');
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
      const user = await signIn(email, password);
      
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
      } else if (email === 'admin@jongdalsem.com') {
        await setDoc(userDocRef, { email, role: 'admin', name: '관리자', displayName: '관리자' });
        userRole = 'admin';
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
  
  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({ title: '오류', description: '이메일을 입력해주세요.', variant: 'destructive' });
      return;
    }
    setIsResettingPassword(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: '전송 완료',
        description: `${resetEmail}으로 비밀번호 재설정 링크를 보냈습니다. 이메일을 확인해주세요.`,
      });
    } catch (error: any) {
      toast({
        title: '전송 실패',
        description: error.message || '오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsResettingPassword(false);
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
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="hello@example.com"
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
                     <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button type="button" className="text-xs text-muted-foreground hover:text-primary underline">비밀번호를 잊으셨나요?</button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>비밀번호 재설정</AlertDialogTitle>
                          <AlertDialogDescription>
                            가입하신 이메일 주소를 입력하시면, 비밀번호를 재설정할 수 있는 링크를 보내드립니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4">
                            <Label htmlFor="reset-email">이메일 주소</Label>
                             <Input
                                id="reset-email"
                                type="email"
                                placeholder="hello@example.com"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                disabled={isResettingPassword}
                            />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isResettingPassword}>취소</AlertDialogCancel>
                          <AlertDialogAction onClick={handlePasswordReset} disabled={isResettingPassword}>
                            {isResettingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <KeyRound className="mr-2 h-4 w-4"/>}
                            재설정 링크 보내기
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
