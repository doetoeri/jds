
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, User, Briefcase, KeyRound, ArrowRight, ArrowLeft } from 'lucide-react';
import { signUp } from '@/lib/firebase';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

type UserType = 'student' | 'teacher';
type Step = 1 | 2 | 3;

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

const formVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
};

export default function SignupPage() {
  const [step, setStep] = useState<Step>(1);
  const [userType, setUserType] = useState<UserType | null>(null);
  
  // Form state
  const [studentId, setStudentId] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherNickname, setTeacherNickname] = useState('');
  const [officeFloor, setOfficeFloor] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();

  const handleUserTypeSelect = (type: UserType) => {
    setUserType(type);
    setStep(2);
  };
  
  const nextStep = () => {
    if (step === 2) {
      if (userType === 'student') {
        if (!studentId.match(/^\d{5}$/)) {
            toast({ title: '오류', description: '학번은 5자리 숫자로 입력해주세요.', variant: 'destructive' });
            return;
        }
        if (studentId.startsWith('00') || studentId.startsWith('99')) {
             toast({ title: '오류', description: '해당 학번 형식은 학생용으로 사용할 수 없습니다.', variant: 'destructive' });
            return;
        }
      }
       if (userType === 'teacher' && (!teacherName || !officeFloor || !teacherNickname)) {
        toast({ title: '오류', description: '성함, 닉네임, 교무실 층수를 모두 입력해주세요.', variant: 'destructive' });
        return;
      }
    }
    setStep(prev => (prev < 3 ? prev + 1 : prev) as Step);
  }

  const prevStep = () => {
    setStep(prev => (prev > 1 ? prev - 1 : prev) as Step);
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: '오류', description: '비밀번호가 일치하지 않습니다.', variant: 'destructive' });
      return;
    }
    if (!userType) return;

    setIsLoading(true);
    
    const signupData = userType === 'student' 
      ? { studentId }
      : { name: teacherName, nickname: teacherNickname, officeFloor };

    try {
      await signUp(userType, signupData, password, email);
      toast({
        title: '회원가입 요청 완료',
        description: userType === 'student' 
          ? '회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.'
          : '교직원 가입 신청이 완료되었습니다. 관리자 승인 후 활동할 수 있습니다.',
      });
      router.push('/login');
    } catch (error: any) {
       toast({ title: '회원가입 실패', description: error.message, variant: 'destructive' });
       setIsLoading(false);
    }
  };
  
  const progressValue = (step / 3) * 100;

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
        <Progress value={progressValue} className="w-full h-1.5 mb-4" />
        <h1 className="text-4xl font-headline font-bold text-primary tracking-tighter">회원가입</h1>
        </motion.div>
        <motion.div variants={FADE_IN_VARIANTS}>
        <p className="text-lg text-muted-foreground mt-2">
        {step === 1 && "가입 유형을 선택해주세요."}
        {step === 2 && "기본 정보를 입력해주세요."}
        {step === 3 && "마지막 단계입니다. 계정을 생성하세요."}
        </p>
        </motion.div>
    </div>
    
    <div className="relative min-h-[380px] mt-8">
        <AnimatePresence mode="wait">
        <motion.div
            key={step}
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.4 }}
            className="absolute w-full"
        >
            {step === 1 && (
            <div className="space-y-4">
                <Button variant="outline" className="w-full h-28 text-lg flex flex-col gap-2 bg-background/50 hover:bg-background" onClick={() => handleUserTypeSelect('student')}>
                    <User className="h-10 w-10 text-primary"/>
                    학생
                </Button>
                <Button variant="outline" className="w-full h-28 text-lg flex flex-col gap-2 bg-background/50 hover:bg-background" onClick={() => handleUserTypeSelect('teacher')}>
                    <Briefcase className="h-10 w-10 text-primary"/>
                    교직원
                </Button>
            </div>
            )}

            {step === 2 && (
            <div className="space-y-4">
                {userType === 'student' ? (
                <div className="space-y-2">
                    <Label htmlFor="studentId">학번 (5자리)</Label>
                    <Input id="studentId" placeholder="예: 10203 (1학년 2반 3번)" required value={studentId} onChange={(e) => setStudentId(e.target.value)} className="h-12 text-base" />
                </div>
                ) : (
                <>
                    <div className="space-y-2">
                    <Label htmlFor="teacherName">성함</Label>
                    <Input id="teacherName" placeholder="예: 홍길동" required value={teacherName} onChange={(e) => setTeacherName(e.target.value)} className="h-12 text-base" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="teacherNickname">닉네임</Label>
                        <Input id="teacherNickname" placeholder="편지에 표시될 닉네임" required value={teacherNickname} onChange={(e) => setTeacherNickname(e.target.value)} className="h-12 text-base" />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="officeFloor">교무실 층수</Label>
                    <Input id="officeFloor" placeholder="예: 2층" required value={officeFloor} onChange={(e) => setOfficeFloor(e.target.value)} className="h-12 text-base" />
                    </div>
                </>
                )}
                <div className="px-0 pt-6 flex justify-between">
                    <Button type="button" variant="ghost" onClick={prevStep}>
                    <ArrowLeft className="mr-2"/> 이전
                    </Button>
                    <Button type="button" onClick={nextStep}>
                    다음 <ArrowRight className="ml-2"/>
                    </Button>
                </div>
            </div>
            )}

            {step === 3 && (
            <form onSubmit={handleSignup}>
                <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">이메일</Label>
                    <Input id="email" type="email" autoComplete="email" placeholder="hello@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} className="h-12 text-base" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">비밀번호</Label>
                    <Input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} className="h-12 text-base" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirm-password">비밀번호 확인</Label>
                    <Input id="confirm-password" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isLoading} className="h-12 text-base"/>
                </div>
                </div>
                <div className="mt-8 flex-col gap-4">
                    <div className="w-full flex justify-between">
                    <Button type="button" variant="ghost" onClick={prevStep} disabled={isLoading}>
                        <ArrowLeft className="mr-2"/> 이전
                    </Button>
                    <Button type="submit" className="font-bold" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <KeyRound className="mr-2"/>
                        회원가입
                    </Button>
                    </div>
                </div>
            </form>
            )}
        </motion.div>
        </AnimatePresence>
    </div>

    <div className="mt-8 flex-col gap-4 pt-4">
        <motion.div variants={FADE_IN_VARIANTS}>
            {step === 3 ? (
                <Alert variant="destructive" className="mt-4 text-xs bg-background/50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    계정 도용이 의심되는 경우, 즉시 <a href="mailto:doe0kim@gmail.com" className="underline">doe0kim@gmail.com</a> 또는 <a href="tel:010-4838-8264" className="underline">010-4838-8264</a>로 신고해주세요.
                </AlertDescription>
                </Alert>
            ) : (
                <div className="text-center text-sm text-muted-foreground">
                    이미 계정이 있으신가요?{' '}
                    <Link href="/login" className={`font-semibold text-primary underline ${isLoading ? 'pointer-events-none opacity-50' : ''}`}>
                        로그인
                    </Link>
                </div>
            )}
        </motion.div>
    </div>
    </motion.div>
  );
}
