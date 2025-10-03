
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound, Briefcase, UserPlus } from 'lucide-react';
import { signUp } from '@/lib/firebase';
import { motion } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const FADE_IN_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' } },
};

type SpecialAccountType = 'council_booth' | 'kiosk';

export default function AdminSignupPage() {
  const [accountType, setAccountType] = useState<SpecialAccountType | ''>('');
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();

  const validateId = () => {
    if (accountType === 'council_booth' && !id.startsWith('00')) {
      return '학생회(부스) 계정 ID는 00으로 시작해야 합니다.';
    }
    if (accountType === 'kiosk' && !id.startsWith('99')) {
      return '키오스크 계정 ID는 99로 시작해야 합니다.';
    }
    if (!/^\d{5}$/.test(id)) {
      return 'ID는 5자리 숫자여야 합니다.';
    }
    return null;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accountType || !id || !name || !email) {
        toast({ title: '입력 오류', description: '모든 필드를 입력해주세요.', variant: 'destructive' });
        return;
    }
    
    const idValidationError = validateId();
    if (idValidationError) {
      toast({ title: 'ID 형식 오류', description: idValidationError, variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    
    const signupData = {
      studentId: id, // Use studentId field for simplicity
      name: name,
    };
    
    const fixedPassword = '123456';

    try {
      await signUp(accountType, signupData, fixedPassword, email);
      toast({
        title: '계정 생성 완료',
        description: `${name}(${email}) 계정이 성공적으로 생성되었습니다.`,
      });
      router.push('/admin');
    } catch (error: any) {
       toast({ title: '계정 생성 실패', description: error.message, variant: 'destructive' });
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
            show: { transition: { staggerChildren: 0.15, }, },
        }}
    >
      <div className="text-center mb-8">
        <motion.div variants={FADE_IN_VARIANTS}>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tighter">특수 계정 생성</h1>
        </motion.div>
        <motion.div variants={FADE_IN_VARIANTS}>
            <p className="text-lg text-muted-foreground mt-2">
                학생회(부스) 또는 키오스크 계정을 생성합니다.
            </p>
        </motion.div>
      </div>
    
      <form onSubmit={handleSignup} className="space-y-4">
        <motion.div variants={FADE_IN_VARIANTS}>
            <Label htmlFor="account-type">계정 유형</Label>
            <Select onValueChange={(value) => setAccountType(value as SpecialAccountType)} value={accountType}>
                <SelectTrigger id="account-type">
                    <SelectValue placeholder="계정 유형 선택" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="council_booth">학생회 (부스)</SelectItem>
                    <SelectItem value="kiosk">키오스크</SelectItem>
                </SelectContent>
            </Select>
        </motion.div>
        
        <motion.div variants={FADE_IN_VARIANTS}>
            <Label htmlFor="id">ID (5자리 숫자)</Label>
            <Input id="id" placeholder={accountType === 'council_booth' ? '예: 00001' : accountType === 'kiosk' ? '예: 99001' : '유형을 먼저 선택하세요'} value={id} onChange={(e) => setId(e.target.value)} disabled={isLoading || !accountType} required />
        </motion.div>

        <motion.div variants={FADE_IN_VARIANTS}>
            <Label htmlFor="name">이름 / 부스명</Label>
            <Input id="name" placeholder="예: 학생회 이벤트 부스" value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading} required />
        </motion.div>

        <motion.div variants={FADE_IN_VARIANTS}>
            <Label htmlFor="email">이메일</Label>
            <Input id="email" type="email" placeholder="contact@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} required />
        </motion.div>
        
         <motion.div variants={FADE_IN_VARIANTS}>
            <Label htmlFor="password">비밀번호</Label>
            <Input id="password" value="123456 (고정)" disabled />
        </motion.div>

        <div className="flex flex-col gap-4 mt-8">
            <motion.div variants={FADE_IN_VARIANTS}>
                <Button type="submit" className="w-full font-bold" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <UserPlus className="mr-2"/>
                    계정 생성
                </Button>
            </motion.div>
             <motion.div variants={FADE_IN_VARIANTS}>
                <div className="text-center text-sm text-muted-foreground">
                    <Link href="/admin" className="font-semibold text-primary underline">
                        관리자 페이지로 돌아가기
                    </Link>
                </div>
            </motion.div>
        </div>
      </form>
    </motion.div>
  );
}
