
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signIn, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';

const FADE_IN_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' } },
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
      } else if (email === 'admin@jongdalsem.com') {
        // Create admin doc on the fly if it doesn't exist
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
  
  return (
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
    >
      <Card className="bg-transparent border-none shadow-none">
        <CardHeader className="text-center">
          <motion.div variants={FADE_IN_VARIANTS}>
            <CardTitle className="text-4xl font-headline font-bold text-primary tracking-tighter">환영합니다!</CardTitle>
          </motion.div>
          <motion.div variants={FADE_IN_VARIANTS}>
          <CardDescription className="text-lg text-muted-foreground">
            종달샘 허브 계정으로 로그인하세요.
          </CardDescription>
          </motion.div>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
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
                  <Label htmlFor="password">비밀번호</Label>
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
          </CardContent>
          <CardFooter className="flex flex-col gap-4 mt-4">
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
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}
