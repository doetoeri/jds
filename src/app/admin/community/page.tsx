'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db, deleteCommunityPost } from '@/lib/firebase';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
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
import { Loader2, Trash2, MessageSquareText, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Post {
  id: string;
  authorName: string;
  title: string;
  content: string;
  createdAt: Timestamp;
  commentCount: number;
}

export default function AdminCommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const { toast } = useToast();

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

  const handleDeletePost = async (postId: string) => {
    setIsProcessing(postId);
    try {
      await deleteCommunityPost(postId);
      toast({
        title: '성공',
        description: '게시글과 모든 댓글을 삭제했습니다.',
      });
    } catch (error) {
      toast({
        title: '오류',
        description: '게시글 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
            <MessageSquareText className="mr-2 h-6 w-6" />
            커뮤니티 관리
        </h1>
        <p className="text-muted-foreground">
          학생들이 작성한 게시글 목록입니다. 부적절한 내용은 삭제할 수 있습니다.
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead>
                <TableHead>작성자</TableHead>
                <TableHead>내용</TableHead>
                <TableHead>댓글</TableHead>
                <TableHead>작성일</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    작성된 게시글이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                posts.map(post => (
                  <TableRow key={post.id}>
                    <TableCell className="font-semibold">{post.title}</TableCell>
                    <TableCell>{post.authorName}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {post.content}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4 text-muted-foreground"/>
                        {post.commentCount || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <Button size="icon" variant="destructive" disabled={isProcessing === post.id}>
                                {isProcessing === post.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}
                             </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                             <AlertDialogHeader>
                                <AlertDialogTitle>정말로 삭제하시겠습니까?</AlertDialogTitle>
                                <AlertDialogDescription>
                                   이 작업은 되돌릴 수 없으며, 게시글과 게시글에 달린 모든 댓글을 영구적으로 삭제합니다.
                                </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeletePost(post.id)}>삭제</AlertDialogAction>
                             </AlertDialogFooter>
                          </AlertDialogContent>
                       </AlertDialog>
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
