
'use client';
export const dynamic = 'force-dynamic';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Users, Coins, ShoppingCart, ListOrdered, Search, Loader2 } from 'lucide-react';
import { CommunicationChannel } from '@/components/communication-channel';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

interface Stats {
    totalUsers: number;
    totalLakIssued: number;
    pendingOrders: number;
    productsInStock: number;
}

interface SearchedUser {
    displayName: string;
    lak: number;
}

export default function CouncilDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [studentId, setStudentId] = useState('');
  const [searchedUser, setSearchedUser] = useState<SearchedUser | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');

  const { toast } = useToast();

  useEffect(() => {
    const usersQuery = query(collection(db, 'users'), where('role', '==', 'student'));
    const codesQuery = query(collection(db, 'codes'));
    const ordersQuery = query(collection(db, 'purchases'), where('status', '==', 'pending'));
    const productsQuery = query(collection(db, 'products'), where('stock', '>', 0));

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
                        redeemed += (Math.max(0, code.participants.length - 1) * code.value * 2);
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
            totalLakIssued: redeemed
        }));
    });
    
    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
        setStats(prev => ({ ...prev!, pendingOrders: snapshot.size }));
    });
    
    const unsubProducts = onSnapshot(productsQuery, (snapshot) => {
        setStats(prev => ({ ...prev!, productsInStock: snapshot.size }));
        setIsLoading(false);
    });

    return () => {
        unsubUsers();
        unsubCodes();
        unsubOrders();
        unsubProducts();
    };
  }, []);

  const handleSearchStudent = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!studentId || !/^\d{5}$/.test(studentId)) {
          toast({ title: '입력 오류', description: '올바른 5자리 학번을 입력해주세요.', variant: 'destructive'});
          return;
      }
      setIsSearching(true);
      setSearchedUser(null);
      setSearchMessage('');
      try {
          const q = query(collection(db, 'users'), where('studentId', '==', studentId));
          const snapshot = await getDocs(q);
          if (snapshot.empty) {
              setSearchMessage('학생을 찾을 수 없습니다.');
          } else {
              const userData = snapshot.docs[0].data();
              setSearchedUser({ displayName: userData.displayName, lak: userData.lak });
          }
      } catch (err) {
          setSearchMessage('조회 중 오류가 발생했습니다.');
      } finally {
          setIsSearching(false);
      }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
            <h1 className="text-3xl font-bold tracking-tight font-headline">학생회 대시보드</h1>
            <p className="text-muted-foreground -mt-5">상점과 주문 내역을 관리하고 사용자 정보를 확인하세요.</p>
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">총 사용자</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{stats?.totalUsers.toLocaleString() ?? 0} 명</div>}
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
                    {isLoading ? <Skeleton className="h-8 w-28" /> : <div className="text-2xl font-bold">{stats?.totalLakIssued.toLocaleString() ?? 0} 포인트</div>}
                    <p className="text-xs text-muted-foreground">
                    지금까지 코드를 통해 지급된 포인트 총합
                    </p>
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">처리 대기중인 주문</CardTitle>
                    <ListOrdered className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                     {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stats?.pendingOrders.toLocaleString() ?? 0} 건</div>}
                    <p className="text-xs text-muted-foreground">
                    학생들이 주문하고 기다리는 내역
                    </p>
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">판매중인 상품</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stats?.productsInStock.toLocaleString() ?? 0} 개</div>}
                    <p className="text-xs text-muted-foreground">
                    현재 상점에서 판매중인 상품 종류
                    </p>
                </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5"/>학생 포인트 조회</CardTitle>
                    <CardDescription>학번으로 학생의 현재 보유 포인트를 조회합니다.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearchStudent} className="flex items-center gap-2">
                        <Label htmlFor="student-id-search" className="sr-only">학번</Label>
                        <Input
                            id="student-id-search"
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            placeholder="학생의 5자리 학번 입력"
                            disabled={isSearching}
                        />
                        <Button type="submit" disabled={isSearching || !studentId}>
                            {isSearching ? <Loader2 className="h-4 w-4 animate-spin"/> : '조회'}
                        </Button>
                    </form>
                    {searchedUser && (
                        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                            <p className="font-bold">{searchedUser.displayName}</p>
                            <p className="text-primary text-xl font-bold">{searchedUser.lak.toLocaleString()} 포인트</p>
                        </div>
                    )}
                    {searchMessage && <p className="mt-4 text-sm text-destructive">{searchMessage}</p>}
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1">
            <CommunicationChannel />
        </div>
    </div>
  );
}
