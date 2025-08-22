
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

export default function LoginPage() {
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

      let userRole = '';
      if (userDoc.exists()) {
        userRole = userDoc.data().role;
      } else if (email === 'admin@jongdalsem.com') {
        // Create admin doc on the fly if it doesn't exist
        await setDoc(userDocRef, { email, role: 'admin', name: '관리자', displayName: '관리자' });
        userRole = 'admin';
      }

      if (userRole === 'admin') {
        router.push('/admin');
      } else if (userRole === 'council') {
        router.push('/council');
      } else if (userRole === 'teacher') {
        router.push('/teacher/rewards');
      } else if (userRole === 'pending_teacher') {
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <Card className="w-full max-w-md bg-gradient-to-b from-white to-orange-50">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline text-primary">로그인</CardTitle>
          <CardDescription>
            종달샘 허브 계정으로 로그인하세요.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
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
              />
            </div>
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
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full font-bold" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              로그인
            </Button>
            <div className="text-center text-sm">
              계정이 없으신가요?{' '}
              <Link href="/signup" className={`font-semibold text-primary underline ${isLoading ? 'pointer-events-none opacity-50' : ''}`}>
                회원가입
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}
