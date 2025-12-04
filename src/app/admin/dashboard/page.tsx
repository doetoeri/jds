'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Users, Coins, Plus, Minus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, getDocs, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';

interface Stats {
    totalUsers: number;
    totalLak: number;
    totalCredits: number;
    totalDebits: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Partial<Stats>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    
    const fetchAllStats = async () => {
        setIsLoading(true);
        try {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            let totalLak = 0;
            usersSnapshot.forEach(doc => {
              totalLak += doc.data().lak || 0;
            });
            setStats(prev => ({ ...prev, totalUsers: usersSnapshot.size, totalLak }));

            const transactionsSnapshot = await getDocs(collectionGroup(db, 'transactions'));
            let totalCredits = 0;
            let totalDebits = 0;
            transactionsSnapshot.forEach(doc => {
                const t = doc.data();
                if (t.type === 'credit') totalCredits += t.amount;
                else if (t.type === 'debit') totalDebits += Math.abs(t.amount);
            });
            setStats(prev => ({...prev, totalCredits, totalDebits}));

        } catch (error) {
            console.error("Failed to fetch dashboard stats:", error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchAllStats();
    
    const usersUnsub = onSnapshot(collection(db, 'users'), (snapshot) => {
        let currentLak = 0;
        snapshot.forEach(doc => {
            currentLak += doc.data().lak || 0;
        });
        setStats(prev => ({ ...prev, totalUsers: snapshot.size, totalLak: currentLak }));
    });

    return () => {
        usersUnsub();
    };

  }, []);

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">관리자 대시보드</h1>
        <p className="text-muted-foreground -mt-5">서비스의 주요 현황을 요약하여 보여줍니다.</p>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 가입자 수</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{stats?.totalUsers?.toLocaleString() ?? 0} 명</div>}
                <p className="text-xs text-muted-foreground">현재 시스템에 등록된 모든 사용자</p>
            </CardContent>
            </Card>

            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">유통중인 포인트</CardTitle>
                <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-28" /> : <div className="text-2xl font-bold">{stats?.totalLak?.toLocaleString() ?? 0} P</div>}
                <p className="text-xs text-muted-foreground">모든 사용자들의 현재 포인트 총합</p>
            </CardContent>
            </Card>
            
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 발행 포인트</CardTitle>
                <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-28" /> : <div className="text-2xl font-bold">{stats?.totalCredits?.toLocaleString() ?? 0} P</div>}
                 <p className="text-xs text-muted-foreground">지금까지 지급된 모든 포인트 합계</p>
            </CardContent>
            </Card>

            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 사용 포인트</CardTitle>
                <Minus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-28" /> : <div className="text-2xl font-bold">{stats?.totalDebits?.toLocaleString() ?? 0} P</div>}
                <p className="text-xs text-muted-foreground">지금까지 사용된 모든 포인트 합계</p>
            </CardContent>
            </Card>
        </div>
    </div>
  );
}
