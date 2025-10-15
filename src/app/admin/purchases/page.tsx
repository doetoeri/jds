'use client';

import { useEffect, useState, useMemo } from 'react';
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
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Purchase {
  id: string;
  studentId: string;
  createdAt: Timestamp;
  items: { name: string; quantity: number; price: number }[];
  totalCost: number;
  paymentCode?: string;
  operatorId?: string;
}

export default function AdminPurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');
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
  
  const filteredPurchases = useMemo(() => {
    if (!filter) return purchases;
    return purchases.filter(p => 
        p.studentId.includes(filter) ||
        p.paymentCode?.toLowerCase().includes(filter.toLowerCase())
    );
  }, [purchases, filter]);

  const formatItems = (items: Purchase['items']) => {
    if (!Array.isArray(items)) return 'N/A';
    return items.map(item => `${item.name} x${item.quantity}`).join(', ');
  }

  const getPaymentType = (paymentCode?: string) => {
    if (!paymentCode) return <Badge variant="secondary">알 수 없음</Badge>;
    if (paymentCode.startsWith('ONL')) return <Badge variant="default">온라인</Badge>;
    if (paymentCode.startsWith('POS')) return <Badge variant="outline">오프라인</Badge>;
    return <Badge variant="secondary">기타</Badge>;
  }

  return (
    <div>
       <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline">전체 주문 내역</h1>
        <p className="text-muted-foreground">시스템의 모든 상품 구매 내역입니다.</p>
      </div>
       <Card className="mb-4">
        <CardHeader>
          <CardTitle>내역 필터링</CardTitle>
          <CardDescription>학번 또는 결제 코드로 내역을 검색할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm">
            <Label htmlFor="filter-input" className="sr-only">
              검색
            </Label>
            <Input
              id="filter-input"
              placeholder="학번 또는 결제 코드로 검색..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </CardContent>
       </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>결제 코드</TableHead>
                <TableHead>주문자 학번</TableHead>
                <TableHead>주문일시</TableHead>
                <TableHead>주문 내역</TableHead>
                <TableHead>결제 유형</TableHead>
                <TableHead className="text-right">총 사용 포인트</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                  Array.from({ length: 10 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-7 w-16" /></TableCell>
                    </TableRow>
                  ))
              ) : filteredPurchases.length === 0 ? (
                   <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      {filter ? '검색 결과가 없습니다.' : '주문 내역이 없습니다.'}
                    </TableCell>
                  </TableRow>
              ) : (
                filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-mono text-xs">{purchase.paymentCode || 'N/A'}</TableCell>
                    <TableCell className="font-medium">{purchase.studentId}</TableCell>
                    <TableCell>{purchase.createdAt?.toDate ? purchase.createdAt.toDate().toLocaleString() : '날짜 없음'}</TableCell>
                    <TableCell className="max-w-[250px] truncate">{formatItems(purchase.items)}</TableCell>
                    <TableCell>{getPaymentType(purchase.paymentCode)}</TableCell>
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
