
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
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accountType || !id || !name) {
        toast({ title: '입력 오류', description: '모든 필드를 입력해주세요.', variant: 'destructive' });
        return;
    }

    setIsLoading(true);
    
    // For special accounts, we'll use the ID as the main identifier and generate a dummy email.
    // The password will be fixed.
    const signupData = {
      studentId: id, // This field will now hold the custom ID.
      name: name,
    };
    
    // The fixed password for all special accounts
    const fixedPassword = '123456';
    // The generated email for Firebase Auth, not visible to the user.
    const emailForAuth = `${id.toLowerCase().replace(/\s/g, '_')}@special.account`;

    try {
      await signUp(accountType, signupData, fixedPassword, emailForAuth);
      toast({
        title: '계정 생성 완료',
        description: `'${name}'(${id}) 계정이 성공적으로 생성되었습니다. (기본 비밀번호는 '123456'입니다)`,
      });
      router.push('/admin/users');
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
                학생회 부스 운영, 키오스크 등 특수 목적 계정을 생성합니다.
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
                    <SelectItem value="council_booth">특수 계정 (부스)</SelectItem>
                    <SelectItem value="kiosk">키오스크</SelectItem>
                </SelectContent>
            </Select>
        </motion.div>
        
        <motion.div variants={FADE_IN_VARIANTS}>
            <Label htmlFor="id">ID (로그인 시 사용)</Label>
            <Input id="id" placeholder="예: A-1 부스, 이벤트 부스" value={id} onChange={(e) => setId(e.target.value)} disabled={isLoading} required />
        </motion.div>

        <motion.div variants={FADE_IN_VARIANTS}>
            <Label htmlFor="name">이름 / 부스명</Label>
            <Input id="name" placeholder="예: 학생회 이벤트 부스" value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading} required />
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
