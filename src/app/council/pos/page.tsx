

'use client';

import { useState } from 'react';
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
import { auth, processPosPayment } from '@/lib/firebase';
import { Loader2, ShoppingCart, Minus, Plus } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function CouncilPosPage() {
  const [studentId, setStudentId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('매점 물품 구매');
  const [isLoading, setIsLoading] = useState(false);
  const [user] = useAuthState(auth);
  const { toast } = useToast();

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !amount || !reason) {
      toast({ title: '입력 오류', description: '모든 필드를 채워주세요.', variant: 'destructive' });
      return;
    }
    if (!/^\d{5}$/.test(studentId)) {
      toast({ title: "입력 오류", description: "학번은 5자리 숫자여야 합니다.", variant: "destructive" });
      return;
    }
    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast({ title: "입력 오류", description: "유효한 포인트를 입력해주세요.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      if (!user) throw new Error("계산원 정보가 없습니다.");
      const result = await processPosPayment(user.uid, studentId, paymentAmount, reason);
      if (result.success) {
        toast({ title: '결제 완료', description: result.message });
        setStudentId('');
        setAmount('');
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({ title: '결제 실패', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const quickAdd = (val: number) => {
      setAmount(prev => String((Number(prev) || 0) + val));
  }

  return (
    <div>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
            <ShoppingCart className="mr-2 h-6 w-6"/>
            종달매점 계산원
        </h1>
        <p className="text-muted-foreground">오프라인 매점 결제를 처리하는 시스템입니다.</p>
      </div>

       <Card className="w-full max-w-md mx-auto">
         <form onSubmit={handlePayment}>
          <CardHeader>
            <CardTitle>결제 처리</CardTitle>
            <CardDescription>결제할 학생의 학번과 포인트를 입력하세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="studentId">학생 학번 (5자리)</Label>
              <Input
                id="studentId"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="예: 10203"
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">차감할 포인트</Label>
               <div className="flex items-center gap-2">
                 <Button type="button" variant="outline" size="icon" onClick={() => quickAdd(-1)} disabled={isLoading || Number(amount) <= 1}>
                    <Minus className="h-4 w-4"/>
                 </Button>
                <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="차감할 포인트 금액"
                    className="text-center font-bold text-lg"
                    disabled={isLoading}
                    required
                />
                 <Button type="button" variant="outline" size="icon" onClick={() => quickAdd(1)} disabled={isLoading}>
                    <Plus className="h-4 w-4"/>
                 </Button>
               </div>
               <div className="grid grid-cols-3 gap-2 pt-2">
                  <Button type="button" variant="secondary" onClick={() => quickAdd(5)} disabled={isLoading}>+5</Button>
                  <Button type="button" variant="secondary" onClick={() => quickAdd(10)} disabled={isLoading}>+10</Button>
                  <Button type="button" variant="destructive" onClick={() => setAmount('')} disabled={isLoading}>초기화</Button>
               </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">결제 사유</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full font-bold" disabled={isLoading || !studentId || !amount}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {amount ? `${amount} 포인트 결제하기` : '결제하기'}
            </Button>
          </CardFooter>
         </form>
       </Card>
    </div>
  );
}
