

'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, MessageCircleQuestion } from 'lucide-react';
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

interface Inquiry {
  id: string;
  senderStudentId: string;
  senderDisplayName: string;
  content: string;
  status: 'open' | 'closed';
  createdAt: Timestamp;
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const inquiriesCollection = collection(db, 'inquiries');
    const q = query(inquiriesCollection, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const inquiryList = snapshot.docs.map(
            doc => ({ id: doc.id, ...doc.data() } as Inquiry)
        );
        setInquiries(inquiryList);
        setIsLoading(false);
    }, (error) => {
        console.error('Error fetching inquiries: ', error);
        toast({
            title: '오류',
            description: '문의 목록을 불러오는 데 실패했습니다.',
            variant: 'destructive',
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleMarkAsClosed = async (inquiryId: string) => {
    setIsProcessing(inquiryId);
    try {
      const inquiryRef = doc(db, 'inquiries', inquiryId);
      await updateDoc(inquiryRef, { status: 'closed' });
      toast({
        title: '성공',
        description: '문의를 처리 완료로 변경했습니다.',
      });
    } catch (error) {
      toast({
        title: '오류',
        description: '상태 변경 중 오류가 발생했습니다.',
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
            <MessageCircleQuestion className="mr-2 h-6 w-6" />
            사용자 문의 관리
        </h1>
        <p className="text-muted-foreground">
          사용자가 보낸 버그 제보 및 문의사항 목록입니다.
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>보낸 학생</TableHead>
                <TableHead>닉네임</TableHead>
                <TableHead>내용</TableHead>
                <TableHead>요청일</TableHead>
                <TableHead className="text-right">상태</TableHead>
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
              ) : inquiries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    접수된 문의가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                inquiries.map(inquiry => (
                  <TableRow key={inquiry.id}>
                    <TableCell>{inquiry.senderStudentId}</TableCell>
                    <TableCell>{inquiry.senderDisplayName}</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <Button variant="link" className="p-0 h-auto">내용 보기</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                             <AlertDialogHeader>
                                <AlertDialogTitle>문의 내용</AlertDialogTitle>
                                <AlertDialogDescription className="whitespace-pre-wrap break-words max-h-[60vh] overflow-y-auto">
                                   {inquiry.content}
                                </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                                <AlertDialogCancel>닫기</AlertDialogCancel>
                             </AlertDialogFooter>
                          </AlertDialogContent>
                       </AlertDialog>
                    </TableCell>
                    <TableCell>
                      {inquiry.createdAt?.toDate ? inquiry.createdAt.toDate().toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      {isProcessing === inquiry.id ? (
                          <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                      ) : inquiry.status === 'open' ? (
                         <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAsClosed(inquiry.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                            답변 완료로 표시
                          </Button>
                      ) : (
                        <Badge variant="secondary">답변 완료</Badge>
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
