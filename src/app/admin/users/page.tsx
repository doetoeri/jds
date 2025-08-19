'use client';

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
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  studentId: string;
  email: string;
  lak: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, orderBy('studentId'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(userList);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching real-time users:", error);
      toast({
        title: '오류',
        description: '사용자 목록을 실시간으로 불러오는 데 실패했습니다.',
        variant: 'destructive',
      });
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [toast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">사용자 관리</CardTitle>
        <CardDescription>시스템에 등록된 모든 사용자 목록입니다. (실시간 동기화)</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>학번</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead className="text-right">보유 Lak</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.studentId}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="text-right">{user.lak?.toLocaleString() ?? 0} Lak</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
