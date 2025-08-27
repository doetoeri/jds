
'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Loader2, Trash2, BookUser } from 'lucide-react';
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

interface GuestbookMessage {
  id: string;
  senderDisplayName: string;
  friendStudentId: string;
  message: string;
  createdAt: Timestamp;
}

export default function AdminGuestbookPage() {
  const [messages, setMessages] = useState<GuestbookMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const messagesCollection = collection(db, 'guestbook');
    const q = query(messagesCollection, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const messageList = snapshot.docs.map(
            doc => ({ id: doc.id, ...doc.data() } as GuestbookMessage)
        );
        setMessages(messageList);
        setIsLoading(false);
    }, (error) => {
        console.error('Error fetching guestbook messages: ', error);
        toast({
            title: '오류',
            description: '방명록 메시지를 불러오는 데 실패했습니다.',
            variant: 'destructive',
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleDeleteMessage = async (messageId: string) => {
    setIsDeleting(messageId);
    try {
      const messageRef = doc(db, 'guestbook', messageId);
      await deleteDoc(messageRef);
      toast({
        title: '성공',
        description: '메시지를 삭제했습니다.',
      });
    } catch (error) {
      toast({
        title: '오류',
        description: '메시지 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
            <BookUser className="mr-2 h-6 w-6" />
            방명록 관리
        </h1>
        <p className="text-muted-foreground">
          학생들이 남긴 비밀 방명록 내용입니다. 부적절한 내용은 삭제해주세요.
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>보낸 학생</TableHead>
                <TableHead>받는 학생 (학번)</TableHead>
                <TableHead>내용</TableHead>
                <TableHead>작성일</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : messages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    작성된 메시지가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                messages.map(msg => (
                  <TableRow key={msg.id}>
                    <TableCell>{msg.senderDisplayName}</TableCell>
                    <TableCell>{msg.friendStudentId}</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {msg.message}
                    </TableCell>
                    <TableCell>
                      {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                                size="sm"
                                variant="destructive"
                                disabled={isDeleting === msg.id}
                            >
                                {isDeleting === msg.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                             <AlertDialogHeader>
                                <AlertDialogTitle>정말로 삭제하시겠습니까?</AlertDialogTitle>
                                <AlertDialogDescription>
                                   이 작업은 되돌릴 수 없습니다. 해당 메시지를 영구적으로 삭제합니다.
                                </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteMessage(msg.id)} className="bg-destructive hover:bg-destructive/90">삭제</AlertDialogAction>
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
