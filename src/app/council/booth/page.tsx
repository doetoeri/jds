
'use client';

import { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { auth, db, givePointsAtBooth } from '@/lib/firebase';
import { Loader2, Award } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { doc, onSnapshot } from 'firebase/firestore';
import { CommunicationChannel } from '@/components/communication-channel';

interface BoothReason {
    id: string;
    reason: string;
}

export default function CouncilBoothPage() {
  const [studentId, setStudentId] = useState('');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [boothReasons, setBoothReasons] = useState<BoothReason[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [user] = useAuthState(auth);

  useEffect(() => {
    const reasonsRef = doc(db, 'system_settings', 'booth_reasons');
    const unsubscribe = onSnapshot(reasonsRef, (doc) => {
        if (doc.exists()) {
            const reasonsData = doc.data().reasons || [];
            setBoothReasons(reasonsData.map((r: string, i: number) => ({id: `${i}-${r}`, reason: r})));
        }
    });
    return () => unsubscribe();
  }, []);

  const handleGivePoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !value || !reason) {
      toast({
        title: '입력 오류',
        description: '모든 필드를 채워주세요.',
        variant: 'destructive',
      });
      return;
    }
     if (!/^\d{5}$/.test(studentId)) {
        toast({ title: "입력 오류", description: "학생의 학번은 5자리 숫자여야 합니다.", variant: "destructive" });
        return;
    }

    if (Number(value) <= 0) {
        toast({ title: "입력 오류", description: "포인트 값은 0보다 커야 합니다.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    try {
       if (!user) throw new Error("계정 정보가 없습니다.");
       
       await givePointsAtBooth(user.uid, studentId, Number(value), reason);

      toast({
        title: '포인트 지급 완료',
        description: `${studentId} 학생에게 ${value} 포인트를 지급했습니다.`,
      });
      // Reset form
      setStudentId('');
      setValue('');
      setReason('');

    } catch (error: any) {
      toast({
        title: '포인트 지급 실패',
        description: error.message || '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 h-full">
        <div className="flex items-center justify-center">
             <Card className="w-full max-w-md">
                <form onSubmit={handleGivePoints}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline text-2xl"><Award />부스 포인트 지급</CardTitle>
                    <CardDescription>지급할 학생의 학번, 포인트, 사유를 입력하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                    <Label htmlFor="studentId">대상 학생 학번 (5자리)</Label>
                    <Input
                        id="studentId"
                        placeholder="예: 10203"
                        value={studentId}
                        onChange={e => setStudentId(e.target.value)}
                        disabled={isLoading}
                        required
                    />
                    </div>
                    <div>
                    <Label htmlFor="value">지급할 포인트</Label>
                    <Input
                        id="value"
                        type="number"
                        placeholder="지급할 포인트의 양"
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        disabled={isLoading}
                        required
                    />
                    </div>
                    <div>
                    <Label htmlFor="reason">지급 사유</Label>
                    <Select onValueChange={setReason} value={reason} disabled={isLoading}>
                      <SelectTrigger id="reason">
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
                <CardFooter className="flex justify-end">
                    <Button type="submit" className="font-bold" disabled={isLoading || !studentId || !value || !reason}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    포인트 지급
                    </Button>
                </CardFooter>
                </form>
            </Card>
        </div>
        <div className="h-full">
            <CommunicationChannel/>
        </div>
    </div>
  );
}
