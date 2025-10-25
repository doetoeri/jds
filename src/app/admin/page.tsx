
'use client';

import { AnnouncementPoster } from "@/components/announcement-poster";
import { CommunicationChannel } from "@/components/communication-channel";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { HardHat, Eraser, Loader2, Swords, Users, Coins, ShoppingCart, Power, Crown, Settings, Trash2, Percent, Landmark } from "lucide-react";
import { useState, useEffect } from "react";
import { db, setMaintenanceMode, resetWordChainGame, resetLeaderboard, setShopStatus, updateUserMemo, updateBoothReasons, setGlobalDiscount } from "@/lib/firebase";
import { collection, doc, onSnapshot, query, where, collectionGroup, getDocs, getCountFromServer } from "firebase/firestore";
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
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle as DialogTitleComponent, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function AdminPage() {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean>(false);
  const [isShopEnabled, setIsShopEnabled] = useState<boolean>(true);
  const [isTogglingSystem, setIsTogglingSystem] = useState(true);
  const [isResettingGame, setIsResettingGame] = useState(false);
  
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [totalAvailableLak, setTotalAvailableLak] = useState<number | null>(null);
  const [totalLakIssued, setTotalLakIssued] = useState<number | null>(null);

  const { toast } = useToast();
  
  const [isResetLeaderboardOpen, setIsResetLeaderboardOpen] = useState(false);
  const [leaderboardToReset, setLeaderboardToReset] = useState('');
  const [isResettingLeaderboard, setIsResettingLeaderboard] = useState(false);

  const [isReasonsDialogOpen, setIsReasonsDialogOpen] = useState(false);
  const [boothReasons, setBoothReasons] = useState<string[]>([]);
  const [newReason, setNewReason] = useState('');
  const [isUpdatingReasons, setIsUpdatingReasons] = useState(false);
  
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [isSavingDiscount, setIsSavingDiscount] = useState(false);


  useEffect(() => {
    const settingsRef = doc(db, 'system_settings', 'main');
    const unsubSettings = onSnapshot(settingsRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            setIsMaintenanceMode(data?.isMaintenanceMode ?? false);
            setIsShopEnabled(data?.isShopEnabled ?? true);
            setGlobalDiscount(data?.globalDiscount ?? 0);
        } else {
            setIsMaintenanceMode(false);
            setIsShopEnabled(true);
            setGlobalDiscount(0);
        }
        setIsTogglingSystem(false);
    });

    const reasonsRef = doc(db, 'system_settings', 'booth_reasons');
    const unsubReasons = onSnapshot(reasonsRef, (doc) => {
        if (doc.exists()) {
            setBoothReasons(doc.data().reasons || []);
        }
    });

    const usersQuery = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
        setTotalUsers(snapshot.size);
    }, (error) => {
      console.error("Error fetching user data for stats:", error);
      setTotalUsers(0);
    });
    
    // Fetch all users and sum up their 'lak' balance for total available points
    const usersLakQuery = query(collection(db, 'users'));
    const unsubLAK = onSnapshot(usersLakQuery, (usersSnapshot) => {
        let total = 0;
        usersSnapshot.forEach(userDoc => {
            total += userDoc.data().lak || 0;
        });
        setTotalAvailableLak(total);
    }, (error) => {
        console.error("Error fetching total available LAK:", error);
        setTotalAvailableLak(0);
    });

    const fetchTotalIssued = async () => {
       try {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            let totalIssued = 0;

            for (const userDoc of usersSnapshot.docs) {
                const transactionsRef = collection(db, 'users', userDoc.id, 'transactions');
                const q = query(transactionsRef, where('type', '==', 'credit'));
                const transactionsSnapshot = await getDocs(q);
                transactionsSnapshot.forEach((transDoc) => {
                    totalIssued += transDoc.data().amount || 0;
                });
            }
            setTotalLakIssued(totalIssued);
        } catch (error) {
            console.error("Error fetching total issued LAK:", error);
            setTotalLakIssued(0);
        }
    };
    fetchTotalIssued();


    return () => {
        unsubSettings();
        unsubUsers();
        unsubReasons();
        unsubLAK();
    };
  }, []);

  const handleSystemToggle = async (type: 'maintenance' | 'shop', checked: boolean) => {
      setIsTogglingSystem(true);
      try {
          if (type === 'maintenance') {
              await setMaintenanceMode(checked);
              toast({
                  title: "성공",
                  description: `시스템 점검 모드가 ${checked ? '활성화' : '비활성화'}되었습니다.`
              });
          } else if (type === 'shop') {
              await setShopStatus(checked);
              toast({
                  title: "성공",
                  description: `상점 온라인 구매가 ${checked ? '활성화' : '비활성화'}되었습니다.`
              });
          }
      } catch (error) {
          toast({
              title: "오류",
              description: "설정 변경 중 오류가 발생했습니다.",
              variant: "destructive"
          });
      } finally {
        setIsTogglingSystem(false);
      }
  }
  
  const handleDiscountSave = async () => {
    setIsSavingDiscount(true);
    try {
        await setGlobalDiscount(globalDiscount);
        toast({
            title: '할인율 저장됨',
            description: `모든 상점에 ${globalDiscount}% 할인이 적용됩니다.`
        });
    } catch(e) {
        toast({ title: '오류', description: '할인율 저장에 실패했습니다.', variant: 'destructive'});
    } finally {
        setIsSavingDiscount(false);
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
  
  const handleResetLeaderboard = async () => {
    if (!leaderboardToReset) {
      toast({ title: "선택 필요", description: "초기화할 리더보드를 선택해주세요.", variant: "destructive" });
      return;
    }
    setIsResettingLeaderboard(true);
    try {
        await resetLeaderboard(leaderboardToReset);
        toast({ title: "초기화 완료", description: `${leaderboardToReset} 리더보드가 초기화되었습니다.`});
        setIsResetLeaderboardOpen(false);
        setLeaderboardToReset('');
    } catch(error: any) {
        toast({ title: "초기화 오류", description: error.message || "리더보드 초기화 중 오류가 발생했습니다.", variant: "destructive" });
    } finally {
        setIsResettingLeaderboard(false);
    }
  };

  const handleAddReason = async () => {
    if (!newReason.trim()) return;
    setIsUpdatingReasons(true);
    const updatedReasons = [...boothReasons, newReason.trim()];
    try {
        await updateBoothReasons(updatedReasons);
        setNewReason('');
    } catch (e) {
        toast({ title: '오류', description: '사유 추가에 실패했습니다.', variant: 'destructive' });
    } finally {
        setIsUpdatingReasons(false);
    }
  };
  
  const handleRemoveReason = async (reasonToRemove: string) => {
    setIsUpdatingReasons(true);
    const updatedReasons = boothReasons.filter(r => r !== reasonToRemove);
    try {
        await updateBoothReasons(updatedReasons);
    } catch (e) {
        toast({ title: '오류', description: '사유 삭제에 실패했습니다.', variant: 'destructive' });
    } finally {
        setIsUpdatingReasons(false);
    }
  };

  
  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">총 사용자</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {totalUsers === null ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{totalUsers.toLocaleString() ?? 0} 명</div>}
                    <p className="text-xs text-muted-foreground">
                    시스템에 등록된 학생 수
                    </p>
                </CardContent>
                </Card>
                 <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">총 발급된 포인트</CardTitle>
                    <Landmark className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {totalLakIssued === null ? <Skeleton className="h-8 w-28" /> : <div className="text-2xl font-bold">{totalLakIssued.toLocaleString() ?? 0} 포인트</div>}
                    <p className="text-xs text-muted-foreground">
                    지금까지 발급된 포인트 총합
                    </p>
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">총 사용 가능 포인트</CardTitle>
                    <Coins className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {totalAvailableLak === null ? <Skeleton className="h-8 w-28" /> : <div className="text-2xl font-bold">{totalAvailableLak.toLocaleString() ?? 0} 포인트</div>}
                    <p className="text-xs text-muted-foreground">
                    현재 유통중인 포인트 총합
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
                            onCheckedChange={(checked) => handleSystemToggle('maintenance', checked)}
                            disabled={isTogglingSystem}
                        />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <Label htmlFor="shop-enabled" className="text-base">상점 온라인 구매 활성화</Label>
                            <p className="text-sm text-muted-foreground">비활성화 시 학생들이 상점에서 상품 목록은 볼 수 있지만, 온라인으로 구매할 수는 없습니다.</p>
                        </div>
                        <Switch
                            id="shop-enabled"
                            checked={isShopEnabled}
                            onCheckedChange={(checked) => handleSystemToggle('shop', checked)}
                            disabled={isTogglingSystem}
                        />
                    </div>
                     <div className="rounded-lg border p-3 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="shop-discount" className="text-base">상점 전체 할인율</Label>
                                <p className="text-sm text-muted-foreground">모든 온라인 및 오프라인 상점 구매에 할인율을 적용합니다.</p>
                            </div>
                            <Button size="sm" onClick={handleDiscountSave} disabled={isSavingDiscount}>
                                {isSavingDiscount && <Loader2 className="h-4 w-4 animate-spin mr-2" />} 저장
                            </Button>
                        </div>
                         <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4 text-muted-foreground" />
                             <Select value={String(globalDiscount)} onValueChange={(v) => setGlobalDiscount(Number(v))}>
                              <SelectTrigger className="w-28">
                                <SelectValue placeholder="할인율 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map(p => (
                                    <SelectItem key={p} value={String(p)}>{p}%</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                         </div>
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
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <Label className="text-base">리더보드 초기화</Label>
                            <p className="text-sm text-muted-foreground">선택한 게임의 리더보드 기록을 영구적으로 삭제합니다.</p>
                        </div>
                         <Dialog open={isResetLeaderboardOpen} onOpenChange={setIsResetLeaderboardOpen}>
                            <DialogTrigger asChild>
                                <Button variant="secondary" size="sm"><Crown className="h-4 w-4"/><span className="ml-2">초기화</span></Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                <DialogTitleComponent>리더보드 초기화</DialogTitleComponent>
                                <DialogDescription>
                                    초기화할 게임 리더보드를 선택해주세요. 이 작업은 되돌릴 수 없습니다.
                                </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                  <Select value={leaderboardToReset} onValueChange={setLeaderboardToReset}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="초기화할 리더보드 선택..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="word-chain">끝말잇기</SelectItem>
                                      <SelectItem value="minesweeper-easy">지뢰찾기 (초급)</SelectItem>
                                      <SelectItem value="breakout">벽돌깨기</SelectItem>
                                      <SelectItem value="tetris">테트리스</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <DialogFooter>
                                <DialogClose asChild><Button variant="outline">취소</Button></DialogClose>
                                <Button onClick={handleResetLeaderboard} disabled={isResettingLeaderboard || !leaderboardToReset}>
                                    {isResettingLeaderboard && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    초기화 실행
                                </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <Label className="text-base">지급 사유 관리</Label>
                            <p className="text-sm text-muted-foreground">부스, 키오스크 등에서 사용할 포인트 지급 사유를 관리합니다.</p>
                        </div>
                         <Dialog open={isReasonsDialogOpen} onOpenChange={setIsReasonsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="secondary" size="sm"><Settings className="h-4 w-4"/><span className="ml-2">관리</span></Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                <DialogTitleComponent>지급 사유 관리</DialogTitleComponent>
                                <DialogDescription>
                                    학생회 부스나 키오스크에서 사용할 포인트 지급 사유 목록입니다.
                                </DialogDescription>
                                </DialogHeader>
                                <div className="py-4 space-y-4">
                                    <div className="space-y-2">
                                        {boothReasons.map((reason, i) => (
                                            <div key={i} className="flex items-center justify-between">
                                                <span>{reason}</span>
                                                <Button size="icon" variant="ghost" onClick={() => handleRemoveReason(reason)} disabled={isUpdatingReasons}>
                                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <Input value={newReason} onChange={e => setNewReason(e.target.value)} placeholder="새 사유 추가" disabled={isUpdatingReasons} />
                                        <Button onClick={handleAddReason} disabled={isUpdatingReasons || !newReason.trim()}>
                                            {isUpdatingReasons && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                            추가
                                        </Button>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild><Button variant="outline">닫기</Button></DialogClose>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
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
