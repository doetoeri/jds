'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { auth, db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, doc, getCountFromServer, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Crown, Trophy, User as UserIcon, Radio, TrendingUp, Blocks, Croissant, BarChart3, FlaskConical, Swords, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthState } from 'react-firebase-hooks/auth';

interface LeaderboardUser {
  id: string;
  studentId: string;
  displayName: string;
  score: number;
  avatarGradient?: string;
}

const MyRank = ({ leaderboardId, userId, unit }: { leaderboardId: string, userId: string, unit: string }) => {
    const [myRank, setMyRank] = useState<{ rank: number; score: number } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchMyRank = async () => {
            if (!userId) {
              setIsLoading(false);
              return;
            }
            setIsLoading(true);
            try {
                const userScoreRef = doc(db, leaderboardId, userId);
                const userScoreSnap = await getDoc(userScoreRef);

                if (userScoreSnap.exists()) {
                    const userScore = userScoreSnap.data().score || 0;
                    const rankQuery = query(collection(db, leaderboardId), where("score", ">", userScore));
                    const rankSnapshot = await getCountFromServer(rankQuery);
                    const rank = rankSnapshot.data().count + 1;
                    setMyRank({ rank, score: userScore });
                } else {
                    setMyRank(null);
                }
            } catch (error) {
                console.error("Error fetching my rank", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMyRank();
    }, [leaderboardId, userId]);

    if (isLoading) {
        return <Skeleton className="h-10 w-full" />
    }

    return (
        <Card className="mt-4 bg-primary/5">
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <UserIcon className="h-5 w-5 text-primary"/>
                        <span className="font-bold">내 순위</span>
                    </div>
                    {myRank ? (
                        <div className="text-right">
                            <p className="font-bold text-lg">{myRank.rank}위</p>
                            <p className="text-sm text-muted-foreground">{myRank.score.toLocaleString()} {unit}</p>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">아직 기록이 없습니다.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};


const CumulativeLeaderboardTab = ({ leaderboardId, unit }: { leaderboardId: string, unit: string }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [user] = useAuthState(auth);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const usersRef = collection(db, leaderboardId);
        const q = query(usersRef, orderBy("score", "desc"), limit(20));
        const querySnapshot = await getDocs(q);
        
        const userList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
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
  }, [leaderboardId, toast]);

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
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px] text-center">순위</TableHead>
            <TableHead>사용자</TableHead>
            <TableHead className="text-right">누적 점수</TableHead>
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
            leaderboard.map((player, index) => (
              <TableRow key={player.id}>
                <TableCell className={cn("text-center font-bold text-lg", getRankColor(index))}>
                  {index < 3 ? <Crown className="h-6 w-6 mx-auto fill-current"/> : index + 1}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className={cn('h-10 w-10', `gradient-${player.avatarGradient}`)}>
                      <AvatarFallback className="text-white bg-transparent font-bold">
                        {getInitials(player)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{player.displayName}</div>
                      <div className="text-sm text-muted-foreground">{player.studentId}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-bold">{player.score?.toLocaleString() ?? 0} {unit}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
       {user && <div className="p-4"><MyRank leaderboardId={leaderboardId} userId={user.uid} unit={unit} /></div>}
    </>
  );
};

export default function BetaLeaderboardClient() {
  return (
    <div>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
          <FlaskConical className="mr-2 h-6 w-6 text-purple-500" />
          BETA 리더보드
        </h1>
        <p className="text-muted-foreground">
          각 게임별 총 누적 점수 순위를 확인하세요. 이 리더보드는 테스트 중이며, 언제든지 초기화될 수 있습니다.
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="breakout" className="w-full">
             <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 overflow-x-auto">
               <TabsTrigger value="breakout" className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"><Swords className="mr-2 h-4 w-4" />벽돌깨기</TabsTrigger>
               <TabsTrigger value="tetris" className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"><Brain className="mr-2 h-4 w-4" />테트리스</TabsTrigger>
               <TabsTrigger value="snake" className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"><Croissant className="mr-2 h-4 w-4" />스네이크</TabsTrigger>
               <TabsTrigger value="block-blast" className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"><Blocks className="mr-2 h-4 w-4" />블록 블라스트</TabsTrigger>
            </TabsList>
             <TabsContent value="breakout" className="p-0">
                <CumulativeLeaderboardTab leaderboardId="leaderboards/breakout/users" unit="점" />
            </TabsContent>
             <TabsContent value="tetris" className="p-0">
                <CumulativeLeaderboardTab leaderboardId="leaderboards/tetris/users" unit="점" />
            </TabsContent>
            <TabsContent value="snake" className="p-0">
                <CumulativeLeaderboardTab leaderboardId="leaderboards/snake/users" unit="점" />
            </TabsContent>
            <TabsContent value="block-blast" className="p-0">
                <CumulativeLeaderboardTab leaderboardId="leaderboards/block-blast/users" unit="점" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
