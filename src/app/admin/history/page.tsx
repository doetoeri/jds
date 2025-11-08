
'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
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
import { collectionGroup, getDocs, query, Timestamp, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Transaction {
  id: string;
  studentId: string; 
  userRole: string;
  date: Timestamp;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
}

export default function AdminHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchAllTransactions = async () => {
      setIsLoading(true);
      try {
        const transactionsGroupRef = collectionGroup(db, 'transactions');
        const q = query(transactionsGroupRef);
        const querySnapshot = await getDocs(q);

        const allTransactions = await Promise.all(querySnapshot.docs.map(async (doc) => {
          const data = doc.data();
          const userDocRef = doc.ref.parent.parent; 
          
          let studentId = '알 수 없음';
          let userRole = 'unknown';
          if(userDocRef) {
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const userData = userDoc.data();
              studentId = userData.studentId || userData.name || '정보 없음';
              userRole = userData.role || 'unknown';
            }
          }
          
          return {
            id: doc.id,
            studentId: studentId,
            userRole: userRole,
            ...data
          } as Transaction;
        }));

        // 클라이언트 측에서 날짜순으로 정렬
        allTransactions.sort((a, b) => b.date.toMillis() - a.date.toMillis());
        setTransactions(allTransactions);

      } catch (error) {
        console.error("Error fetching all transactions: ", error);
        toast({ title: "오류", description: "전체 거래 내역을 불러오는 데 실패했습니다.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllTransactions();
  }, [toast]);
  
  const filteredTransactions = useMemo(() => {
    if (!filter) return transactions;
    return transactions.filter(
      (t) =>
        t.studentId.includes(filter) ||
        t.description.toLowerCase().includes(filter.toLowerCase())
    );
  }, [transactions, filter]);


  return (
    <div>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline">전체 내역</h1>
        <p className="text-muted-foreground">시스템의 모든 포인트 사용 및 적립 내역입니다.</p>
      </div>

       <Card className="mb-4">
        <CardHeader>
          <CardTitle>내역 필터링</CardTitle>
          <CardDescription>학번 또는 내용으로 내역을 검색할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm">
            <Label htmlFor="filter-input" className="sr-only">
              검색
            </Label>
            <Input
              id="filter-input"
              placeholder="학번 또는 내용으로 검색..."
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
                <TableHead>사용자 학번/이름</TableHead>
                <TableHead>날짜</TableHead>
                <TableHead>내용</TableHead>
                <TableHead className="text-right">금액</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                  Array.from({ length: 10 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-7 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
              ) : filteredTransactions.length === 0 ? (
                   <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">
                      {filter ? '검색 결과가 없습니다.' : '거래 내역이 없습니다.'}
                    </TableCell>
                  </TableRow>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">
                      {transaction.studentId}
                      {transaction.userRole === 'admin' && (
                        <Badge variant="destructive" className="ml-2">관리자</Badge>
                      )}
                    </TableCell>
                    <TableCell>{transaction.date?.toDate ? transaction.date.toDate().toLocaleString() : '날짜 없음'}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={transaction.type === 'credit' ? 'default' : 'destructive'}
                      >
                        {transaction.type === 'credit' ? '+' : '-'}
                        {Math.abs(transaction.amount)} 포인트
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
