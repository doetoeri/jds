'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, ArrowRight, ArrowLeft } from 'lucide-react';
import { signUp, db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { collection, query, where, getDocs } from 'firebase/firestore';

const formVariants = {
  hidden: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 100 : -100,
  }),
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'tween', ease: 'easeInOut', duration: 0.3 },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction < 0 ? 100 : -100,
    transition: { type: 'tween', ease: 'easeInOut', duration: 0.3 },
  }),
};

export default function BoothSignupPage() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();

  const resetForm = () => {
    setStudentId('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setStep(1);
    setIsLoading(false);
  };

  const handleNextStep = async () => {
    setDirection(1);
    if (step === 1) {
      if (!studentId.match(/^\d{5}$/)) {
        toast({ title: '오류', description: '학번은 5자리 숫자로 입력해주세요.', variant: 'destructive' });
        return;
      }
      if (studentId.startsWith('00') || studentId.startsWith('99')) {
         toast({ title: '오류', description: '해당 학번 형식은 사용할 수 없습니다.', variant: 'destructive' });
        return;
      }
      
      setIsLoading(true);
      try {
        const studentQuery = query(collection(db, "users"), where("studentId", "==", studentId));
        const studentSnapshot = await getDocs(studentQuery);
        if (!studentSnapshot.empty) {
            toast({ title: '확인', description: '이미 가입된 학번입니다.', variant: 'default' });
            setStudentId('');
            return;
        }
        setStep(2);
      } catch (error) {
         toast({ title: '오류', description: '학번 확인 중 문제가 발생했습니다.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    } else if (step === 2) {
      if (!email.includes('@')) {
          toast({ title: '오류', description: '올바른 이메일 형식을 입력해주세요.', variant: 'destructive' });
          return;
      }
       setIsLoading(true);
       try {
        const emailQuery = query(collection(db, "users"), where("email", "==", email));
        const emailSnapshot = await getDocs(emailQuery);
        if (!emailSnapshot.empty) {
            toast({ title: '오류', description: '이미 사용 중인 이메일입니다.', variant: 'destructive' });
            return;
        }
        setStep(3);
       } catch (error) {
           toast({ title: '오류', description: '이메일 확인 중 문제가 발생했습니다.', variant: 'destructive' });
       } finally {
            setIsLoading(false);
       }
    } else if (step === 3) {
      if (password.length < 6) {
        toast({ title: '오류', description: '비밀번호는 6자리 이상이어야 합니다.', variant: 'destructive' });
        return;
      }
      setStep(4);
    }
  };

  const handlePrevStep = () => {
    setDirection(-1);
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({ title: '오류', description: '비밀번호가 일치하지 않습니다.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    
    const signupData = { studentId };

    try {
      await signUp('student', signupData, password, email);
      toast({
        title: '회원가입 완료!',
        description: `${studentId} 학생의 가입이 완료되었습니다. 다음 학생을 등록하세요.`,
      });
      resetForm();
    } catch (error: any) {
       toast({ title: '회원가입 실패', description: error.message, variant: 'destructive' });
       setIsLoading(false);
    }
  };
  
  const progress = (step / 4) * 100;
  
  const titles: { [key: number]: string } = {
      1: "학번 확인",
      2: "이메일 입력",
      3: "비밀번호 설정",
      4: "비밀번호 확인"
  }
  const descriptions: { [key: number]: string } = {
      1: "가입할 학생의 5자리 학번을 입력하여 등록 여부를 확인합니다.",
      2: "로그인에 사용할 학생의 이메일 주소를 입력해주세요.",
      3: "6자리 이상의 비밀번호를 설정해주세요.",
      4: "안전을 위해 비밀번호를 다시 한번 입력해주세요."
  }

  return (
    <motion.div
        className="w-full max-w-xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
    >
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">학번을 입력하여, 등록 여부를 확인하세요.</h1>
      </div>

      <div className="mb-4">
        <Progress value={progress} className="h-2" />
        <div className="text-center mt-3">
          <p className="font-bold">{titles[step]}</p>
          <p className="text-sm text-muted-foreground">{descriptions[step]}</p>
        </div>
      </div>

      <div className="relative min-h-[120px] overflow-hidden p-6">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute w-full px-6"
          >
            {step === 1 && (
              <div className="space-y-2">
                <Label htmlFor="studentId">학번 (5자리)</Label>
                <Input id="studentId" placeholder="예: 10203 (1학년 2반 3번)" required value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={isLoading} className="h-12 text-base text-center tracking-widest" />
              </div>
            )}
            {step === 2 && (
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input id="email" type="email" autoComplete="email" placeholder="hello@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} className="h-12 text-base" />
              </div>
            )}
            {step === 3 && (
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} className="h-12 text-base" />
              </div>
            )}
            {step === 4 && (
              <form onSubmit={handleSignup} className="space-y-2">
                <Label htmlFor="confirm-password">비밀번호 확인</Label>
                <Input id="confirm-password" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isLoading} className="h-12 text-base" />
              </form>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={handlePrevStep} disabled={step === 1 || isLoading}>
          <ArrowLeft className="mr-2 h-4 w-4" /> 이전
        </Button>
        {step < 4 ? (
          <Button onClick={handleNextStep} disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
            다음 <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSignup} disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <UserPlus className="mr-2 h-4 w-4" />}
            회원가입
          </Button>
        )}
      </div>

    </motion.div>
  );
}
