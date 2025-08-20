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
import { db } from '@/lib/firebase';
import { collection, collectionGroup, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface Transaction {
  id: string;
  studentId: string; // This will be added during processing
  date: Timestamp;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
}

interface User {
    id: string;
    studentId: string;
}

export default function AdminHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAllTransactions = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch all users to create a map from UID to studentId
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const studentIdMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data().studentId]));

        // 2. Use a collection group query to get all transactions at once
        const transactionsGroupRef = collectionGroup(db, 'transactions');
        const q = query(transactionsGroupRef, orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);

        const allTransactions = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const userPath = doc.ref.parent.parent; // Get the user document path
          const userId = userPath?.id || '';
          
          return {
            id: doc.id,
            studentId: studentIdMap.get(userId) || '알 수 없음', // Look up studentId from map
            ...data
          } as Transaction;
        });

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">전체 내역</CardTitle>
        <CardDescription>시스템의 모든 Lak 사용 및 적립 내역입니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>사용자 학번</TableHead>
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
            ) : transactions.length === 0 ? (
                 <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    거래 내역이 없습니다.
                  </TableCell>
                </TableRow>
            ) : (
              transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">{transaction.studentId}</TableCell>
                  <TableCell>{transaction.date ? transaction.date.toDate().toLocaleDateString() : '날짜 없음'}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={transaction.type === 'credit' ? 'default' : 'destructive'}
                    >
                      {transaction.type === 'credit' ? '+' : '-'}
                      {Math.abs(transaction.amount)} Lak
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
