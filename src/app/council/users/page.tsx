

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
import { db, resetUserPassword } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { KeyRound, Loader2, Filter } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface User {
  id: string;
  studentId?: string;
  name?: string;
  displayName?: string;
  email: string;
  lak: number;
  role: 'student';
}

export default function CouncilUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const [filter, setFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where('role', '==', 'student'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      userList.sort((a, b) => (a.studentId || '').localeCompare(b.studentId || ''));
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
  
  const filteredUsers = useMemo(() => {
    if (!filter) return users;
    return users.filter(user => 
      user.studentId?.includes(filter) || 
      user.displayName?.toLowerCase().includes(filter.toLowerCase())
    );
  }, [users, filter]);

  const handlePasswordReset = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    try {
        await resetUserPassword(selectedUser.id);
        toast({
            title: '성공',
            description: `${selectedUser.displayName} 학생의 비밀번호가 '123456'으로 초기화되었습니다.`
        });
        setSelectedUser(null);
    } catch(e: any) {
        toast({ title: '오류', description: e.message, variant: 'destructive'});
    } finally {
        setIsProcessing(false);
    }
  }


  return (
    <motion.div
        initial={{ opacity: 0, filter: 'blur(16px)', y: 30, scale: 0.95 }}
        animate={{ opacity: 1, filter: 'blur(0px)', y: 0, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.25, 1, 0.5, 1] }}
    >
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline">학생 사용자 관리</h1>
        <p className="text-muted-foreground">시스템에 등록된 모든 학생 목록입니다.</p>
      </div>

       <Card className="mb-4">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
                <Filter className="h-4 w-4 text-muted-foreground"/>
                <Label htmlFor="filter-input" className="shrink-0">검색</Label>
                <Input 
                    id="filter-input"
                    placeholder="학번 또는 닉네임으로 검색..." 
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
                <TableHead>학번</TableHead>
                <TableHead>닉네임</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead className="text-right">보유 포인트</TableHead>
                <TableHead className="text-right">작업</TableHead>
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
                     <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.studentId}</TableCell>
                    <TableCell>{user.displayName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="text-right">{user.lak?.toLocaleString() ?? 0} 포인트</TableCell>
                    <TableCell className="text-right">
                       <AlertDialog open={selectedUser?.id === user.id} onOpenChange={(isOpen) => !isOpen && setSelectedUser(null)}>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedUser(user)}>
                                <KeyRound className="mr-2 h-4 w-4"/>
                                비밀번호 초기화
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                             <AlertDialogHeader>
                                <AlertDialogTitle>비밀번호를 초기화하시겠습니까?</AlertDialogTitle>
                                <AlertDialogDescription>
                                   {user.displayName} ({user.studentId}) 학생의 비밀번호를 '123456'으로 초기화합니다. 이 작업은 되돌릴 수 없습니다.
                                </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                                <AlertDialogCancel disabled={isProcessing}>취소</AlertDialogCancel>
                                <AlertDialogAction onClick={handlePasswordReset} disabled={isProcessing}>
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                    초기화
                                </AlertDialogAction>
                             </AlertDialogFooter>
                          </AlertDialogContent>
                       </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
