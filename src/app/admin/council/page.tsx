
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
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Filter, Users } from 'lucide-react';

interface CouncilUser {
  id: string;
  name?: string;
  displayName?: string;
  email: string;
  role: 'council' | 'council_booth';
  memo?: string; // 직책 코드 (e.g., 'A계1')
  lastLogin?: Timestamp;
}

const roleDisplayNames = {
  council: '학생회(일반)',
  council_booth: '특수 계정(부스)',
};

export default function AdminCouncilPage() {
  const [users, setUsers] = useState<CouncilUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where('role', 'in', ['council', 'council_booth']));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userList = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as CouncilUser))
        .sort((a, b) => (a.memo || '').localeCompare(b.memo || ''));
      
      setUsers(userList);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching council users:", error);
      toast({
        title: '오류',
        description: '학생회 사용자 목록을 불러오는 데 실패했습니다.',
        variant: 'destructive',
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  const filteredUsers = useMemo(() => {
    if (!filter) return users;
    return users.filter(user => 
      user.name?.toLowerCase().includes(filter.toLowerCase()) ||
      user.displayName?.toLowerCase().includes(filter.toLowerCase()) ||
      user.memo?.toLowerCase().includes(filter.toLowerCase())
    );
  }, [users, filter]);

  const formatTimestamp = (ts: Timestamp | undefined) => {
    if (!ts || typeof ts.toDate !== 'function') return <Badge variant="outline">활동 기록 없음</Badge>;
    const date = ts.toDate();
    const now = new Date();
    const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) {
      return <Badge variant="default" className="bg-green-500">온라인</Badge>;
    }
    if (diffSeconds < 3600) {
      return <Badge variant="secondary">{Math.floor(diffSeconds / 60)}분 전</Badge>;
    }
     if (diffSeconds < 86400) {
      return <Badge variant="secondary">{Math.floor(diffSeconds / 3600)}시간 전</Badge>;
    }
    return <Badge variant="outline">{date.toLocaleDateString()}</Badge>;
  };

  return (
    <div>
       <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
            <Users className="mr-2 h-6 w-6" />
            학생회 관리
        </h1>
        <p className="text-muted-foreground">
          학생회 및 특수 계정 목록과 활동 상태를 확인합니다.
        </p>
      </div>

       <Card className="mb-4">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
                <Filter className="h-4 w-4 text-muted-foreground"/>
                <Label htmlFor="filter-input" className="shrink-0">필터</Label>
                <Input 
                    id="filter-input"
                    placeholder="이름 또는 직책 코드로 검색..." 
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
                <TableHead>직책 코드</TableHead>
                <TableHead>이름</TableHead>
                <TableHead>역할</TableHead>
                <TableHead className="text-right">마지막 로그인</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-6 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono font-bold text-primary">{user.memo || '-'}</TableCell>
                    <TableCell className="font-medium">{user.name || user.displayName}</TableCell>
                    <TableCell><Badge variant="secondary">{roleDisplayNames[user.role]}</Badge></TableCell>
                    <TableCell className="text-right">{formatTimestamp(user.lastLogin)}</TableCell>
                  </TableRow>
                ))
              )}
               {filteredUsers.length === 0 && !isLoading && (
                 <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        {filter ? "검색 결과가 없습니다." : "등록된 학생회 계정이 없습니다."}
                    </TableCell>
                 </TableRow>
               )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
