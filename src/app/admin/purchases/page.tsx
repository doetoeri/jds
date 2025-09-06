
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
import { collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface Purchase {
  id: string;
  studentId: string;
  createdAt: Timestamp;
  items: { name: string; quantity: number; price: number }[];
  totalCost: number;
}

export default function AdminPurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAllPurchases = async () => {
      setIsLoading(true);
      try {
        const purchasesCollectionRef = collection(db, 'purchases');
        const q = query(purchasesCollectionRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const allPurchases = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Purchase));
        
        setPurchases(allPurchases);

      } catch (error) {
        console.error("Error fetching all purchases: ", error);
        toast({ title: "오류", description: "전체 주문 내역을 불러오는 데 실패했습니다.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllPurchases();
  }, [toast]);

  const formatItems = (items: Purchase['items']) => {
    if (!Array.isArray(items)) return 'N/A';
    return items.map(item => `${item.name} x${item.quantity}`).join(', ');
  }

  return (
    <div>
       <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline">전체 주문 내역</h1>
        <p className="text-muted-foreground">시스템의 모든 상품 구매 내역입니다.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>주문자 학번</TableHead>
                <TableHead>주문일시</TableHead>
                <TableHead>주문 내역</TableHead>
                <TableHead className="text-right">총 사용 포인트</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                  Array.from({ length: 10 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-7 w-16" /></TableCell>
                    </TableRow>
                  ))
              ) : purchases.length === 0 ? (
                   <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">
                      주문 내역이 없습니다.
                    </TableCell>
                  </TableRow>
              ) : (
                purchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-medium">{purchase.studentId}</TableCell>
                    <TableCell>{purchase.createdAt?.toDate ? purchase.createdAt.toDate().toLocaleString() : '날짜 없음'}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{formatItems(purchase.items)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">
                        {purchase.totalCost} 포인트
                      </Badge>
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

    
