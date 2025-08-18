'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  writeBatch,
  getDoc,
  where,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Printer } from 'lucide-react';
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

interface Letter {
  id: string;
  senderStudentId: string;
  receiverStudentId: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  senderUid: string;
  isOffline?: boolean;
}

export default function AdminLettersPage() {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchLetters = async () => {
    setIsLoading(true);
    try {
      const lettersCollection = collection(db, 'letters');
      const q = query(lettersCollection, orderBy('createdAt', 'desc'));
      const letterSnapshot = await getDocs(q);
      const letterList = letterSnapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() } as Letter)
      );
      setLetters(letterList);
    } catch (error) {
      console.error('Error fetching letters: ', error);
      toast({
        title: '오류',
        description: '편지 목록을 불러오는 데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLetters();
  }, []);

  const handleApproveLetter = async (letter: Letter) => {
    setIsProcessing(letter.id);
    try {
      // Offline letter logic
      if (letter.isOffline) {
        const letterRef = doc(db, 'letters', letter.id);
        await updateDoc(letterRef, {
            status: 'approved',
            approvedAt: new Date(),
            content: '관리자를 통해 오프라인으로 편지가 전달되었습니다.' // Hide content
        });
        toast({
            title: '성공',
            description: '오프라인 편지를 승인 처리했습니다. 이제 직접 전달해주세요.',
        });
        fetchLetters();
        return;
      }

      // Online letter logic (with Lak points)
      const batch = writeBatch(db);
      const usersRef = collection(db, 'users');
      
      const receiverQuery = query(
        usersRef,
        where('studentId', '==', letter.receiverStudentId)
      );
      const receiverSnapshot = await getDocs(receiverQuery);

      if (receiverSnapshot.empty) {
        throw new Error('받는 학생을 찾을 수 없습니다.');
      }
      const receiverDoc = receiverSnapshot.docs[0];
      const receiverRef = receiverDoc.ref;
      const receiverData = receiverDoc.data();

      const senderRef = doc(db, 'users', letter.senderUid);
      const senderDoc = await getDoc(senderRef);
       if (!senderDoc.exists()) {
        throw new Error('보낸 학생을 찾을 수 없습니다.');
      }
      const senderData = senderDoc.data();

      const letterRef = doc(db, 'letters', letter.id);
      batch.update(letterRef, { status: 'approved', approvedAt: new Date() });

      batch.update(receiverRef, { lak: (receiverData.lak || 0) + 2 });
      batch.update(senderRef, { lak: (senderData.lak || 0) + 2 });

      const receiverTransactionRef = doc(collection(receiverRef, 'transactions'));
      batch.set(receiverTransactionRef, {
        amount: 2,
        date: new Date(),
        description: `편지 수신 (보낸 사람: ${letter.senderStudentId})`,
        type: 'credit',
      });

      const senderTransactionRef = doc(collection(senderRef, 'transactions'));
      batch.set(senderTransactionRef, {
        amount: 2,
        date: new Date(),
        description: `편지 발신 보상 (받는 사람: ${letter.receiverStudentId})`,
        type: 'credit',
      });

      await batch.commit();

      toast({
        title: '성공',
        description: '편지를 승인하고 Lak을 지급했습니다.',
      });
      fetchLetters();
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '편지 승인 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRejectLetter = async (letterId: string) => {
     setIsProcessing(letterId);
     try {
        const letterRef = doc(db, 'letters', letterId);
        await updateDoc(letterRef, { status: 'rejected' });
        toast({
            title: '성공',
            description: '편지를 거절 처리했습니다.',
            variant: 'default',
        });
        fetchLetters();
     } catch (error) {
        toast({
            title: '오류',
            description: '편지 거절 중 오류가 발생했습니다.',
            variant: 'destructive',
        });
     } finally {
        setIsProcessing(null);
     }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">편지 관리</CardTitle>
        <CardDescription>
          학생들이 보낸 편지를 관리하고 승인합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>보낸 학생</TableHead>
              <TableHead>받는 학생</TableHead>
              <TableHead>내용</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>요청일</TableHead>
              <TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : letters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">
                  도착한 편지가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              letters.map(letter => (
                <TableRow key={letter.id}>
                  <TableCell>{letter.senderStudentId}</TableCell>
                  <TableCell>{letter.receiverStudentId}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="link" className="p-0 h-auto" disabled={letter.status === 'approved' && letter.isOffline}>내용 보기</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                           <AlertDialogHeader>
                              <AlertDialogTitle>편지 내용</AlertDialogTitle>
                              <AlertDialogDescription className="whitespace-pre-wrap break-words">
                                 {letter.content}
                              </AlertDialogDescription>
                           </AlertDialogHeader>
                           <AlertDialogFooter>
                              <AlertDialogCancel>닫기</AlertDialogCancel>
                           </AlertDialogFooter>
                        </AlertDialogContent>
                     </AlertDialog>
                  </TableCell>
                  <TableCell>
                    {letter.isOffline ? (
                        <Badge variant="secondary"><Printer className="h-3 w-3 mr-1"/>오프라인</Badge>
                    ) : (
                        <Badge variant="outline">온라인</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        letter.status === 'approved'
                          ? 'default'
                          : letter.status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {letter.status === 'pending' && '대기중'}
                      {letter.status === 'approved' && '승인됨'}
                      {letter.status === 'rejected' && '거절됨'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {letter.createdAt
                      ? new Date(
                          letter.createdAt.seconds * 1000
                        ).toLocaleDateString()
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    {isProcessing === letter.id ? (
                        <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                    ) : letter.status === 'pending' ? (
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApproveLetter(letter)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          승인
                        </Button>
                         <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectLetter(letter.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          거절
                        </Button>
                      </div>
                    ) : (
                      <span>완료</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
