'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db, resolvePurchaseDispute } from '@/lib/firebase';
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
import { Loader2, CheckCircle, ShieldQuestion } from 'lucide-react';
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

interface Dispute {
  id: string;
  studentId: string;
  reason: string;
  purchaseId: string;
  purchaseItems: { name: string; quantity: number; price: number }[];
  status: 'open' | 'resolved';
  createdAt: Timestamp;
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const disputesCollection = collection(db, 'disputes');
    const q = query(disputesCollection, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const disputeList = snapshot.docs.map(
            doc => ({ id: doc.id, ...doc.data() } as Dispute)
        );
        setDisputes(disputeList);
        setIsLoading(false);
    }, (error) => {
        console.error('Error fetching disputes: ', error);
        toast({
            title: '오류',
            description: '구매 문의 목록을 불러오는 데 실패했습니다.',
            variant: 'destructive',
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  const formatItems = (items: Dispute['purchaseItems'] = []) => {
    if (!Array.isArray(items)) return 'N/A';
    return items.map(item => `${item.name} x${item.quantity}`).join(', ');
  }

  const handleMarkAsResolved = async (dispute: Dispute) => {
    setIsProcessing(dispute.id);
    try {
      await resolvePurchaseDispute(dispute.id, dispute.purchaseId);
      toast({
        title: '성공',
        description: '문의를 해결됨으로 처리했습니다.',
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
            <ShieldQuestion className="mr-2 h-6 w-6" />
            구매 문의 관리
        </h1>
        <p className="text-muted-foreground">
          학생들이 상품 구매에 대해 제기한 문의 목록입니다.
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>문의 학생</TableHead>
                <TableHead>문의 내용</TableHead>
                <TableHead>관련 주문</TableHead>
                <TableHead>접수일</TableHead>
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
              ) : disputes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    접수된 구매 문의가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                disputes.map(dispute => (
                  <TableRow key={dispute.id}>
                    <TableCell>{dispute.studentId}</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <Button variant="link" className="p-0 h-auto">내용 보기</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                             <AlertDialogHeader>
                                <AlertDialogTitle>문의 내용</AlertDialogTitle>
                                <AlertDialogDescription className="whitespace-pre-wrap break-words max-h-[60vh] overflow-y-auto">
                                   {dispute.reason}
                                </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                                <AlertDialogCancel>닫기</AlertDialogCancel>
                             </AlertDialogFooter>
                          </AlertDialogContent>
                       </AlertDialog>
                    </TableCell>
                    <TableCell className="text-xs">{formatItems(dispute.purchaseItems)}</TableCell>
                    <TableCell>
                      {dispute.createdAt?.toDate ? dispute.createdAt.toDate().toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      {isProcessing === dispute.id ? (
                          <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                      ) : dispute.status === 'open' ? (
                         <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAsResolved(dispute)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                            해결됨으로 표시
                          </Button>
                      ) : (
                        <Badge variant="secondary">해결됨</Badge>
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
