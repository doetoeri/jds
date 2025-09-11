
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { db, resetGuestbook, deleteGuestbookMessage } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Loader2, Trash2, Eraser, MessageSquare } from 'lucide-react';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  uid: string;
  text: string;
  createdAt: Timestamp;
  displayName: string;
  avatarGradient: string;
}

export default function AdminGuestbookPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, 'guestbook'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching guestbook: ", error);
      toast({ title: '오류', description: '방명록을 불러오는 데 실패했습니다.', variant: 'destructive' });
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [toast]);

  const handleReset = async () => {
    setIsProcessing(true);
    try {
      await resetGuestbook();
      toast({ title: '초기화 완료', description: '방명록이 초기화되었습니다.' });
    } catch (error: any) {
      toast({ title: '오류', description: error.message || '초기화 중 오류 발생', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    setIsDeleting(messageId);
    try {
      await deleteGuestbookMessage(messageId);
      toast({ title: '삭제 완료', description: '메시지가 삭제되었습니다.' });
    } catch (error: any) {
      toast({ title: '오류', description: error.message || '삭제 중 오류 발생', variant: 'destructive' });
    } finally {
      setIsDeleting(null);
    }
  };

  const getInitials = (name: string) => name.substring(0, 1).toUpperCase() || '?';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
             <MessageSquare className="mr-2 h-6 w-6"/>방명록 관리
          </h1>
          <p className="text-muted-foreground">전체 사용자가 작성한 방명록 메시지를 관리합니다.</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eraser className="mr-2 h-4 w-4" />}
              전체 초기화
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>정말로 방명록을 초기화하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>
                이 작업은 모든 방명록 메시지를 영구적으로 삭제하며, 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset} disabled={isProcessing} className="bg-destructive hover:bg-destructive/90">
                네, 초기화합니다
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <ScrollArea className="h-[calc(100vh-250px)]">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
                 <div className="flex justify-center items-center h-full">
                    <p className="text-muted-foreground">작성된 메시지가 없습니다.</p>
                </div>
            ) : (
              <div className="space-y-4">
                {messages.map(msg => (
                  <div key={msg.id} className="flex items-start gap-4 p-2 rounded-md hover:bg-muted/50">
                    <Avatar className={cn("h-10 w-10", `gradient-${msg.avatarGradient}`)}>
                      <AvatarFallback className="text-white font-bold bg-transparent">
                        {getInitials(msg.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="font-bold">{msg.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {msg.createdAt?.toDate().toLocaleString() ?? '...'}
                        </p>
                      </div>
                      <p className="text-sm break-words">{msg.text}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(msg.id)}
                      disabled={isDeleting === msg.id}
                    >
                      {isDeleting === msg.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
