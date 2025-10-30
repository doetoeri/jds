
'use client';

import { useEffect, useState } from 'react';
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
import { auth, db, submitPurchaseDispute } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, onSnapshot, Timestamp, doc, getDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ListOrdered, MessageSquareQuestion, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Purchase {
  id: string;
  createdAt: Timestamp;
  items: { name: string; quantity: number; price: number }[];
  totalCost: number;
  status: 'pending' | 'completed';
  disputeStatus?: 'open' | 'resolved';
  paymentCode?: string;
  userId: string;
}

export default function OrdersPage() {
  const [user, authLoading] = useAuthState(auth);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);


  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }
    if (!user) {
      setIsLoading(false);
      return;
    }

    const purchasesRef = collection(db, 'purchases');
    const q = query(
        purchasesRef, 
        where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userPurchases = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Purchase));
        
        // Sort by date on the client-side
        userPurchases.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

        setPurchases(userPurchases);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching purchases: ", error);
        toast({ title: "오류", description: "주문 내역을 불러오는 데 실패했습니다. 색인 문제일 수 있습니다. 관리자에게 문의하세요.", variant: "destructive" });
        setIsLoading(false);
    });
    
    return () => unsubscribe();

  }, [user, authLoading, toast]);

  const formatItems = (items: Purchase['items']) => {
    if (!Array.isArray(items)) return 'N/A';
    return items.map(item => `${item.name} x${item.quantity}`).join(', ');
  };
  
  const getStatusText = (status: Purchase['status']) => {
      if (status === 'completed') return '처리 완료';
      return '처리중';
  }

  const handleDisputeSubmit = async () => {
    if (!selectedPurchase || !disputeReason.trim()) {
        toast({ title: "오류", description: "문의 내용을 입력해주세요.", variant: "destructive" });
        return;
    }
    if (!user) return;
    
    setIsSubmitting(true);
    try {
        await submitPurchaseDispute(user.uid, selectedPurchase.id, disputeReason);
        toast({ title: "접수 완료", description: "구매 내역에 대한 문의가 관리자에게 전달되었습니다."});
        setSelectedPurchase(null);
        setDisputeReason('');
    } catch (e: any) {
        toast({ title: "오류", description: e.message, variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <>
    <div>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center gap-2">
            <ListOrdered />
            주문 내역 (전자 영수증)
        </h1>
        <p className="text-muted-foreground">나의 상품 주문 내역입니다. 문제가 있다면 '문의하기'를 눌러주세요.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>결제 코드</TableHead>
                <TableHead>주문일시</TableHead>
                <TableHead>주문 내역</TableHead>
                <TableHead>총 사용 포인트</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-7 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-7 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : purchases.length === 0 ? (
                 <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      주문 내역이 없습니다.
                    </TableCell>
                  </TableRow>
              ) : (
                purchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-mono text-xs">{purchase.paymentCode || 'N/A'}</TableCell>
                    <TableCell className="font-medium">
                       {purchase.createdAt?.toDate ? purchase.createdAt.toDate().toLocaleString() : '날짜 없음'}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">{formatItems(purchase.items)}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        {purchase.totalCost} 포인트
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={purchase.status === 'completed' ? 'secondary' : 'default'}>
                        {getStatusText(purchase.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <AlertDialog open={selectedPurchase?.id === purchase.id} onOpenChange={(isOpen) => !isOpen && setSelectedPurchase(null)}>
                          <AlertDialogTrigger asChild>
                             {purchase.disputeStatus === 'open' ? (
                                <Badge variant="outline">문의 접수됨</Badge>
                            ) : purchase.disputeStatus === 'resolved' ? (
                                <Badge variant="secondary">문의 해결됨</Badge>
                            ) : (
                                <Button variant="ghost" size="sm" onClick={() => setSelectedPurchase(purchase)}>
                                <MessageSquareQuestion className="h-4 w-4 mr-1" /> 문의하기
                                </Button>
                            )}
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>구매 내역 문의</AlertDialogTitle>
                            <AlertDialogDescription>
                                '{purchase?.paymentCode}' 주문에 대한 문의 내용을 자세히 작성해주세요. 관리자가 확인 후 조치할 것입니다.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-2">
                                <Label htmlFor="dispute-reason">문의 내용</Label>
                                <Textarea 
                                    id="dispute-reason"
                                    value={disputeReason}
                                    onChange={(e) => setDisputeReason(e.target.value)}
                                    placeholder="예: 상품을 받지 못했어요, 포인트가 잘못 차감된 것 같아요."
                                    rows={4}
                                    disabled={isSubmitting}
                                />
                            </div>
                            <AlertDialogFooter>
                            <AlertDialogCancel disabled={isSubmitting}>취소</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDisputeSubmit} disabled={isSubmitting || !disputeReason.trim()}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                제출하기
                            </AlertDialogAction>
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
    </>
  );
}
