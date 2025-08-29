
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
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, useMathFunctionCode } from '@/lib/firebase';
import { Loader2, BrainCircuit } from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, query, where, onSnapshot, limit, orderBy, Timestamp } from 'firebase/firestore';

const formSchema = z.object({
  studentId: z.string().regex(/^\d{5}$/, '학번은 5자리 숫자여야 합니다.'),
});
type FormValues = z.infer<typeof formSchema>;

interface MathChallengeInfo {
    title: string;
    points: number;
    expression: string;
}

export default function MathChallengePage() {
    const [studentId, setStudentId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingChallenge, setIsLoadingChallenge] = useState(true);
    const [activeMathChallenge, setActiveMathChallenge] = useState<MathChallengeInfo | null>(null);
    const [mathAnswer, setMathAnswer] = useState('');
    const [user] = useAuthState(auth);

    const { toast } = useToast();
    const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
    });

    useEffect(() => {
        setIsLoadingChallenge(true);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(today);

        const q = query(
            collection(db, 'math_functions'),
            where('validDate', '==', todayTimestamp),
            orderBy('createdAt', 'desc'),
            limit(1)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const challengeData = snapshot.docs[0].data();
                setActiveMathChallenge({
                    title: challengeData.title,
                    points: challengeData.points,
                    expression: challengeData.expression,
                });
            } else {
                setActiveMathChallenge(null);
            }
            setIsLoadingChallenge(false);
        });
        return () => unsubscribe();
    }, []);

    const onStudentIdSubmit: SubmitHandler<FormValues> = (data) => {
        setStudentId(data.studentId);
    };

    const handleMathSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!mathAnswer) {
            toast({ title: "입력 오류", description: "계산 결과를 입력해주세요.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        try {
            const result = await useMathFunctionCode(user.uid, Number(mathAnswer));
            if(result.success) {
                toast({ title: "성공!", description: result.message });
                setMathAnswer('');
            } else {
                 toast({ title: "오류", description: result.message, variant: "destructive" });
            }
        } catch (error: any) {
            toast({ title: "치명적 오류", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingChallenge) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">오늘의 챌린지를 불러오는 중...</p>
            </div>
        );
    }

    if (!activeMathChallenge) {
        return (
             <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle>이벤트 종료</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>오늘 진행되는 수학 챌린지가 없습니다.</p>
                        <p>다음 이벤트를 기대해주세요!</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-md">
                {user ? (
                    <form onSubmit={handleMathSubmit}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 font-headline text-2xl"><BrainCircuit/> 오늘의 수학 챌린지</CardTitle>
                            <CardDescription>
                                {activeMathChallenge.title} <br/>
                                <span className="font-bold text-primary">정답을 맞추면 {activeMathChallenge.points}포인트를 드립니다! (하루 한 번)</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-muted rounded-md text-center">
                                <p className="text-sm text-muted-foreground">오늘의 함수</p>
                                <p className="text-lg font-bold font-mono">{activeMathChallenge.expression}</p>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="mathAnswer">f(내 학번) = ?</Label>
                                <Input
                                    id="mathAnswer"
                                    placeholder="함수에 학번을 대입한 결과값을 입력하세요."
                                    type="number"
                                    value={mathAnswer}
                                    onChange={e => setMathAnswer(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full font-bold" disabled={isSubmitting || !mathAnswer}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                정답 확인하기
                            </Button>
                        </CardFooter>
                    </form>
                ) : (
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-headline text-2xl"><BrainCircuit/> 오늘의 수학 챌린지</CardTitle>
                        <CardDescription>
                           챌린지에 참여하려면 먼저 로그인해주세요.
                        </CardDescription>
                         <CardFooter className="p-0 pt-4">
                            <Button asChild className="w-full">
                                <a href="/login">로그인 페이지로 가기</a>
                            </Button>
                        </CardFooter>
                    </CardHeader>
                )}
            </Card>
        </div>
    );
}
