
'use client';

import { AnnouncementPoster } from "@/components/announcement-poster";
import { CommunicationChannel } from "@/components/communication-channel";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { HardHat, Eraser, Loader2, Swords, Users, Coins } from "lucide-react";
import { useState, useEffect } from "react";
import { db, setMaintenanceMode, resetWordChainGame } from "@/lib/firebase";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
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
import { Skeleton } from "@/components/ui/skeleton";


interface Stats {
    totalUsers: number;
    totalLakIssued: number;
}

export default function AdminPage() {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isTogglingMaintenance, setIsTogglingMaintenance] = useState(true);
  const [isResettingGame, setIsResettingGame] = useState(false);
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalLakIssued: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    const maintenanceRef = doc(db, 'system_settings', 'maintenance');
    const unsubMaintenance = onSnapshot(maintenanceRef, (doc) => {
        if (doc.exists()) {
            setIsMaintenanceMode(doc.data().isMaintenanceMode);
        }
        setIsTogglingMaintenance(false);
    });

    const usersQuery = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
        setStats(prev => ({ ...prev, totalUsers: snapshot.size }));
        setIsLoadingStats(false);
    });

    const codesQuery = query(collection(db, 'codes'));
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
                    if (code.isComplete && Array.isArray(code.participants)) {
                        redeemed += code.participants.length * 7;
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
            ...prev, 
            totalLakIssued: redeemed
        }));
         setIsLoadingStats(false);
    });

    return () => {
        unsubMaintenance();
        unsubUsers();
        unsubCodes();
    };
  }, []);

  const handleMaintenanceToggle = async (checked: boolean) => {
      setIsTogglingMaintenance(true);
      try {
          await setMaintenanceMode(checked);
          toast({
              title: "성공",
              description: `시스템 점검 모드가 ${checked ? '활성화' : '비활성화'}되었습니다.`
          });
      } catch (error) {
          toast({
              title: "오류",
              description: "점검 모드 변경 중 오류가 발생했습니다.",
              variant: "destructive"
          });
      } finally {
        // The onSnapshot listener will update the state, so we just need to set loading to false.
        setIsTogglingMaintenance(false);
      }
  }
  
  const handleResetGame = async () => {
    setIsResettingGame(true);
    try {
        await resetWordChainGame();
        toast({
            title: "초기화 완료",
            description: "끝말잇기 게임이 성공적으로 초기화되었습니다."
        });
    } catch(error: any) {
         toast({
            title: "초기화 오류",
            description: error.message || "게임 초기화 중 오류가 발생했습니다.",
            variant: "destructive"
        });
    } finally {
        setIsResettingGame(false);
    }
  }
  
  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">총 사용자</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {isLoadingStats ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString() ?? 0} 명</div>}
                    <p className="text-xs text-muted-foreground">
                    현재 시스템에 등록된 총 학생 수
                    </p>
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">코드로 지급된 포인트</CardTitle>
                    <Coins className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {isLoadingStats ? <Skeleton className="h-8 w-28" /> : <div className="text-2xl font-bold">{stats.totalLakIssued.toLocaleString() ?? 0} 포인트</div>}
                    <p className="text-xs text-muted-foreground">
                    지금까지 코드를 통해 지급된 포인트 총합
                    </p>
                </CardContent>
                </Card>
            </div>
            <AnnouncementPoster />
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><HardHat />시스템 관리</CardTitle>
                    <CardDescription>시스템의 주요 기능을 제어합니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <Label htmlFor="maintenance-mode" className="text-base">시스템 점검 모드</Label>
                            <p className="text-sm text-muted-foreground">활성화 시 관리자를 제외한 모든 사용자가 점검 페이지를 보게 됩니다.</p>
                        </div>
                        <Switch
                            id="maintenance-mode"
                            checked={isMaintenanceMode}
                            onCheckedChange={handleMaintenanceToggle}
                            disabled={isTogglingMaintenance}
                        />
                    </div>
                     <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <Label className="text-base">끝말잇기 게임 초기화</Label>
                            <p className="text-sm text-muted-foreground">게임 기록을 모두 삭제하고 처음부터 다시 시작합니다.</p>
                        </div>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="secondary" size="sm" disabled={isResettingGame}>
                                    {isResettingGame ? <Loader2 className="h-4 w-4 animate-spin"/> : <Eraser className="h-4 w-4"/>}
                                    <span className="ml-2">초기화</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>끝말잇기 게임을 초기화할까요?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    이 작업은 모든 끝말잇기 기록을 영구적으로 삭제합니다. 되돌릴 수 없습니다.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction onClick={handleResetGame} disabled={isResettingGame}>
                                    {isResettingGame ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                    네, 초기화합니다
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardContent>
            </Card>
        </div>
        <div className="lg:sticky lg:top-6">
            <CommunicationChannel />
        </div>
    </div>
  );
}
