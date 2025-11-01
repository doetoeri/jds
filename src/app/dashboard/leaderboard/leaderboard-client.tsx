
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, getCountFromServer } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Crown, Trophy, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LeaderboardUser {
  id: string;
  studentId: string;
  displayName: string;
  score: number;
  avatarGradient?: string;
}

interface ClassRanking {
    classId: string; // e.g. "1-01", "2-03"
    totalPoints: number;
    memberCount: number;
}


const LeaderboardTab = ({ leaderboardId, order, unit }: { leaderboardId: string, order: 'desc' | 'asc', unit: string }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const usersRef = collection(db, leaderboardId);
        const q = query(usersRef, orderBy('score', order), limit(20));
        const querySnapshot = await getDocs(q);
        
        const userList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          score: doc.data().score,
          displayName: doc.data().displayName,
          studentId: doc.data().studentId,
          avatarGradient: doc.data().avatarGradient || 'orange',
        } as LeaderboardUser));

        setLeaderboard(userList);
      } catch (error) {
        console.error(`Error fetching ${leaderboardId} leaderboard: `, error);
        toast({ title: "오류", description: "리더보드를 불러오는 데 실패했습니다.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, [leaderboardId, order, toast]);

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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px] text-center">순위</TableHead>
          <TableHead>사용자</TableHead>
          <TableHead className="text-right">점수</TableHead>
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
              <TableCell className="text-right font-bold">{user.score?.toLocaleString() ?? 0} {unit}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};

const ClassLeaderboardTab = () => {
  const [classRankings, setClassRankings] = useState<ClassRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchClassRankings = async () => {
      setIsLoading(true);
      try {
        const q = query(collection(db, 'class_rankings'), orderBy('totalPoints', 'desc'));
        const snapshot = await getDocs(q);
        const rankings = snapshot.docs.map(doc => doc.data() as ClassRanking);
        setClassRankings(rankings);
      } catch (error) {
        console.error("Error fetching class rankings: ", error);
        toast({ title: "오류", description: "학급 랭킹을 불러오는 데 실패했습니다.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchClassRankings();
  }, [toast]);
  
  const getRankColor = (rank: number) => {
    if (rank === 0) return 'text-amber-400';
    if (rank === 1) return 'text-slate-400';
    if (rank === 2) return 'text-amber-600';
    return 'text-muted-foreground';
  };

  return (
     <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px] text-center">순위</TableHead>
          <TableHead>학급</TableHead>
          <TableHead className="text-center">참여인원</TableHead>
          <TableHead className="text-right">총 포인트</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: 10 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
              <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
            </TableRow>
          ))
        ) : classRankings.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center h-24">
              학급 랭킹 정보가 없습니다.
            </TableCell>
          </TableRow>
        ) : (
          classRankings.map((c, index) => (
            <TableRow key={c.classId}>
               <TableCell className={cn("text-center font-bold text-lg", getRankColor(index))}>
                {index < 3 ? <Crown className="h-6 w-6 mx-auto fill-current"/> : index + 1}
              </TableCell>
              <TableCell>
                <div className="font-bold text-base">{c.classId.replace('-', '학년 ')}반</div>
              </TableCell>
              <TableCell className="text-center text-muted-foreground">
                  {c.memberCount}명
              </TableCell>
              <TableCell className="text-right font-bold">{c.totalPoints.toLocaleString()} 점</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}


export default function LeaderboardPageClient() {
  return (
    <div>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
          <Trophy className="mr-2 h-6 w-6" />
          리더보드
        </h1>
        <p className="text-muted-foreground">
          각 게임별 상위 20명의 순위를 확인하세요. 관리자는 주기적으로 리더보드 순위를 바탕으로 보상을 지급할 수 있습니다.
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="class-ranking">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
               <TabsTrigger value="class-ranking" className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"><Users className="mr-2 h-4 w-4" />학급 랭킹</TabsTrigger>
               <TabsTrigger value="minesweeper" className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">지뢰찾기</TabsTrigger>
               <TabsTrigger value="breakout" className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">벽돌깨기</TabsTrigger>
               <TabsTrigger value="tetris" className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">테트리스</TabsTrigger>
            </TabsList>
             <TabsContent value="class-ranking" className="p-0">
                <ClassLeaderboardTab />
            </TabsContent>
             <TabsContent value="minesweeper" className="p-0">
                <LeaderboardTab leaderboardId="leaderboards/minesweeper-easy/users" order="asc" unit="초" />
            </TabsContent>
             <TabsContent value="breakout" className="p-0">
                <LeaderboardTab leaderboardId="leaderboards/breakout/users" order="desc" unit="점" />
            </TabsContent>
             <TabsContent value="tetris" className="p-0">
                <LeaderboardTab leaderboardId="leaderboards/tetris/users" order="desc" unit="점" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}


    
