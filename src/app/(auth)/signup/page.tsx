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
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { signUp } from '@/lib/firebase';


export default function SignupPage() {
  const [studentId, setStudentId] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: '오류',
        description: '비밀번호가 일치하지 않습니다.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    try {
      await signUp(studentId, password, phone);
      toast({
        title: '회원가입 성공',
        description: '로그인 페이지로 이동합니다.',
      });
      router.push('/login');
    } catch (error: any) {
       toast({
        title: '회원가입 실패',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline text-primary">회원가입</CardTitle>
        <CardDescription>
          새로운 종달샘 허브 계정을 만듭니다.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSignup}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="studentId">학번 (5자리)</Label>
            <Input
              id="studentId"
              placeholder="예: 10203 (1학년 2반 3번)"
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">전화번호</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="010-1234-5678"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">비밀번호 확인</Label>
            <Input
              id="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full font-bold" disabled={isLoading}>
             {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            회원가입
          </Button>
          <div className="text-center text-sm">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="font-semibold text-primary underline">
              로그인
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
