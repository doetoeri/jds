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
import { db, adjustUserLak } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Coins, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  useEffect(() => {
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

    return () => unsubscribe();
  }, [toast]);

  const openAdjustDialog = (user: User) => {
    setSelectedUser(user);
    setAdjustmentAmount('');
    setAdjustmentReason('');
    setIsAdjustDialogOpen(true);
  };

  const handleAdjustLak = async () => {
    if (!selectedUser || !adjustmentAmount || !adjustmentReason) {
        toast({ title: '입력 오류', description: '모든 필드를 채워주세요.', variant: 'destructive' });
        return;
    }

    const amount = Number(adjustmentAmount);
    if (isNaN(amount) || amount === 0) {
        toast({ title: '입력 오류', description: '유효한 숫자를 입력해주세요 (0 제외).', variant: 'destructive' });
        return;
    }

    setIsAdjusting(true);
    try {
        await adjustUserLak(selectedUser.id, amount, adjustmentReason);
        toast({
            title: '성공',
            description: `${selectedUser.studentId} 학생의 Lak을 성공적으로 조정했습니다.`
        });
        setIsAdjustDialogOpen(false);
    } catch (error: any) {
        toast({
            title: '오류',
            description: error.message || 'Lak 조정 중 오류가 발생했습니다.',
            variant: 'destructive',
        });
    } finally {
        setIsAdjusting(false);
    }
  }

  return (
    <>
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
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.studentId}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="text-right">{user.lak?.toLocaleString() ?? 0} Lak</TableCell>
                    <TableCell className="text-right">
                       <Button variant="outline" size="sm" onClick={() => openAdjustDialog(user)}>
                         <Coins className="mr-2 h-3.5 w-3.5"/>
                         Lak 조정
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lak 조정: {selectedUser?.studentId}</DialogTitle>
            <DialogDescription>
              사용자의 Lak을 직접 추가하거나 차감합니다. 모든 내역은 기록됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                조정값
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="예: 10 (추가), -5 (차감)"
                className="col-span-3"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
                disabled={isAdjusting}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reason" className="text-right">
                조정 사유
              </Label>
              <Input
                id="reason"
                placeholder="예: 이벤트 보상, 오류 수정 등"
                className="col-span-3"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                disabled={isAdjusting}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isAdjusting}>취소</Button>
            </DialogClose>
            <Button type="button" onClick={handleAdjustLak} disabled={isAdjusting}>
              {isAdjusting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              조정하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
