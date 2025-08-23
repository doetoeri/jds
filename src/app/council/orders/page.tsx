
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
import { db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';

interface Purchase {
  id: string;
  studentId: string;
  createdAt: Timestamp;
  items: { name: string; quantity: number; price: number }[];
  totalCost: number;
  status: 'pending' | 'completed';
}

export default function CouncilOrdersPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const purchasesCollectionRef = collection(db, 'purchases');
    const q = query(purchasesCollectionRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const allPurchases = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Purchase));
        setPurchases(allPurchases);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching purchases: ", error);
        toast({ title: "오류", description: "주문 내역을 불러오는 데 실패했습니다.", variant: "destructive" });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  const handleCompleteOrder = async (purchaseId: string) => {
    setIsProcessing(purchaseId);
    try {
        const purchaseRef = doc(db, 'purchases', purchaseId);
        await updateDoc(purchaseRef, {
            status: 'completed'
        });
        toast({ title: '처리 완료', description: '주문을 완료 처리했습니다.' });
    } catch(error) {
        toast({ title: '오류', description: '주문 처리 중 오류가 발생했습니다.', variant: 'destructive' });
    } finally {
        setIsProcessing(null);
    }
  };

  const formatItems = (items: Purchase['items']) => {
    if (!Array.isArray(items)) return 'N/A';
    return items.map(item => `${item.name} x${item.quantity}`).join(', ');
  }

  return (
    <div>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline">주문 내역 (실시간)</h1>
        <p className="text-muted-foreground">학생들의 상품 주문 내역입니다. 상품 전달 후 '처리 완료'를 눌러주세요.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>주문자 학번</TableHead>
                <TableHead>주문 시간</TableHead>
                <TableHead>주문 내역</TableHead>
                <TableHead>총 사용 Lak</TableHead>
                <TableHead className="text-right">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))
              ) : purchases.length === 0 ? (
                   <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      주문 내역이 없습니다.
                    </TableCell>
                  </TableRow>
              ) : (
                purchases.map((purchase) => (
                  <TableRow key={purchase.id} className={purchase.status === 'completed' ? 'bg-muted/50' : ''}>
                    <TableCell className="font-medium">{purchase.studentId}</TableCell>
                    <TableCell>{purchase.createdAt?.toDate ? purchase.createdAt.toDate().toLocaleString() : '날짜 없음'}</TableCell>
                    <TableCell className="max-w-[250px] truncate">{formatItems(purchase.items)}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        {purchase.totalCost} Lak
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {purchase.status === 'pending' ? (
                         <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => handleCompleteOrder(purchase.id)} 
                          disabled={isProcessing === purchase.id}
                          className="bg-green-600 hover:bg-green-700"
                          >
                          {isProcessing === purchase.id ? (
                              <Loader2 className="h-4 w-4 animate-spin"/>
                          ) : (
                              <CheckCircle className="h-4 w-4"/>
                          )}
                          <span className="ml-2">처리 완료</span>
                         </Button>
                      ) : (
                          <Badge variant="secondary">완료</Badge>
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

    