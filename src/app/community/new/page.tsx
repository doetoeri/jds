
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
import { auth, createCommunityPost } from '@/lib/firebase';
import { Loader2, PlusCircle, Send, ArrowLeft } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewPostPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast({ title: '오류', description: '제목과 내용을 모두 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: '오류', description: '로그인이 필요합니다.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      await createCommunityPost(user.uid, title, content);
      toast({
        title: '게시 완료',
        description: '게시글이 성공적으로 등록되었습니다.',
      });
      router.push('/community');
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '게시글 등록 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
        <div className="flex items-center gap-4 mb-4">
            <Button asChild variant="outline" size="icon" className="h-7 w-7">
              <Link href="/community">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Link>
            </Button>
            <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
              새 글 작성
            </h1>
        </div>
        <Card className="w-full max-w-3xl mx-auto">
            <form onSubmit={handleSubmit}>
            <CardHeader>
                <CardTitle>게시글 작성</CardTitle>
                <CardDescription>자유롭게 여러분의 이야기를 공유해주세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid w-full gap-1.5">
                    <Label htmlFor="title">제목</Label>
                    <Input
                        id="title"
                        placeholder="제목을 입력하세요."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={isLoading}
                        required
                    />
                </div>
                <div className="grid w-full gap-1.5">
                <Label htmlFor="content">내용</Label>
                <Textarea
                    id="content"
                    placeholder="여기에 내용을 입력하세요."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={isLoading}
                    required
                    rows={10}
                />
                </div>
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button type="submit" className="font-bold" disabled={isLoading || !title.trim() || !content.trim()}>
                {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Send className="mr-2 h-4 w-4" />
                )}
                게시하기
                </Button>
            </CardFooter>
            </form>
        </Card>
    </div>
  );
}
