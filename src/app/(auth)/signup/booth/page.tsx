
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound, UserPlus } from 'lucide-react';
import { signUp } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const FADE_IN_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' } },
};

export default function BoothSignupPage() {
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studentId.match(/^\d{5}$/)) {
        toast({ title: '오류', description: '학번은 5자리 숫자로 입력해주세요.', variant: 'destructive' });
        return;
    }
    if (studentId.startsWith('00') || studentId.startsWith('99')) {
         toast({ title: '오류', description: '해당 학번 형식은 사용할 수 없습니다.', variant: 'destructive' });
        return;
    }
    if (password !== confirmPassword) {
      toast({ title: '오류', description: '비밀번호가 일치하지 않습니다.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    
    const signupData = { studentId };

    try {
      await signUp('student', signupData, password, email);
      toast({
        title: '회원가입 요청 완료',
        description: '회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.',
      });
      router.push('/login');
    } catch (error: any) {
       toast({ title: '회원가입 실패', description: error.message, variant: 'destructive' });
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
    <div className="text-center">
        <motion.div variants={FADE_IN_VARIANTS}>
        <h1 className="text-4xl font-headline font-bold text-primary tracking-tighter">학생 빠른 회원가입</h1>
        </motion.div>
        <motion.div variants={FADE_IN_VARIANTS}>
        <p className="text-lg text-muted-foreground mt-2">
            부스 전용 간편 회원가입 페이지입니다.
        </p>
        </motion.div>
    </div>
    
    <form onSubmit={handleSignup} className="mt-8">
        <div className="space-y-4">
            <motion.div variants={FADE_IN_VARIANTS}>
                <div className="space-y-2">
                    <Label htmlFor="studentId">학번 (5자리)</Label>
                    <Input id="studentId" placeholder="예: 10203 (1학년 2반 3번)" required value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={isLoading} className="h-12 text-base" />
                </div>
            </motion.div>
            <motion.div variants={FADE_IN_VARIANTS}>
                <div className="space-y-2">
                    <Label htmlFor="email">이메일</Label>
                    <Input id="email" type="email" autoComplete="email" placeholder="hello@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} className="h-12 text-base" />
                </div>
            </motion.div>
            <motion.div variants={FADE_IN_VARIANTS}>
                <div className="space-y-2">
                    <Label htmlFor="password">비밀번호</Label>
                    <Input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} className="h-12 text-base" />
                </div>
            </motion.div>
            <motion.div variants={FADE_IN_VARIANTS}>
                <div className="space-y-2">
                    <Label htmlFor="confirm-password">비밀번호 확인</Label>
                    <Input id="confirm-password" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isLoading} className="h-12 text-base"/>
                </div>
            </motion.div>
        </div>
        <div className="mt-8 flex-col gap-4 space-y-4">
            <motion.div variants={FADE_IN_VARIANTS}>
                <Button type="submit" className="w-full font-bold h-12 text-base" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <UserPlus className="mr-2"/>
                    회원가입
                </Button>
            </motion.div>
            <motion.div variants={FADE_IN_VARIANTS}>
                 <div className="text-center text-sm text-muted-foreground">
                    이미 계정이 있으신가요?{' '}
                    <Link href="/login" className={`font-semibold text-primary underline ${isLoading ? 'pointer-events-none opacity-50' : ''}`}>
                        로그인
                    </Link>
                </div>
            </motion.div>
             <motion.div variants={FADE_IN_VARIANTS}>
                <Alert variant="destructive" className="mt-4 text-xs bg-background/50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    계정 도용이 의심되는 경우, 즉시 <a href="mailto:doe0kim@gmail.com" className="underline">doe0kim@gmail.com</a> 또는 <a href="tel:010-4838-8264" className="underline">010-4838-8264</a>로 신고해주세요.
                </AlertDescription>
                </Alert>
            </motion.div>
        </div>
    </form>
    </motion.div>
  );
}
