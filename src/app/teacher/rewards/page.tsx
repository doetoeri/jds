
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
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { Loader2, Award, Gift } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';


interface GeneratedCodeInfo {
    code: string;
    value: number;
    studentId: string;
}

export default function TeacherRewardsPage() {
  const [studentId, setStudentId] = useState('');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCodeInfo, setGeneratedCodeInfo] = useState<GeneratedCodeInfo | null>(null);
  const { toast } = useToast();
  const [user] = useAuthState(auth);

  const generateRandomCode = (length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleGenerateCode = async (e: React.FormEvent) => {
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
       if (!user) throw new Error("교직원 정보가 없습니다.");

       // Check if student exists
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('studentId', '==', studentId), where('role', '==', 'student'));
        const userSnapshot = await getDocs(q);

        if (userSnapshot.empty) {
            throw new Error(`학번 ${studentId}에 해당하는 학생을 찾을 수 없습니다.`);
        }
       
      const code = generateRandomCode(8);
      const codeData = {
        code: code,
        type: '온라인 특수코드',
        value: Number(value),
        used: false,
        usedBy: null,
        createdAt: Timestamp.now(),
        createdBy: user.uid, // Track which teacher created it
        reason: reason, // Store the reason
        forStudentId: studentId
      };

      await addDoc(collection(db, 'codes'), codeData);
      
      setGeneratedCodeInfo({
        code,
        value: Number(value),
        studentId: studentId,
      });

      toast({
        title: '코드 생성 완료',
        description: `${studentId} 학생을 위한 보상 코드가 생성되었습니다.`,
      });
      // Reset form
      setStudentId('');
      setValue('');
      setReason('');

    } catch (error: any) {
      toast({
        title: '코드 생성 실패',
        description: error.message || '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
        <div className="space-y-1 mb-6">
            <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
                <Award className="mr-2" /> 학생 보상 지급
            </h1>
            <p className="text-muted-foreground">
            칭찬하고 싶은 학생에게 `포인트`를 지급할 수 있는 일회용 코드를 생성합니다.
            </p>
        </div>
      <Card className="w-full max-w-lg mx-auto">
        <form onSubmit={handleGenerateCode}>
          <CardContent className="pt-6 space-y-4">
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
              <Textarea
                id="reason"
                placeholder="예: 수업 태도 우수, 봉사 활동 참여 등"
                value={reason}
                onChange={e => setReason(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" className="font-bold" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              보상 코드 생성
            </Button>
          </CardFooter>
        </form>
      </Card>

      <AlertDialog open={!!generatedCodeInfo} onOpenChange={() => setGeneratedCodeInfo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
                <Gift className="text-primary"/> 코드 생성 완료!
            </AlertDialogTitle>
            <AlertDialogDescription>
              아래 코드를 학생에게 전달해주세요. 학생이 '코드 사용' 메뉴에서 이 코드를 입력하면 즉시 포인트가 지급됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground">{generatedCodeInfo?.studentId} 학생에게</p>
            <p className="font-mono text-3xl font-bold tracking-widest my-2 text-primary">{generatedCodeInfo?.code}</p>
            <p className="font-bold text-lg">{generatedCodeInfo?.value} 포인트</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setGeneratedCodeInfo(null)}>닫기</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
