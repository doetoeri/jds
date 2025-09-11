

'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Calendar, User, MessageSquareText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

interface Post {
  id: string;
  title: string;
  authorName: string;
  content: string;
  createdAt: Timestamp;
}

export default function PostDetailPage({ params: { id: postId } }: { params: { id: string } }) {
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) {
      setError('게시글 ID가 없습니다.');
      setIsLoading(false);
      return;
    }

    const fetchPost = async () => {
      try {
        const postRef = doc(db, 'community_posts', postId as string);
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
          setPost({ id: postSnap.id, ...postSnap.data() } as Post);
        } else {
          setError('게시글을 찾을 수 없습니다.');
        }
      } catch (e) {
        setError('게시글을 불러오는 중 오류가 발생했습니다.');
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-24 mb-4" />
        <Card>
            <CardHeader>
                <Skeleton className="h-10 w-3/4 mb-2"/>
                <Skeleton className="h-4 w-1/2"/>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <Skeleton className="h-5 w-full"/>
                    <Skeleton className="h-5 w-full"/>
                    <Skeleton className="h-5 w-2/3"/>
                </div>
            </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
        <div className="text-center py-10">
            <p className="text-red-500 mb-4">{error}</p>
             <Button asChild variant="outline">
              <Link href="/community">
                <ArrowLeft className="mr-2 h-4 w-4" />
                목록으로 돌아가기
              </Link>
            </Button>
        </div>
    );
  }

  if (!post) {
    return <p>게시글 정보를 찾을 수 없습니다.</p>;
  }

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
              게시글
            </h1>
        </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{post.title}</CardTitle>
          <CardDescription className="flex items-center gap-4 pt-2 text-sm">
             <div className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                <span>{post.authorName}</span>
             </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{post.createdAt.toDate().toLocaleString()}</span>
              </div>
          </CardDescription>
        </CardHeader>
        <Separator className="my-4"/>
        <CardContent>
            <div className="space-y-2">
                <div className="prose dark:prose-invert max-w-none min-h-[200px] whitespace-pre-wrap break-words">
                    {post.content}
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
