
'use client';

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
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  studentId?: string;
  name?: string;
  displayName?: string;
  email: string;
  lak: number;
  role: 'student' | 'teacher' | 'admin' | 'pending_teacher' | 'council';
}

export default function CouncilUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const usersCollection = collection(db, 'users');
    // Firestore's inequality filter and orderBy on different fields require a composite index.
    // To avoid this requirement for this specific view, we remove the ordering and sort client-side.
    const q = query(usersCollection, where('role', '==', 'student'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      
      // Sort client-side
      userList.sort((a, b) => {
        if (a.studentId && b.studentId) {
          return a.studentId.localeCompare(b.studentId);
        }
        return 0;
      });

      setUsers(userList);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching real-time users:", error);
      toast({
        title: '오류',
        description: '학생 목록을 실시간으로 불러오는 데 실패했습니다.',
        variant: 'destructive',
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  return (
    <div>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline">학생 사용자 관리</h1>
        <p className="text-muted-foreground">시스템에 등록된 모든 학생 목록입니다.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>학번</TableHead>
                <TableHead>닉네임</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead className="text-right">보유 포인트</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.studentId}</TableCell>
                    <TableCell>{user.displayName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="text-right">{user.lak?.toLocaleString() ?? 0} 포인트</TableCell>
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
