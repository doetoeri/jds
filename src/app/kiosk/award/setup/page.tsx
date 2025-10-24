
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface BoothReason {
  id: string;
  reason: string;
}

export default function KioskAwardSetupPage() {
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [boothReasons, setBoothReasons] = useState<BoothReason[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Clear previous session settings when entering setup
    localStorage.removeItem('kiosk_point_value');
    localStorage.removeItem('kiosk_point_reason');
    
    const reasonsRef = doc(db, 'system_settings', 'booth_reasons');
    const unsubscribe = onSnapshot(reasonsRef, (doc) => {
      if (doc.exists()) {
        const reasonsData = doc.data().reasons || [];
        setBoothReasons(reasonsData.map((r: string, i: number) => ({ id: `${i}-${r}`, reason: r })));
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleStartSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value || !reason) {
      toast({ title: '입력 오류', description: '모든 필드를 채워주세요.', variant: 'destructive' });
      return;
    }
    if (Number(value) <= 0) {
        toast({ title: '입력 오류', description: '포인트 값은 0보다 커야 합니다.', variant: 'destructive' });
        return;
    }
    
    setIsLoading(true);
    localStorage.setItem('kiosk_point_value', value);
    localStorage.setItem('kiosk_point_reason', reason);
    router.push('/kiosk/award');
  };

  return (
    <div className="w-full max-w-md">
      <Card className="w-full">
        <form onSubmit={handleStartSession}>
          <CardHeader>
            <CardTitle>포인트 지급 세션 설정</CardTitle>
            <CardDescription>이번 세션 동안 학생들에게 지급할 포인트와 사유를 설정합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="value">지급할 포인트</Label>
              <Input
                id="value"
                type="number"
                placeholder="예: 5"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={isLoading}
                required
                className="h-12 text-lg"
              />
            </div>
            <div>
              <Label htmlFor="reason">지급 사유</Label>
              <Select onValueChange={setReason} value={reason} disabled={isLoading}>
                <SelectTrigger id="reason" className="h-12 text-lg">
                  <SelectValue placeholder="지급 사유를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {boothReasons.map((r) => (
                    <SelectItem key={r.id} value={r.reason}>{r.reason}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full font-bold h-14 text-lg" disabled={isLoading || !value || !reason}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              세션 시작하기
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
