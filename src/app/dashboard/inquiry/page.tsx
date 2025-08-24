

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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { auth, submitInquiry } from '@/lib/firebase';
import { Loader2, MessageSquareQuestion, Send } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function InquiryPage() {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [user] = useAuthState(auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast({ title: '오류', description: '문의 내용을 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: '오류', description: '로그인이 필요합니다.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      await submitInquiry(user.uid, content);
      toast({
        title: '전송 완료',
        description: '문의가 성공적으로 접수되었습니다. 빠른 시일 내에 확인 후 조치하겠습니다.',
      });
      setContent('');
    } catch (error: any) {
      toast({
        title: '전송 실패',
        description: error.message || '문의 접수 중 오류가 발생했습니다.',
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
                <MessageSquareQuestion className="mr-2 h-6 w-6" />
                문의하기
            </h1>
            <p className="text-muted-foreground">
                앱 사용 중 발견한 버그나 불편한 점, 또는 기타 문의사항을 보내주세요.
            </p>
        </div>

      <Card className="w-full max-w-2xl mx-auto">
        <form onSubmit={handleSubmit}>
          <CardHeader>
             <CardTitle>문의 내용 작성</CardTitle>
             <CardDescription>최대한 자세하게 작성해주시면 문제 해결에 큰 도움이 됩니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid w-full gap-1.5">
              <Label htmlFor="content">내용</Label>
              <Textarea
                id="content"
                placeholder="여기에 문의 또는 버그 제보 내용을 입력하세요."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isLoading}
                required
                rows={8}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" className="font-bold" disabled={isLoading || !content.trim()}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              제출하기
            </Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}
