
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
import { Loader2, Eye, Printer, CheckCircle, XCircle } from 'lucide-react';
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
  
  const handleStatusUpdate = async (letterId: string, newStatus: 'approved' | 'rejected') => {
      setIsProcessing(letterId);
      try {
          const letterRef = doc(db, 'letters', letterId);
          await updateDoc(letterRef, {
              status: newStatus,
              approvedAt: newStatus === 'approved' ? Timestamp.now() : null,
          });
          
          setLetters(prev => prev.map(l => l.id === letterId ? {...l, status: newStatus} : l));
          toast({ title: '성공', description: `편지를 ${newStatus === 'approved' ? '승인' : '거절'}했습니다.` });
          
      } catch (error) {
          toast({ title: '오류', description: '상태 업데이트 중 오류 발생', variant: 'destructive'});
      } finally {
          setIsProcessing(null);
      }
  }


  const statusText = {
      pending: '대기중',
      approved: '전송됨',
      rejected: '거절됨',
  };

  const statusVariant = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
  } as const;

  return (
    <div>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline">편지 관리</h1>
        <p className="text-muted-foreground">
          학생들이 보낸 모든 편지 목록입니다.
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
                <TableHead>상태</TableHead>
                <TableHead>요청일</TableHead>
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
              ) : letters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    도착한 편지가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                letters.map(letter => (
                  <TableRow key={letter.id}>
                    <TableCell>{letter.senderStudentId || 'N/A'}</TableCell>
                    <TableCell>{letter.receiverStudentId || 'N/A'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {letter.content}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[letter.status] || 'secondary'}>
                        {statusText[letter.status] || '알 수 없음'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {letter.createdAt?.toDate ? letter.createdAt.toDate().toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                       {isProcessing === letter.id ? (
                           <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                       ) : letter.status === 'pending' ? (
                           <div className="flex gap-2 justify-end">
                               <Button size="sm" variant="default" onClick={() => handleStatusUpdate(letter.id, 'approved')} className="bg-green-500 hover:bg-green-600">
                                   <CheckCircle className="h-4 w-4" />
                               </Button>
                               <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(letter.id, 'rejected')}>
                                   <XCircle className="h-4 w-4" />
                               </Button>
                           </div>
                       ) : (
                          <Button asChild size="icon" variant="ghost">
                            <Link href={`/admin/letters/${letter.id}`}>
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">상세 보기</span>
                            </Link>
                           </Button>
                       )}
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
