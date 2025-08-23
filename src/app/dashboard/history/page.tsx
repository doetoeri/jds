
'use client';

import { useEffect, useState } from 'react';
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
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface Transaction {
  id: string;
  date: Timestamp;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
}

export default function HistoryPage() {
  const [user] = useAuthState(auth);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const transactionsRef = collection(db, `users/${user.uid}/transactions`);
        const q = query(transactionsRef, orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        const userTransactions = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Transaction));
        setTransactions(userTransactions);
      } catch (error) {
        console.error("Error fetching transactions: ", error);
        toast({ title: "오류", description: "거래 내역을 불러오는 데 실패했습니다.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchTransactions();
  }, [user, toast]);

  return (
    <div className="container mx-auto max-w-4xl p-0 sm:p-4">
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">사용 내역</CardTitle>
        <CardDescription>나의 Lak 사용 및 적립 내역입니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>날짜</TableHead>
              <TableHead>내용</TableHead>
              <TableHead className="text-right">금액</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-7 w-16" /></TableCell>
                </TableRow>
              ))
            ) : transactions.length === 0 ? (
               <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">
                    거래 내역이 없습니다.
                  </TableCell>
                </TableRow>
            ) : (
              transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">
                     {transaction.date?.toDate ? transaction.date.toDate().toLocaleDateString() : '날짜 없음'}
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={transaction.type === 'credit' ? 'default' : 'destructive'}
                    >
                      {transaction.type === 'credit' ? '+' : ''}
                      {transaction.amount} Lak
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
