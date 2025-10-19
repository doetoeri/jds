

'use client';

import { useEffect, useState } from 'react';
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
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, orderBy, getDocs, Timestamp, doc, getDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ListOrdered } from 'lucide-react';

interface Purchase {
  id: string;
  createdAt: Timestamp;
  items: { name: string; quantity: number; price: number }[];
  totalCost: number;
  status: 'pending' | 'completed';
  paymentCode?: string;
  studentId: string;
}

export default function OrdersPage() {
  const [user, authLoading] = useAuthState(auth);
  const [userData, setUserData] = useState<{ studentId?: string } | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      getDoc(userDocRef).then(docSnap => {
        if(docSnap.exists()) {
          setUserData(docSnap.data() as any);
        } else {
            setIsLoading(false);
        }
      }).catch(err => {
          console.error("Failed to fetch user data", err);
          toast({title: "오류", description: "사용자 정보를 불러오는데 실패했습니다.", variant: "destructive"});
          setIsLoading(false);
      });
    } else {
        setIsLoading(false);
    }
  }, [user, authLoading, toast]);

  useEffect(() => {
    if (!userData || !userData.studentId) {
      if (!authLoading && user) {
        setIsLoading(false);
      }
      return;
    }

    const fetchPurchases = async () => {
      try {
        const purchasesRef = collection(db, `purchases`);
        const q = query(
            purchasesRef, 
            where('studentId', '==', userData.studentId), 
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const userPurchases = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Purchase));
        setPurchases(userPurchases);
      } catch (error) {
        console.error("Error fetching purchases: ", error);
        toast({ title: "오류", description: "주문 내역을 불러오는 데 실패했습니다.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPurchases();

  }, [user, userData, toast]);

  const formatItems = (items: Purchase['items']) => {
    if (!Array.isArray(items)) return 'N/A';
    return items.map(item => `${item.name} x${item.quantity}`).join(', ');
  };
  
  const getStatusText = (status: Purchase['status']) => {
      if (status === 'completed') return '처리 완료';
      return '처리중';
  }

  return (
    <div>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center gap-2">
            <ListOrdered />
            주문 내역 (전자 영수증)
        </h1>
        <p className="text-muted-foreground">나의 상품 주문 내역입니다.</p>
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
                <TableHead className="text-right">상태</TableHead>
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
                    <TableCell className="text-right"><Skeleton className="h-7 w-16" /></TableCell>
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
                    <TableCell className="text-right">
                      <Badge variant={purchase.status === 'completed' ? 'secondary' : 'default'}>
                        {getStatusText(purchase.status)}
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
