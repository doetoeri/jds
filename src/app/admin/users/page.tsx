

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
import { db, adjustUserLak, updateUserRole, deleteUser, bulkAdjustUserLak, setUserLak, bulkSetUserLak, awardLeaderboardRewards } from '@/lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Coins, Loader2, UserCog, Trash2, Filter, ArrowUpDown, Trophy } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogAction,
  AlertDialogCancel
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


interface User {
  id: string;
  studentId?: string;
  name?: string;
  email: string;
  lak: number;
  role: 'student' | 'teacher' | 'admin' | 'pending_teacher' | 'council' | 'council_booth';
}

type SortKey = 'lak';
type SortDirection = 'asc' | 'desc';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [isBulkAdjustDialogOpen, setIsBulkAdjustDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);


  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [newRole, setNewRole] = useState<'student' | 'council' | 'council_booth' | ''>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [gradeFilter, setGradeFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('lak');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  const [isRewardDialogOpen, setIsRewardDialogOpen] = useState(false);
  const [selectedLeaderboard, setSelectedLeaderboard] = useState('');
  const [isRewarding, setIsRewarding] = useState(false);


  useEffect(() => {
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection);

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
  
  const sortedAndFilteredUsers = useMemo(() => {
    let filtered = users.filter(user => {
      if (!gradeFilter && !classFilter) {
          return true;
      }
      
      // Only filter for students
      if (user.role !== 'student' || !user.studentId || typeof user.studentId !== 'string' || user.studentId.length !== 5) {
        return false; 
      }
      
      const grade = user.studentId.substring(0, 1);
      const studentClass = user.studentId.substring(1, 3);
      
      const gradeMatch = gradeFilter ? grade === gradeFilter : true;
      const classMatch = classFilter ? studentClass === classFilter : true;
      
      return gradeMatch && classMatch;
    });

    return filtered.sort((a, b) => {
        const aValue = a[sortKey] || 0;
        const bValue = b[sortKey] || 0;

        if (aValue < bValue) {
            return sortDirection === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortDirection === 'asc' ? 1 : -1;
        }
        return 0;
    });
  }, [users, gradeFilter, classFilter, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
        setSortKey(key);
        setSortDirection('desc');
    }
  };


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
  
  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };
  
  const openBulkAdjustDialog = () => {
    setAdjustmentAmount('');
    setAdjustmentReason('');
    setIsBulkAdjustDialogOpen(true);
  }


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
            description: `${displayName} 님의 포인트를 성공적으로 조정했습니다.`
        });
        setIsAdjustDialogOpen(false);
    } catch (error: any) {
        toast({
            title: '오류',
            description: error.message || '포인트 조정 중 오류가 발생했습니다.',
            variant: 'destructive',
        });
    } finally {
        setIsProcessing(false);
    }
  }

  const handleSetLak = async () => {
    if (!selectedUser || !adjustmentAmount || !adjustmentReason) {
        toast({ title: '입력 오류', description: '모든 필드를 채워주세요.', variant: 'destructive' });
        return;
    }

    const amount = Number(adjustmentAmount);
    if (isNaN(amount) || amount < 0) {
        toast({ title: '입력 오류', description: '유효한 양수 또는 0을 입력해주세요.', variant: 'destructive' });
        return;
    }

    setIsProcessing(true);
    try {
        const displayName = renderIdentifier(selectedUser);
        await setUserLak(selectedUser.id, amount, adjustmentReason);
        toast({
            title: '성공',
            description: `${displayName} 님의 포인트를 ${amount}으로 설정했습니다.`
        });
        setIsAdjustDialogOpen(false);
    } catch (error: any) {
        toast({
            title: '오류',
            description: error.message || '포인트 설정 중 오류가 발생했습니다.',
            variant: 'destructive',
        });
    } finally {
        setIsProcessing(false);
    }
  };
  
  const handleBulkAdjustLak = async () => {
    if (!adjustmentAmount || !adjustmentReason) {
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
        await bulkAdjustUserLak(selectedUsers, amount, adjustmentReason);
        toast({ title: "성공", description: `${selectedUsers.length}명의 사용자 포인트를 조정했습니다.` });
        setIsBulkAdjustDialogOpen(false);
        setSelectedUsers([]);
    } catch (error: any) {
         toast({ title: "오류", description: error.message || '일괄 포인트 조정 중 오류가 발생했습니다.', variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  }
  
  const handleBulkSetLak = async () => {
    if (!adjustmentAmount || !adjustmentReason) {
      toast({ title: '입력 오류', description: '모든 필드를 채워주세요.', variant: 'destructive' });
      return;
    }
    const amount = Number(adjustmentAmount);
    if (isNaN(amount) || amount < 0) {
      toast({ title: '입력 오류', description: '유효한 양수 또는 0을 입력해주세요.', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    try {
      await bulkSetUserLak(selectedUsers, amount, adjustmentReason);
      toast({ title: "성공", description: `${selectedUsers.length}명의 사용자 포인트를 ${amount}으로 설정했습니다.` });
      setIsBulkAdjustDialogOpen(false);
      setSelectedUsers([]);
    } catch (error: any) {
      toast({ title: "오류", description: error.message || '일괄 포인트 설정 중 오류가 발생했습니다.', variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };


  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) {
        toast({ title: "오류", description: "새로운 역할을 선택해주세요.", variant: "destructive" });
        return;
    }
    setIsProcessing(true);
    try {
        await updateUserRole(selectedUser.id, newRole);
        toast({ title: "성공", description: `${renderIdentifier(selectedUser)}님의 역할이 ${roleDisplayNames[newRole]}으로 변경되었습니다.` });
        setIsRoleDialogOpen(false);
    } catch (error: any) {
         toast({ title: "오류", description: error.message || '역할 변경 중 오류가 발생했습니다.', variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    setIsProcessing(true);
    try {
      await deleteUser(selectedUser.id);
      toast({
        title: "사용자 삭제 완료",
        description: `${renderIdentifier(selectedUser)}님의 Firestore 데이터가 삭제되었습니다. Firebase 콘솔에서 인증 정보를 마저 삭제해주세요.`
      });
      setIsDeleteDialogOpen(false);
    } catch (error: any) {
      toast({ title: "오류", description: error.message || "사용자 삭제 중 오류가 발생했습니다.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleRewardLeaderboard = async () => {
    if (!selectedLeaderboard) {
      toast({ title: '오류', description: '보상을 지급할 리더보드를 선택해주세요.', variant: 'destructive' });
      return;
    }
    setIsRewarding(true);
    try {
      const result = await awardLeaderboardRewards(selectedLeaderboard);
      toast({
        title: `보상 지급 완료`,
        description: `${result.successCount}명의 랭커에게 보상이 지급되었습니다. (실패: ${result.failCount})`
      });
      setIsRewardDialogOpen(false);
    } catch (error: any) {
      toast({ title: '오류', description: error.message || '리더보드 보상 지급 중 오류가 발생했습니다.', variant: 'destructive' });
    } finally {
      setIsRewarding(false);
    }
  };


  const renderIdentifier = (user: User) => {
    if (user.role === 'admin') return '관리자';
    if (user.role === 'council' || user.role === 'council_booth') return user.name || user.email;
    if (user.role === 'student') return user.studentId;
    if (user.role === 'teacher') return user.name;
    return 'N/A';
  }

  const roleDisplayNames: Record<User['role'], string> = {
    admin: '관리자',
    council: '학생회',
    council_booth: '학생회(부스)',
    teacher: '교직원',
    student: '학생',
    pending_teacher: '승인 대기',
  };
  
  const handleSelectUser = (userId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedUsers(sortedAndFilteredUsers.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };


  return (
    <>
      <div className="space-y-1 mb-4 flex justify-between items-start">
        <div>
            <h1 className="text-2xl font-bold tracking-tight font-headline">사용자 관리</h1>
            <p className="text-muted-foreground">시스템에 등록된 모든 사용자 목록입니다. (실시간 동기화)</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={() => setIsRewardDialogOpen(true)}>
                <Trophy className="mr-2 h-4 w-4"/>
                리더보드 보상 지급
            </Button>
            <Button onClick={openBulkAdjustDialog} disabled={selectedUsers.length === 0}>
                <Coins className="mr-2 h-4 w-4"/>
                선택 사용자 포인트 관리 ({selectedUsers.length})
            </Button>
        </div>
      </div>

       <Card className="mb-4">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
                <Filter className="h-4 w-4 text-muted-foreground"/>
                <Label htmlFor="grade-filter" className="shrink-0">학년</Label>
                <Input 
                    id="grade-filter"
                    placeholder="예: 1" 
                    className="w-20"
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                />
                <Label htmlFor="class-filter" className="shrink-0">반</Label>
                <Input 
                    id="class-filter"
                    placeholder="예: 03" 
                    className="w-20"
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                />
            </div>
             <Button variant="outline" onClick={() => { setGradeFilter(''); setClassFilter(''); }}>필터 초기화</Button>
        </CardContent>
       </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                 <TableHead className="w-[50px]">
                  <Checkbox 
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                    checked={sortedAndFilteredUsers.length > 0 && selectedUsers.length === sortedAndFilteredUsers.length}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>학번/성함</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>역할</TableHead>
                <TableHead className="text-right">
                    <Button variant="ghost" onClick={() => handleSort('lak')}>
                        보유 포인트
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                </TableHead>
                <TableHead className="text-right">개별 작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (
                sortedAndFilteredUsers.map((user) => (
                  <TableRow key={user.id} data-state={selectedUsers.includes(user.id) ? "selected" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                        aria-label={`Select user ${renderIdentifier(user)}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{renderIdentifier(user)}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell><Badge variant="secondary">{roleDisplayNames[user.role] || user.role}</Badge></TableCell>
                    <TableCell className="text-right">{user.lak?.toLocaleString() ?? 0} 포인트</TableCell>
                    <TableCell className="text-right space-x-1">
                       <Button variant="outline" size="sm" onClick={() => openAdjustDialog(user)} disabled={user.role === 'admin'}>
                         <Coins className="mr-1 h-3.5 w-3.5"/>
                         포인트
                       </Button>
                       <Button variant="outline" size="sm" onClick={() => openRoleDialog(user)} disabled={user.role === 'admin'}>
                         <UserCog className="mr-1 h-3.5 w-3.5"/>
                         역할
                       </Button>
                       <Button variant="destructive" size="icon" onClick={() => openDeleteDialog(user)} disabled={user.role === 'admin'}>
                         <Trash2 className="h-4 w-4" />
                         <span className="sr-only">Delete User</span>
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Lak Adjust Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>포인트 관리: {selectedUser && renderIdentifier(selectedUser)}</DialogTitle>
             <DialogDescription>
              현재 보유 포인트: {selectedUser?.lak.toLocaleString() ?? 0}
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="adjust" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="adjust">포인트 증감</TabsTrigger>
              <TabsTrigger value="set">포인트 설정</TabsTrigger>
            </TabsList>
            <TabsContent value="adjust">
               <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount_adjust" className="text-right">
                    조정값
                  </Label>
                  <Input
                    id="amount_adjust"
                    type="number"
                    placeholder="예: 10 (추가), -5 (차감)"
                    className="col-span-3"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    disabled={isProcessing}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="reason_adjust" className="text-right">
                    조정 사유
                  </Label>
                  <Input
                    id="reason_adjust"
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
            </TabsContent>
            <TabsContent value="set">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount_set" className="text-right">
                    설정값
                  </Label>
                  <Input
                    id="amount_set"
                    type="number"
                    placeholder="새로운 포인트 값"
                    className="col-span-3"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    disabled={isProcessing}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="reason_set" className="text-right">
                    설정 사유
                  </Label>
                  <Input
                    id="reason_set"
                    placeholder="예: 데이터 이관, 초기화 등"
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
                <Button type="button" onClick={handleSetLak} disabled={isProcessing}>
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  설정하기
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* Bulk Lak Adjust/Set Dialog */}
      <Dialog open={isBulkAdjustDialogOpen} onOpenChange={setIsBulkAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>선택 사용자 일괄 포인트 관리 ({selectedUsers.length}명)</DialogTitle>
            <DialogDescription>
              선택된 모든 사용자의 포인트를 증감시키거나 특정 값으로 설정합니다.
            </DialogDescription>
          </DialogHeader>
           <Tabs defaultValue="adjust" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="adjust">포인트 증감</TabsTrigger>
              <TabsTrigger value="set">포인트 설정</TabsTrigger>
            </TabsList>
            <TabsContent value="adjust">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="bulk-amount-adjust" className="text-right">
                    조정값
                  </Label>
                  <Input
                    id="bulk-amount-adjust"
                    type="number"
                    placeholder="예: 10 (추가), -5 (차감)"
                    className="col-span-3"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    disabled={isProcessing}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="bulk-reason-adjust" className="text-right">
                    조정 사유
                  </Label>
                  <Input
                    id="bulk-reason-adjust"
                    placeholder="예: 단체 이벤트 보상"
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
                <Button type="button" onClick={handleBulkAdjustLak} disabled={isProcessing || selectedUsers.length === 0}>
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  일괄 조정하기
                </Button>
              </DialogFooter>
            </TabsContent>
            <TabsContent value="set">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="bulk-amount-set" className="text-right">
                    설정값
                  </Label>
                  <Input
                    id="bulk-amount-set"
                    type="number"
                    placeholder="새로운 포인트 값"
                    className="col-span-3"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    disabled={isProcessing}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="bulk-reason-set" className="text-right">
                    설정 사유
                  </Label>
                  <Input
                    id="bulk-reason-set"
                    placeholder="예: 시즌 초기화"
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
                <Button type="button" onClick={handleBulkSetLak} disabled={isProcessing || selectedUsers.length === 0}>
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  일괄 설정하기
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* Role Change Dialog */}
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
                  <SelectItem value="council_booth">학생회(부스)</SelectItem>
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
      
      {/* Leaderboard Reward Dialog */}
      <Dialog open={isRewardDialogOpen} onOpenChange={setIsRewardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>리더보드 랭커 보상 지급</DialogTitle>
            <DialogDescription>
              선택한 게임의 리더보드 상위 5명에게 차등으로 포인트를 지급합니다. 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="leaderboard-select" className="text-right">
                대상 게임
              </Label>
              <Select onValueChange={setSelectedLeaderboard} value={selectedLeaderboard} disabled={isRewarding}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="게임 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="word-chain">끝말잇기</SelectItem>
                  <SelectItem value="minesweeper-easy">지뢰찾기 (초급)</SelectItem>
                  <SelectItem value="breakout">벽돌깨기</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <ul className="text-sm text-muted-foreground list-disc pl-5 ml-auto mr-auto">
                <li>1등: 10 포인트</li>
                <li>2등: 7 포인트</li>
                <li>3등: 5 포인트</li>
                <li>4등: 3 포인트</li>
                <li>5등: 1 포인트</li>
            </ul>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isRewarding}>취소</Button>
            </DialogClose>
            <Button onClick={handleRewardLeaderboard} disabled={isRewarding || !selectedLeaderboard}>
              {isRewarding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              보상 지급
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>정말로 이 사용자를 삭제하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>
                  이 작업은 <strong className="text-destructive">되돌릴 수 없습니다.</strong> 
                  사용자의 Firestore 데이터(포인트, 프로필, 거래내역 등)가 영구적으로 삭제됩니다.
                  <br/><br/>
                  <strong className="text-destructive uppercase">중요:</strong> 이 작업은 데이터베이스 기록만 삭제합니다. 
                  사용자를 완전히 제거하려면, 작업 완료 후 Firebase 콘솔의 'Authentication' 탭에서 해당 사용자의 이메일을 수동으로 삭제해야 합니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isProcessing}>취소</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={handleDeleteUser}
                  disabled={isProcessing}
                >
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  네, 사용자를 삭제합니다
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
