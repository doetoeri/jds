
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { auth, givePointsToMultipleStudentsAtBooth } from '@/lib/firebase';
import { Loader2, Award, User, LogOut } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function KioskAwardPage() {
  const [studentId, setStudentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionSettings, setSessionSettings] = useState<{ value: string; reason: string } | null>(null);

  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    const savedValue = localStorage.getItem('kiosk_point_value');
    const savedReason = localStorage.getItem('kiosk_point_reason');
    if (savedValue && savedReason) {
      setSessionSettings({ value: savedValue, reason: savedReason });
    } else {
      router.push('/kiosk/setup');
    }
  }, [router]);

  const handleGivePoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionSettings || !studentId) {
      toast({ title: '오류', description: '학번을 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (!/^\d{5}$/.test(studentId)) {
        toast({ title: "입력 오류", description: `유효하지 않은 학번입니다.`, variant: "destructive" });
        return;
    }

    setIsLoading(true);
    try {
      if (!user) throw new Error('계정 정보가 없습니다.');

      const result = await givePointsToMultipleStudentsAtBooth(
        user.uid,
        [studentId],
        Number(sessionSettings.value),
        sessionSettings.reason
      );

      if (result.successCount > 0) {
        toast({
          title: '적립 완료!',
          description: `${studentId} 학생에게 ${sessionSettings.value}포인트가 지급되었습니다.`,
        });
        setStudentId('');
      } else {
        toast({
          title: '적립 실패',
          description: result.errors.join(', ') || '알 수 없는 오류 발생',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({ title: '오류 발생', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!sessionSettings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
            <p className="text-lg text-muted-foreground">지급 사유</p>
            <h1 className="text-4xl font-bold font-headline text-foreground">{sessionSettings.reason}</h1>
            <p className="mt-4 text-6xl font-bold text-primary">{sessionSettings.value} <span className="text-3xl font-semibold">포인트</span></p>
        </div>
      <form onSubmit={handleGivePoints} className="space-y-6">
        <div className="space-y-2">
            <Label htmlFor="studentId" className="text-lg sr-only">학생 학번 (5자리)</Label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="studentId"
                placeholder="학번을 입력하고 Enter를 누르세요"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                disabled={isLoading}
                required
                className="pl-12 h-16 text-2xl text-center tracking-widest font-mono"
                autoFocus
              />
            </div>
        </div>
        <Button type="submit" className="w-full h-16 text-xl font-bold" disabled={isLoading || !studentId}>
            {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Award className="mr-2 h-6 w-6" />}
            포인트 지급
        </Button>
      </form>
    </div>
  );
}
