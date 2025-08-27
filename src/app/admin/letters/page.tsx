
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
  Timestamp,
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
import { Loader2, CheckCircle, XCircle, Printer, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface Letter {
  id: string;
  senderStudentId: string;
  receiverStudentId: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
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
      const letterRef = doc(db, 'letters', letter.id);
      
      // Offline letter logic - just update status
      if (letter.isOffline) {
        await updateDoc(letterRef, {
            status: 'approved',
            approvedAt: Timestamp.now(),
        });
        toast({
            title: '성공',
            description: '오프라인 편지를 승인 처리했습니다. 이제 직접 전달해주세요.',
        });
        await fetchLetters();
        setIsProcessing(null);
        return;
      }

      // Online letter logic (with points)
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

      batch.update(letterRef, { status: 'approved', approvedAt: Timestamp.now() });

      batch.update(receiverRef, { lak: (receiverData.lak || 0) + 2 });
      batch.update(senderRef, { lak: (senderData.lak || 0) + 2 });

      const receiverTransactionRef = doc(collection(receiverRef, 'transactions'));
      batch.set(receiverTransactionRef, {
        amount: 2,
        date: Timestamp.now(),
        description: `편지 수신 (보낸 사람: ${letter.senderStudentId})`,
        type: 'credit',
      });

      const senderTransactionRef = doc(collection(senderRef, 'transactions'));
      batch.set(senderTransactionRef, {
        amount: 2,
        date: Timestamp.now(),
        description: `편지 발신 보상 (받는 사람: ${letter.receiverStudentId})`,
        type: 'credit',
      });

      await batch.commit();

      toast({
        title: '성공',
        description: '편지를 승인하고 포인트를 지급했습니다.',
      });
      await fetchLetters();
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
        await fetchLetters();
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
    <div>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline">편지 관리</h1>
        <p className="text-muted-foreground">
          학생들이 보낸 편지를 관리하고 승인합니다.
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
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
                       {letter.content}
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
                      {letter.createdAt?.toDate ? letter.createdAt.toDate().toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex gap-2 justify-end">
                            <Button asChild size="icon" variant="ghost">
                              <Link href={`/admin/letters/${letter.id}`}>
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">상세 보기</span>
                              </Link>
                            </Button>
                          {letter.isOffline && (
                            <Button asChild size="icon" variant="ghost">
                              <Link href={`/admin/letters/print?id=${letter.id}`} target="_blank">
                                <Printer className="h-4 w-4" />
                                <span className="sr-only">인쇄</span>
                              </Link>
                            </Button>
                          )}
                          {isProcessing === letter.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                          ) : letter.status === 'pending' ? (
                            <>
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
                            </>
                          ) : (
                            <span>완료</span>
                          )}
                        </div>
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
