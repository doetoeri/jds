
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { submitGuestbookMessage } from '@/lib/firebase';
import { Loader2, Send, MessageSquare } from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';

const formSchema = z.object({
  friendStudentId: z.string().regex(/^\d{5}$/, '학번은 5자리 숫자여야 합니다.'),
  message: z.string().min(5, '메시지는 5자 이상 입력해주세요.').max(100, '메시지는 100자 이하로 입력해주세요.'),
});
type FormValues = z.infer<typeof formSchema>;

export default function GuestbookPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
    });

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        setIsSubmitting(true);
        try {
            await submitGuestbookMessage(data.friendStudentId, data.message);
            toast({ title: '메시지 전송 성공!', description: '비밀 방명록에 메시지가 성공적으로 전달되었어요.' });
            reset();
        } catch (error: any) {
            toast({ title: '오류', description: error.message || '메시지 전송에 실패했습니다.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-md">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-headline text-2xl"><MessageSquare /> 비밀 방명록</CardTitle>
                        <CardDescription>친구에게 익명으로 비밀 메시지를 남겨보세요. 내용은 관리자만 확인할 수 있습니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="friendStudentId">친구 학번 (5자리)</Label>
                            <Input id="friendStudentId" {...register('friendStudentId')} placeholder="예: 10203" disabled={isSubmitting}/>
                            {errors.friendStudentId && <p className="text-xs text-destructive">{errors.friendStudentId.message}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="message">비밀 메시지</Label>
                            <Textarea id="message" {...register('message')} disabled={isSubmitting} placeholder="친구에게 전하고 싶은 말을 남겨보세요."/>
                            {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col gap-4">
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
                            <span className="ml-2">비밀 메시지 남기기</span>
                        </Button>
                         <Button variant="link" asChild>
                            <Link href="/game/word-chain">실시간 끝말잇기 하러가기</Link>
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
