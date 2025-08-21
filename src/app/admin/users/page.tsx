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
import { db, adjustUserLak, updateUserRole } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Coins, Loader2, UserCog } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface User {
  id: string;
  studentId?: string;
  name?: string;
  email: string;
  lak: number;
  role: 'student' | 'teacher' | 'admin' | 'pending_teacher' | 'council';
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [newRole, setNewRole] = useState<'student' | 'council' | ''>('');
  const [isProcessing, setIsProcessing] = useState(false);


  useEffect(() => {
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userList = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as User))
        .filter(user => user.role && user.role !== 'pending_teacher');
      
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
  
  const openRoleDialog = (user: User) => {
    setSelectedUser(user);
    setNewRole('');
    setIsRoleDialogOpen(true);
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

    setIsProcessing(true);
    try {
        const displayName = renderIdentifier(selectedUser);
        await adjustUserLak(selectedUser.id, amount, adjustmentReason);
        toast({
            title: '성공',
            description: `${displayName} 님의 Lak을 성공적으로 조정했습니다.`
        });
        setIsAdjustDialogOpen(false);
    } catch (error: any) {
        toast({
            title: '오류',
            description: error.message || 'Lak 조정 중 오류가 발생했습니다.',
            variant: 'destructive',
        });
    } finally {
        setIsProcessing(false);
    }
  }

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) {
        toast({ title: "오류", description: "새로운 역할을 선택해주세요.", variant: "destructive" });
        return;
    }
    setIsProcessing(true);
    try {
        await updateUserRole(selectedUser.id, newRole);
        toast({ title: "성공", description: `${renderIdentifier(selectedUser)}님의 역할이 ${newRole}으로 변경되었습니다.` });
        setIsRoleDialogOpen(false);
    } catch (error: any) {
         toast({ title: "오류", description: error.message || '역할 변경 중 오류가 발생했습니다.', variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };


  const renderIdentifier = (user: User) => {
    if (user.role === 'admin') return '관리자';
    if (user.role === 'council') return user.name || user.email;
    if (user.role === 'student') return user.studentId;
    if (user.role === 'teacher') return user.name;
    return 'N/A';
  }

  const roleDisplayNames: Record<User['role'], string> = {
    admin: '관리자',
    council: '학생회',
    teacher: '교직원',
    student: '학생',
    pending_teacher: '승인 대기',
  };


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
                <TableHead>학번/성함</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>역할</TableHead>
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
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{renderIdentifier(user)}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell><Badge variant="secondary">{roleDisplayNames[user.role] || user.role}</Badge></TableCell>
                    <TableCell className="text-right">{user.lak?.toLocaleString() ?? 0} Lak</TableCell>
                    <TableCell className="text-right space-x-2">
                       <Button variant="outline" size="sm" onClick={() => openAdjustDialog(user)} disabled={user.role === 'admin'}>
                         <Coins className="mr-1 h-3.5 w-3.5"/>
                         Lak 조정
                       </Button>
                       <Button variant="outline" size="sm" onClick={() => openRoleDialog(user)} disabled={user.role === 'admin'}>
                         <UserCog className="mr-1 h-3.5 w-3.5"/>
                         역할 변경
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
            <DialogTitle>Lak 조정: {selectedUser && renderIdentifier(selectedUser)}</DialogTitle>
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
                disabled={isProcessing}
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
                disabled={isProcessing}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isProcessing}>취소</Button>
            </DialogClose>
            <Button type="button" onClick={handleAdjustLak} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              조정하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>역할 변경: {selectedUser && renderIdentifier(selectedUser)}</DialogTitle>
            <DialogDescription>
              사용자의 역할을 변경합니다. 역할에 따라 접근 권한이 달라집니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                새 역할
              </Label>
              <Select onValueChange={(value) => setNewRole(value as any)} value={newRole} disabled={isProcessing}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="역할 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">학생</SelectItem>
                  <SelectItem value="council">학생회</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isProcessing}>취소</Button>
            </DialogClose>
            <Button type="button" onClick={handleUpdateRole} disabled={isProcessing || !newRole}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              변경하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
