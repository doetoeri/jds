
'use client';

import { useEffect, useState, useRef } from 'react';
import { doc, getDoc, Timestamp, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth, addCommentToPost } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Calendar, User, Send, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

interface Post {
  id: string;
  title: string;
  authorName: string;
  content: string;
  createdAt: Timestamp;
}

interface Comment {
    id: string;
    authorId: string;
    authorName: string;
    text: string;
    createdAt: Timestamp;
    avatarGradient?: string;
}

export default function PostDetailPage({ params: { id: postId } }: { params: { id: string } }) {
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCommentsLoading, setIsCommentsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [user] = useAuthState(auth);
  const { toast } = useToast();

  useEffect(() => {
    if (!postId) {
      setError('게시글 ID가 없습니다.');
      setIsLoading(false);
      return;
    }

    const postRef = doc(db, 'community_posts', postId as string);
    const unsubscribePost = onSnapshot(postRef, (docSnap) => {
      if (docSnap.exists()) {
        setPost({ id: docSnap.id, ...docSnap.data() } as Post);
      } else {
        setError('게시글을 찾을 수 없습니다.');
      }
      setIsLoading(false);
    }, (e) => {
        setError('게시글을 불러오는 중 오류가 발생했습니다.');
        console.error(e);
        setIsLoading(false);
    });
    
    const commentsQuery = query(collection(db, `community_posts/${postId}/comments`), orderBy('createdAt', 'asc'));
    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
        const commentsData = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Comment));
        setComments(commentsData);
        setIsCommentsLoading(false);
    }, (e) => {
        console.error("Error fetching comments: ", e);
        toast({ title: "오류", description: "댓글을 불러오는 데 실패했습니다.", variant: "destructive"});
        setIsCommentsLoading(false);
    })

    return () => {
        unsubscribePost();
        unsubscribeComments();
    };
  }, [postId, toast]);

  const handleSubmitComment = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!user) {
          toast({title: "로그인 필요", description: "댓글을 작성하려면 로그인이 필요합니다.", variant: "destructive"});
          return;
      }
      if(!newComment.trim()){
          toast({title: "입력 오류", description: "댓글 내용을 입력해주세요.", variant: "destructive"});
          return;
      }
      setIsSubmitting(true);
      try {
          await addCommentToPost(user.uid, postId, newComment);
          setNewComment('');
      } catch (error: any) {
          toast({title: "댓글 작성 실패", description: error.message, variant: "destructive"});
      } finally {
          setIsSubmitting(false);
      }
  }

  const getInitials = (name?: string) => name?.substring(0,1).toUpperCase() || '?';

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
    <div className="max-w-4xl mx-auto">
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
            <div className="prose dark:prose-invert max-w-none min-h-[150px] whitespace-pre-wrap break-words">
                {post.content}
            </div>
        </CardContent>
      </Card>

       <Card className="mt-6">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <MessageCircle/>
                댓글
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
            {isCommentsLoading ? <Loader2 className="mx-auto animate-spin" /> : 
             comments.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">아직 댓글이 없습니다.</p> :
                comments.map(comment => (
                    <div key={comment.id} className="flex items-start gap-3">
                         <Avatar className={cn("h-9 w-9", `gradient-${comment.avatarGradient}`)}>
                          <AvatarFallback className="text-white font-bold bg-transparent">
                              {getInitials(comment.authorName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="w-full">
                            <div className="flex items-center justify-between">
                                <p className="font-semibold">{comment.authorName}</p>
                                <p className="text-xs text-muted-foreground">{comment.createdAt.toDate().toLocaleString()}</p>
                            </div>
                            <p className="text-sm mt-1">{comment.text}</p>
                        </div>
                    </div>
                ))
            }
        </CardContent>
        <CardFooter>
            <form onSubmit={handleSubmitComment} className="w-full space-y-2">
                <Label htmlFor="comment-input">댓글 작성</Label>
                <div className="flex gap-2">
                    <Textarea
                    id="comment-input"
                    placeholder="댓글을 입력하세요..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    disabled={!user || isSubmitting}
                    rows={1}
                    />
                    <Button type="submit" disabled={!user || isSubmitting || !newComment.trim()}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
                    </Button>
                </div>
            </form>
        </CardFooter>
       </Card>
    </div>
  );
}

    