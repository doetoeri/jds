'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { submitPoem, signUp, db } from '@/lib/firebase';
import { Loader2, Feather, Send, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, getDocs } from 'firebase/firestore';

type Stage = 'enterId' | 'signUp' | 'writePoem';

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
  exit: { opacity: 0, y: -20 },
};

export default function KioskPoemPage() {
  const [stage, setStage] = useState<Stage>('enterId');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [poem, setPoem] = useState({ jong: '', dal: '', sam: '' });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{5}$/.test(studentId)) {
      toast({ title: '오류', description: '올바른 5자리 학번을 입력해주세요.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const q = query(collection(db, 'users'), where('studentId', '==', studentId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      setStage('signUp');
    } else {
      setStage('writePoem');
    }
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      toast({ title: '오류', description: '올바른 이메일 주소를 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: '오류', description: '비밀번호는 6자리 이상이어야 합니다.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      await signUp('student', { studentId }, password, email);
      toast({ title: '가입 완료!', description: '회원가입이 완료되었습니다. 이제 삼행시를 지어주세요.' });
      setStage('writePoem');
    } catch (error: any) {
      toast({ title: '가입 실패', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePoemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poem.jong.trim() || !poem.dal.trim() || !poem.sam.trim()) {
      toast({ title: '오류', description: '모든 행을 채워주세요.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const fullPoem = `종: ${poem.jong}\n달: ${poem.dal}\n샘: ${poem.sam}`;
      await submitPoem(studentId, fullPoem);
      toast({ title: '제출 완료!', description: '삼행시가 제출되었으며, 5포인트가 지급되었습니다.' });
      setStudentId('');
      setPoem({ jong: '', dal: '', sam: '' });
      setPassword('');
      setEmail('');
      setStage('enterId');
    } catch (error: any) {
      toast({ title: '제출 실패', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStage = () => {
    switch (stage) {
      case 'enterId':
        return (
          <motion.div key="enterId" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
            <h1 className="text-4xl font-bold font-headline mb-4 text-center">종달샘 삼행시</h1>
            <p className="text-muted-foreground mb-8 text-center">학번을 입력하여 참여하고 포인트를 받아가세요!</p>
            <form onSubmit={handleIdSubmit} className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="studentId"
                  placeholder="학번 (5자리)"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="pl-10 h-14 text-xl text-center tracking-wider"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading || !studentId}>
                {isLoading ? <Loader2 className="animate-spin" /> : '참여하기'}
              </Button>
            </form>
          </motion.div>
        );
      case 'signUp':
        return (
          <motion.div key="signUp" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
            <h1 className="text-3xl font-bold font-headline mb-2 text-center">환영합니다!</h1>
            <p className="text-muted-foreground mb-6 text-center">{studentId} 학생, 간단한 가입 후 참여해주세요.</p>
            <form onSubmit={handleSignUp} className="space-y-4">
              <Input
                type="email"
                placeholder="이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 text-lg"
                autoFocus
              />
              <Input
                type="password"
                placeholder="사용할 비밀번호 (6자리 이상)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 text-lg"
              />
              <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading || password.length < 6 || !email.trim()}>
                {isLoading ? <Loader2 className="animate-spin" /> : '가입하고 계속하기'}
              </Button>
            </form>
          </motion.div>
        );
      case 'writePoem':
        return (
          <motion.div key="writePoem" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
            <h1 className="text-3xl font-bold font-headline mb-6 text-center">'종달샘'으로 삼행시를 지어주세요!</h1>
            <form onSubmit={handlePoemSubmit} className="space-y-4">
                <div className="flex items-center gap-4">
                    <Label className="text-4xl font-bold font-headline text-primary">종</Label>
                    <Input value={poem.jong} onChange={e => setPoem({...poem, jong: e.target.value})} className="h-12 text-lg" />
                </div>
                <div className="flex items-center gap-4">
                    <Label className="text-4xl font-bold font-headline text-primary">달</Label>
                    <Input value={poem.dal} onChange={e => setPoem({...poem, dal: e.target.value})} className="h-12 text-lg" />
                </div>
                <div className="flex items-center gap-4">
                    <Label className="text-4xl font-bold font-headline text-primary">샘</Label>
                    <Input value={poem.sam} onChange={e => setPoem({...poem, sam: e.target.value})} className="h-12 text-lg" />
                </div>
                <Button type="submit" className="w-full h-12 text-lg mt-6" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <><Send className="mr-2 h-4 w-4" />제출하고 5포인트 받기</>}
                </Button>
            </form>
          </motion.div>
        );
    }
  };

  return (
    <div className="w-full max-w-lg p-4">
      <AnimatePresence mode="wait">
        {renderStage()}
      </AnimatePresence>
    </div>
  );
}
