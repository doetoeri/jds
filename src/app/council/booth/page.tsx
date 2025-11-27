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
import { auth, db, givePointsToMultipleStudentsAtBooth } from '@/lib/firebase';
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
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface BoothReason {
    id: string;
    reason: string;
}

export const dynamic = 'force-dynamic';

export default function CouncilBoothPage() {
  const [studentIds, setStudentIds] = useState('');
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
    
    const parsedStudentIds = studentIds
        .split(/[\s,]+/)
        .filter(id => id.trim() !== '');

    if (parsedStudentIds.length === 0 || !value || !reason) {
      toast({
        title: '입력 오류',
        description: '모든 필드를 채워주세요.',
        variant: 'destructive',
      });
      return;
    }

    const invalidIds = parsedStudentIds.filter(id => !/^\d{5}$/.test(id));
    if (invalidIds.length > 0) {
        toast({ title: "입력 오류", description: `유효하지 않은 학번이 포함되어 있습니다: ${invalidIds.join(', ')}`, variant: "destructive" });
        return;
    }

    if (Number(value) <= 0) {
        toast({ title: "입력 오류", description: "포인트 값은 0보다 커야 합니다.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    try {
       if (!user) throw new Error("계정 정보가 없습니다.");
       
       const result = await givePointsToMultipleStudentsAtBooth(user.uid, parsedStudentIds, Number(value), reason);

      toast({
        title: '포인트 지급 완료',
        description: `${result.successCount}명에게 포인트 지급을 성공했으며, ${result.failCount}건은 실패했습니다.`,
        duration: 5000,
      });

      if (result.failCount > 0) {
          setTimeout(() => {
              toast({
                title: '지급 실패 내역',
                description: `실패 사유: ${result.errors.join(', ')}`,
                variant: 'destructive',
                duration: 8000
              })
          }, 1000)
      }
      
      // Reset form
      setStudentIds('');
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
    <div className="grid md:grid-cols-2 gap-6 h-full bg-amber-50 p-6 rounded-lg">
        <div className="flex items-center justify-center">
             <Card className="w-full max-w-md">
                <form onSubmit={handleGivePoints}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline text-2xl"><Award />부스 포인트 지급</CardTitle>
                    <CardDescription>지급할 학생의 학번, 포인트, 사유를 입력하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                    <Label htmlFor="studentIds">대상 학생 학번 (여러 명 가능)</Label>
                    <Textarea
                        id="studentIds"
                        placeholder="학번을 쉼표 또는 공백으로 구분하여 입력하세요. (예: 10101, 10102 10103)"
                        value={studentIds}
                        onChange={e => setStudentIds(e.target.value)}
                        disabled={isLoading}
                        required
                        rows={4}
                    />
                     <Alert variant="default" className="mt-2 text-xs">
                        <AlertDescription>
                            동일한 학번을 여러 번 입력하면 중복으로 지급됩니다.
                        </AlertDescription>
                    </Alert>
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
                    <Button type="submit" className="font-bold" disabled={isLoading || !studentIds || !value || !reason}>
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
