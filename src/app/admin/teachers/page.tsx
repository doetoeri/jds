'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface PendingTeacher {
  id: string; // This is the user's UID
  name: string;
  email: string;
  officeFloor: string;
  role: 'pending_teacher';
  createdAt: Timestamp;
}

export default function AdminTeachersPage() {
  const [pendingTeachers, setPendingTeachers] = useState<PendingTeacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const q = query(
        collection(db, 'users'), 
        where('role', '==', 'pending_teacher')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const teachers = querySnapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() } as PendingTeacher)
      );
      // Sort on the client side
      teachers.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

      setPendingTeachers(teachers);
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching pending teachers: ", error);
        toast({
            title: '오류',
            description: '승인 대기 중인 교직원 목록을 불러오는 데 실패했습니다.',
            variant: 'destructive',
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleApproval = async (teacherId: string, approve: boolean) => {
    setIsProcessing(teacherId);
    try {
      const teacherRef = doc(db, 'users', teacherId);
      if (approve) {
        await updateDoc(teacherRef, { role: 'teacher' });
        toast({
          title: '성공',
          description: '교직원 가입을 승인했습니다.',
        });
      } else {
        // To reject, we delete the user document.
        // Note: This does not delete the Firebase Auth user.
        // That needs to be done manually in the Firebase Console for security reasons.
        await deleteDoc(teacherRef);
         toast({
          title: '성공',
          description: '교직원 가입을 거절했습니다. (인증 정보는 Firebase 콘솔에서 삭제해야 합니다)',
          variant: 'default',
        });
      }
    } catch (error: any) {
      toast({
        title: '오류',
        description: `작업 처리 중 오류가 발생했습니다: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(null);
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">교직원 승인 관리</CardTitle>
        <CardDescription>
          교직원으로 가입을 신청한 사용자 목록입니다. 확인 후 승인 또는 거절해주세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>성함</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>교무실 층수</TableHead>
              <TableHead>요청일</TableHead>
              <TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : pendingTeachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  승인을 기다리는 교직원이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              pendingTeachers.map(teacher => (
                <TableRow key={teacher.id}>
                  <TableCell>{teacher.name}</TableCell>
                  <TableCell>{teacher.email}</TableCell>
                  <TableCell>{teacher.officeFloor}</TableCell>
                   <TableCell>
                    {teacher.createdAt?.toDate ? teacher.createdAt.toDate().toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    {isProcessing === teacher.id ? (
                        <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                    ) : (
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApproval(teacher.id, true)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          승인
                        </Button>
                         <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleApproval(teacher.id, false)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          거절
                        </Button>
                      </div>
                    )}
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
