
'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MessageSquareText, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Post {
  id: string;
  authorName: string;
  title: string;
  createdAt: Timestamp;
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const postsCollection = collection(db, 'community_posts');
    const q = query(postsCollection, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const postList = snapshot.docs.map(
            doc => ({ id: doc.id, ...doc.data() } as Post)
        );
        setPosts(postList);
        setIsLoading(false);
    }, (error) => {
        console.error('Error fetching posts: ', error);
        toast({
            title: '오류',
            description: '게시글 목록을 불러오는 데 실패했습니다.',
            variant: 'destructive',
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
                <MessageSquareText className="mr-2 h-6 w-6" />
                커뮤니티
            </h1>
            <p className="text-muted-foreground">
              자유롭게 글을 작성하고 다른 학생들과 소통해보세요.
            </p>
        </div>
        <Button asChild>
            <Link href="/community/new">
                <PlusCircle className="mr-2 h-4 w-4"/>
                글쓰기
            </Link>
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70%]">제목</TableHead>
                <TableHead>작성자</TableHead>
                <TableHead className="text-right">작성일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={3}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">
                    아직 작성된 글이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                posts.map(post => (
                  <TableRow key={post.id} className="cursor-pointer" onClick={() => router.push(`/community/${post.id}`)}>
                    <TableCell className="font-semibold">{post.title}</TableCell>
                    <TableCell>{post.authorName}</TableCell>
                    <TableCell className="text-right">
                      {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
