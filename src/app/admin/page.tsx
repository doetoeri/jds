
'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Users, QrCode, Coins, AlertTriangle, Loader2, Trash2, ListPlus, PlusCircle, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { resetAllData, db, addBoothReason, deleteBoothReason, resetWordChainGame } from '@/lib/firebase';
import { CommunicationChannel } from '@/components/communication-channel';
import { AnnouncementPoster } from '@/components/announcement-poster';
import { collection, onSnapshot, query, where, getDocs, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Stats {
    totalUsers: number;
    totalCodes: number;
    totalLakRedeemed: number;
}

interface BoothReason {
    id: string;
    reason: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [isResettingGame, setIsResettingGame] = useState(false);
  const [boothReasons, setBoothReasons] = useState<BoothReason[]>([]);
  const [newReason, setNewReason] = useState('');
  const [isAddingReason, setIsAddingReason] = useState(false);
  
  const { toast } = useToast();
  
  useEffect(() => {
    const usersQuery = query(collection(db, 'users'), where('role', '!=', 'pending_teacher'));
    const codesQuery = query(collection(db, 'codes'));

    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
        setStats(prev => ({ ...prev!, totalUsers: snapshot.size }));
    });

    const unsubCodes = onSnapshot(codesQuery, (snapshot) => {
        let redeemed = 0;
        snapshot.forEach(doc => {
            const code = doc.data();
            switch (code.type) {
                case '종달코드':
                case '온라인 특수코드':
                    if (code.used) redeemed += code.value;
                    break;
                case '히든코드':
                    if (code.used && Array.isArray(code.usedBy)) { 
                        redeemed += (code.usedBy.length * code.value);
                    }
                    break;
                case '메이트코드':
                    if(Array.isArray(code.participants)) {
                        redeemed += (code.participants.length - 1) * code.value * 2;
                    }
                    break;
                case '선착순코드':
                     if (Array.isArray(code.usedBy)) {
                        redeemed += code.usedBy.length * code.value;
                    }
                    break;
            }
        });
        setStats(prev => ({ 
            ...prev!, 
            totalCodes: snapshot.size,
            totalLakRedeemed: redeemed
        }));
    });
    
    const reasonsRef = doc(db, 'system_settings', 'booth_reasons');
    const unsubReasons = onSnapshot(reasonsRef, (doc) => {
        if (doc.exists()) {
            const reasonsData = doc.data().reasons || [];
            setBoothReasons(reasonsData.map((reason: string, index: number) => ({id: `${index}-${reason}`, reason})));
        }
    });

    Promise.all([getDocs(usersQuery), getDocs(codesQuery)]).then(() => {
        setIsLoading(false);
    }).catch(e => {
        console.error("Error fetching initial stats:", e);
        setIsLoading(false);
    });

    return () => {
        unsubUsers();
        unsubCodes();
        unsubReasons();
    };
}, []);


  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetAllData();
      toast({
        title: '초기화 완료',
        description: '모든 활동 데이터가 성공적으로 초기화되었습니다.',
      });
      window.location.reload();
    } catch (error: any) {
      toast({
        title: '초기화 오류',
        description: error.message || '데이터 초기화 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleGameReset = async () => {
    setIsResettingGame(true);
    try {
      await resetWordChainGame();
      toast({
        title: '게임 초기화 완료',
        description: '끝말잇기 게임 기록이 모두 삭제되었습니다.',
      });
    } catch (error: any) {
      toast({
        title: '초기화 오류',
        description: error.message || '게임 초기화 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsResettingGame(false);
    }
  };
  
  const handleAddReason = async () => {
    if (!newReason.trim()) return;
    setIsAddingReason(true);
    try {
        await addBoothReason(newReason);
        toast({ title: '성공', description: '지급 사유가 추가되었습니다.'});
        setNewReason('');
    } catch (error: any) {
        toast({ title: '오류', description: error.message, variant: 'destructive'});
    } finally {
        setIsAddingReason(false);
    }
  };
  
  const handleDeleteReason = async (reasonToDelete: string) => {
    try {
        await deleteBoothReason(reasonToDelete);
        toast({ title: '성공', description: '지급 사유가 삭제되었습니다.'});
    } catch (error: any) {
        toast({ title: '오류', description: error.message, variant: 'destructive'});
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
            <h1 className="text-3xl font-bold tracking-tight font-headline">관리자 대시보드</h1>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">총 사용자</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{stats?.totalUsers.toLocaleString() ?? 0} 명</div>}
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">총 코드 수</CardTitle>
                    <QrCode className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{stats?.totalCodes.toLocaleString() ?? 0} 개</div>}
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">코드로 지급된 포인트</CardTitle>
                    <Coins className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                     {isLoading ? <Skeleton className="h-8 w-28" /> : <div className="text-2xl font-bold">{stats?.totalLakRedeemed.toLocaleString() ?? 0} 포인트</div>}
                </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ListPlus/>부스 지급 사유 관리</CardTitle>
                    <CardDescription>학생회(부스) 계정에서 사용할 포인트 지급 사유를 관리합니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input 
                            placeholder="새 사유 입력 (예: 이벤트 참여)"
                            value={newReason}
                            onChange={(e) => setNewReason(e.target.value)}
                            />
                        <Button onClick={handleAddReason} disabled={isAddingReason || !newReason.trim()}>
                            {isAddingReason ? <Loader2 className="h-4 w-4 animate-spin"/> : <PlusCircle className="h-4 w-4"/>}
                            <span className="ml-2">추가</span>
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {boothReasons.length > 0 ? boothReasons.map(r => (
                             <Badge key={r.id} variant="secondary" className="text-base gap-2">
                                 {r.reason}
                                 <button onClick={() => handleDeleteReason(r.reason)} className="rounded-full hover:bg-destructive/20 p-0.5">
                                    <Trash2 className="h-3 w-3 text-destructive"/>
                                 </button>
                             </Badge>
                        )) : (
                            <p className="text-sm text-muted-foreground">추가된 사유가 없습니다.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <AnnouncementPoster />

            <Card className="border-destructive/50">
                <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle />
                    위험 구역
                </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-2">
                      아래 버튼은 시스템의 모든 활동 데이터를 영구적으로 삭제하고 초기화합니다.
                    </p>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isResetting}>
                            {isResetting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            전체 활동 데이터 초기화
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>정말로 초기화하시겠습니까?</AlertDialogTitle>
                            <AlertDialogDescription>
                            이 작업은 모든 사용자의 포인트, 거래 내역, 코드, 편지, 구매 기록을 영구적으로 삭제합니다. 사용자 계정 자체는 삭제되지 않습니다. 이 작업은 되돌릴 수 없습니다.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={handleReset}
                            disabled={isResetting}
                            >
                            {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            네, 모든 활동 내역을 초기화합니다.
                            </AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-2">
                      아래 버튼은 끝말잇기 게임의 모든 기록을 삭제하고 초기화합니다.
                    </p>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isResettingGame}>
                            {isResettingGame ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Gamepad2 className="mr-2 h-4 w-4" />
                            )}
                            끝말잇기 게임 초기화
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>정말로 초기화하시겠습니까?</AlertDialogTitle>
                            <AlertDialogDescription>
                            이 작업은 끝말잇기 게임의 모든 단어 기록을 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={handleGameReset}
                            disabled={isResettingGame}
                            >
                            {isResettingGame && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            네, 게임을 초기화합니다.
                            </AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1">
            <CommunicationChannel />
        </div>
    </div>
  );
}
