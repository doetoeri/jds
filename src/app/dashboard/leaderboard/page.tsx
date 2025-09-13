
'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Crown, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardUser {
  id: string;
  studentId: string;
  displayName: string;
  lak: number;
  avatarGradient: string;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef,
          where('role', '==', 'student'),
          orderBy('lak', 'desc'),
          limit(100)
        );
        const querySnapshot = await getDocs(q);
        const userList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as LeaderboardUser));
        setLeaderboard(userList);
      } catch (error) {
        console.error("Error fetching leaderboard: ", error);
        toast({ title: "오류", description: "리더보드를 불러오는 데 실패했습니다.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, [toast]);

  const getRankColor = (rank: number) => {
    if (rank === 0) return 'text-amber-400';
    if (rank === 1) return 'text-slate-400';
    if (rank === 2) return 'text-amber-600';
    return 'text-muted-foreground';
  };
  
  const getInitials = (user: LeaderboardUser) => {
    return user.displayName?.substring(0, 1).toUpperCase() || '?';
  };

  return (
    <div>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
            <Trophy className="mr-2 h-6 w-6" />
            리더보드
        </h1>
        <p className="text-muted-foreground">
          포인트 순위 상위 100명을 확인하세요.
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px] text-center">순위</TableHead>
                <TableHead>사용자</TableHead>
                <TableHead className="text-right">보유 포인트</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full"/>
                            <div className="space-y-1">
                                <Skeleton className="h-4 w-24"/>
                                <Skeleton className="h-3 w-16"/>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : leaderboard.length === 0 ? (
                 <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">
                      리더보드 정보가 없습니다.
                    </TableCell>
                  </TableRow>
              ) : (
                leaderboard.map((user, index) => (
                  <TableRow key={user.id}>
                    <TableCell className={cn("text-center font-bold text-lg", getRankColor(index))}>
                        {index < 3 ? <Crown className="h-6 w-6 mx-auto fill-current"/> : index + 1}
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Avatar className={cn('h-10 w-10', `gradient-${user.avatarGradient}`)}>
                                <AvatarFallback className="text-white bg-transparent font-bold">
                                    {getInitials(user)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="font-medium">{user.displayName}</div>
                                <div className="text-sm text-muted-foreground">{user.studentId}</div>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell className="text-right font-bold">{user.lak?.toLocaleString() ?? 0} P</TableCell>
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
