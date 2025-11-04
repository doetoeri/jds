

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
import { db, adjustUserLak, updateUserRole, deleteUser, bulkAdjustUserLak, setUserLak, bulkSetUserLak, awardLeaderboardRewards, updateUserMemo, restrictUser, unrestrictUser, sendWarningMessage, resetUserPassword } from '@/lib/firebase';
import { collection, onSnapshot, query, Timestamp, collectionGroup, getDocs, orderBy, limit } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Coins, Loader2, UserCog, Trash2, Filter, ArrowUpDown, Trophy, Pencil, Ban, CircleOff, AlertTriangle, KeyRound } from 'lucide-react';
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
import type { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';


interface User {
  id: string;
  studentId?: string;
  name?: string;
  displayName?: string;
  email: string;
  lak: number;
  role: 'student' | 'teacher' | 'admin' | 'pending_teacher' | 'council' | 'kiosk';
  memo?: string;
  createdAt?: Timestamp;
  restrictedUntil?: Timestamp;
  restrictionReason?: string;
}

type SortKey = 'lak' | 'createdAt' | 'studentId';
type SortDirection = 'asc' | 'desc';

interface DailyEarning {
    id: string; // YYYY-MM-DD
    totalEarned: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [isBulkAdjustDialogOpen, setIsBulkAdjustDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMemoDialogOpen, setIsMemoDialogOpen] = useState(false);
  const [isRestrictDialogOpen, setIsRestrictDialogOpen] = useState(false);
  const [isWarningDialogOpen, setIsWarningDialogOpen] = useState(false);
  const [isDailyEarningsDialogOpen, setIsDailyEarningsDialogOpen] = useState(false);
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false);
  const [dailyEarnings, setDailyEarnings] = useState<DailyEarning[]>([]);

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);


  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [newRole, setNewRole] = useState<User['role'] | ''>('');
  const [memo, setMemo] = useState('');
  const [restrictionReason, setRestrictionReason] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [restrictionDate, setRestrictionDate] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 7)
  });
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
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
      if (!filter) {
        return true;
      }
      const lowercasedFilter = filter.toLowerCase();
      // Search through all relevant fields
      return (
        user.studentId?.includes(lowercasedFilter) ||
        user.name?.toLowerCase().includes(lowercasedFilter) ||
        user.displayName?.toLowerCase().includes(lowercasedFilter) ||
        user.email.toLowerCase().includes(lowercasedFilter) ||
        user.role.toLowerCase().includes(lowercasedFilter) ||
        user.memo?.toLowerCase().includes(lowercasedFilter)
      );
    });

    return filtered.sort((a, b) => {
        const aValue = a[sortKey] ?? (sortKey === 'createdAt' ? new Timestamp(0, 0) : 0);
        const bValue = b[sortKey] ?? (sortKey === 'createdAt' ? new Timestamp(0, 0) : 0);

        let comparison = 0;

        if(aValue instanceof Timestamp && bValue instanceof Timestamp) {
            comparison = aValue.toMillis() - bValue.toMillis();
        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
            comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
            comparison = aValue - bValue;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [users, filter, sortKey, sortDirection]);

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

  const openMemoDialog = (user: User) => {
    setSelectedUser(user);
    setMemo(user.memo || '');
    setIsMemoDialogOpen(true);
  };

  const openRestrictDialog = (user: User) => {
    setSelectedUser(user);
    setRestrictionReason('');
    setRestrictionDate({ from: new Date(), to: addDays(new Date(), 7)});
    setIsRestrictDialogOpen(true);
  };

  const openWarningDialog = (user: User) => {
    setSelectedUser(user);
    setWarningMessage('');
    setIsWarningDialogOpen(true);
  };

  const openPasswordResetDialog = (user: User) => {
    setSelectedUser(user);
    setIsPasswordResetDialogOpen(true);
  };


  const openDailyEarningsDialog = async (user: User) => {
    setSelectedUser(user);
    setIsDailyEarningsDialogOpen(true);
    const earningsCollectionRef = collection(db, `users/${user.id}/daily_earnings`);
    const q = query(earningsCollectionRef, orderBy('id', 'desc'), limit(30));
    const snapshot = await getDocs(q);
    const earningsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyEarning));
    setDailyEarnings(earningsData);
  }
  
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

  const handleUpdateMemo = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    try {
        await updateUserMemo(selectedUser.id, memo);
        toast({ title: '성공', description: '사용자 비고를 저장했습니다.'});
        setIsMemoDialogOpen(false);
    } catch (e: any) {
        toast({ title: '오류', description: e.message, variant: 'destructive'});
    } finally {
        setIsProcessing(false);
    }
  };
  
  const handleRestrictUser = async () => {
    if (!selectedUser || !restrictionDate?.to || !restrictionReason) {
      toast({ title: "입력 오류", description: "제한 기간과 사유를 모두 입력해주세요.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      await restrictUser(selectedUser.id, restrictionDate.to, restrictionReason);
      toast({ title: "성공", description: `${renderIdentifier(selectedUser)}님의 계정을 제한했습니다.` });
      setIsRestrictDialogOpen(false);
    } catch (error: any) {
      toast({ title: "오류", description: error.message || "계정 제한 중 오류가 발생했습니다.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnrestrictUser = async (userId: string) => {
    setIsProcessing(true);
    try {
        await unrestrictUser(userId);
        toast({ title: "성공", description: "계정 제한을 해제했습니다." });
    } catch (e: any) {
         toast({ title: "오류", description: e.message, variant: "destructive" });
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

  const handleSendWarning = async () => {
    if (!selectedUser || !warningMessage) {
      toast({ title: "입력 오류", description: "경고 메시지를 입력해주세요.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      await sendWarningMessage(selectedUser.id, warningMessage);
      toast({ title: "성공", description: `${renderIdentifier(selectedUser)}님에게 경고 메시지를 보냈습니다.` });
      setIsWarningDialogOpen(false);
    } catch (error: any) {
      toast({ title: "오류", description: error.message || "경고 메시지 전송 중 오류가 발생했습니다.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    try {
      await resetUserPassword(selectedUser.id);
      toast({
        title: "전송 완료",
        description: `${renderIdentifier(selectedUser)}님의 이메일로 비밀번호 재설정 링크를 보냈습니다.`,
      });
      setIsPasswordResetDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "오류",
        description:
          error.message || "비밀번호 재설정 이메일 전송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };


  const renderIdentifier = (user: User) => {
    if (user.role === 'admin') return '관리자';
    if (user.role === 'council' || user.role === 'kiosk') return user.name || user.email;
    if (user.role === 'student') return user.studentId || user.displayName;
    if (user.role === 'teacher') return user.name;
    return 'N/A';
  }

  const roleDisplayNames: Record<User['role'], string> = {
    admin: '관리자',
    council: '학생회',
    teacher: '교직원',
    student: '학생',
    pending_teacher: '승인 대기',
    kiosk: '키오스크'
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
                <Label htmlFor="grade-filter" className="shrink-0">검색</Label>
                <Input 
                    id="grade-filter"
                    placeholder="학번, 이름, 이메일, 비고 등으로 검색..." 
                    className="w-full"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>
             <Button variant="outline" onClick={() => { setFilter(''); }}>필터 초기화</Button>
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
                <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('studentId')}>
                        학번/성함
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                </TableHead>
                <TableHead>UID</TableHead>
                <TableHead>비고</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>역할</TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('createdAt')}>
                        가입일
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                </TableHead>
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
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
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
                    <TableCell className="font-medium">
                        <span 
                            className="cursor-pointer hover:underline"
                            onClick={() => openDailyEarningsDialog(user)}
                        >
                            {renderIdentifier(user)}
                        </span>
                        {user.restrictedUntil && user.restrictedUntil.toMillis() > Date.now() && (
                            <Badge variant="destructive" className="ml-2">제한됨</Badge>
                        )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{user.id}</TableCell>
                    <TableCell className="text-muted-foreground">{user.memo || '-'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell><Badge variant="secondary">{roleDisplayNames[user.role] || user.role}</Badge></TableCell>
                    <TableCell>{user.createdAt ? user.createdAt.toDate().toLocaleDateString() : 'N/A'}</TableCell>
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
                       <Button variant="outline" size="sm" onClick={() => openMemoDialog(user)}>
                         <Pencil className="mr-1 h-3.5 w-3.5"/>
                         비고
                       </Button>
                      {user.restrictedUntil && user.restrictedUntil.toMillis() > Date.now() ? (
                        <Button variant="secondary" size="sm" onClick={() => handleUnrestrictUser(user.id)} disabled={isProcessing}>
                          <CircleOff className="mr-1 h-3.5 w-3.5" /> 제한 해제
                        </Button>
                      ) : (
                        <Button variant="destructive" size="sm" onClick={() => openRestrictDialog(user)} disabled={user.role === 'admin'}>
                          <Ban className="mr-1 h-3.5 w-3.5" /> 계정 제한
                        </Button>
                      )}
                      <Button variant="destructive" size="sm" onClick={() => openWarningDialog(user)} disabled={user.role === 'admin'}>
                        <AlertTriangle className="mr-1 h-3.5 w-3.5" /> 경고
                      </Button>
                       <Button variant="secondary" size="sm" onClick={() => openPasswordResetDialog(user)}>
                        <KeyRound className="mr-1 h-3.5 w-3.5" /> 비밀번호
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

      <Dialog open={isDailyEarningsDialogOpen} onOpenChange={setIsDailyEarningsDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{selectedUser?.displayName || selectedUser?.studentId} 님의 일일 획득량</DialogTitle>
                <DialogDescription>최근 30일간의 포인트 획득 기록입니다.</DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>날짜</TableHead>
                            <TableHead className="text-right">획득량</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {dailyEarnings.length > 0 ? dailyEarnings.map(e => (
                            <TableRow key={e.id}>
                                <TableCell>{e.id}</TableCell>
                                <TableCell className="text-right">{e.totalEarned.toLocaleString()} P</TableCell>
                            </TableRow>
                        )) : <TableRow><TableCell colSpan={2} className="text-center">기록이 없습니다.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>
        </DialogContent>
      </Dialog>

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
                  <SelectItem value="kiosk">키오스크</SelectItem>
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

      {/* Memo Dialog */}
      <Dialog open={isMemoDialogOpen} onOpenChange={setIsMemoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>비고 편집: {selectedUser && renderIdentifier(selectedUser)}</DialogTitle>
            <DialogDescription>
                이 사용자에게만 보이는 비고(별명)를 추가하거나 수정합니다.
            </DialogDescription>
          </DialogHeader>
           <div className="grid gap-4 py-4">
                <Label htmlFor="memo">비고 내용</Label>
                <Input
                    id="memo"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="예: 1학년 1반 반장"
                    disabled={isProcessing}
                />
            </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isProcessing}>취소</Button>
            </DialogClose>
            <Button type="button" onClick={handleUpdateMemo} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              저장하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restriction Dialog */}
      <Dialog open={isRestrictDialogOpen} onOpenChange={setIsRestrictDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>계정 이용 제한: {selectedUser && renderIdentifier(selectedUser)}</DialogTitle>
                <DialogDescription>
                    선택한 사용자의 서비스 이용을 지정된 기간동안 제한합니다.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label>제한 기간</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className="w-full justify-start text-left font-normal"
                            >
                                {restrictionDate?.from ? (
                                    restrictionDate.to ? (
                                        <>
                                            {format(restrictionDate.from, "yyyy-MM-dd")} - {format(restrictionDate.to, "yyyy-MM-dd")}
                                        </>
                                    ) : (
                                        format(restrictionDate.from, "yyyy-MM-dd")
                                    )
                                ) : (
                                    <span>기간 선택</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={restrictionDate?.from}
                                selected={restrictionDate}
                                onSelect={setRestrictionDate}
                                numberOfMonths={2}
                                disabled={(date) => date < new Date()}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="restriction-reason">제한 사유</Label>
                    <Input id="restriction-reason" value={restrictionReason} onChange={e => setRestrictionReason(e.target.value)} placeholder="예: 비속어 사용" />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">취소</Button></DialogClose>
                <Button variant="destructive" onClick={handleRestrictUser} disabled={isProcessing || !restrictionDate?.to || !restrictionReason}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 제한 실행
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Warning Dialog */}
      <Dialog open={isWarningDialogOpen} onOpenChange={setIsWarningDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>경고 메시지 전송: {selectedUser && renderIdentifier(selectedUser)}</DialogTitle>
            <DialogDescription>
              사용자가 다음 로그인 시 확인해야 하는 일회성 경고 메시지를 보냅니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="warning-message">경고 내용</Label>
            <Textarea
              id="warning-message"
              value={warningMessage}
              onChange={(e) => setWarningMessage(e.target.value)}
              placeholder="예: 커뮤니티에서 부적절한 언어 사용이 확인되었습니다. 재발 시 계정이 제한될 수 있습니다."
              disabled={isProcessing}
              rows={4}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isProcessing}>취소</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleSendWarning} disabled={isProcessing || !warningMessage}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 경고 보내기
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
                  <SelectItem value="minesweeper-easy">지뢰찾기 (초급)</SelectItem>
                  <SelectItem value="breakout">벽돌깨기</SelectItem>
                  <SelectItem value="tetris">테트리스</SelectItem>
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

      {/* Password Reset Dialog */}
      <AlertDialog open={isPasswordResetDialogOpen} onOpenChange={setIsPasswordResetDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>비밀번호를 초기화하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                      {selectedUser?.displayName} ({selectedUser?.studentId || selectedUser?.email}) 님의 이메일로 비밀번호 재설정 링크를 보냅니다.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel disabled={isProcessing} onClick={() => setIsPasswordResetDialogOpen(false)}>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePasswordReset} disabled={isProcessing}>
                      {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                      재설정 링크 보내기
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

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
