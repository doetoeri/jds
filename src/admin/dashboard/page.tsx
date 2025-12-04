
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Users, Coins, ShoppingCart, MessageCircleQuestion } from 'lucide-react';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';

interface Stats {
    totalUsers: number;
    totalLak: number;
    openInquiries: number;
    totalProducts: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Partial<Stats>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    // Listeners for simple stats
    const usersUnsub = onSnapshot(query(collection(db, 'users'), where('role', 'in', ['student', 'teacher', 'council', 'kiosk'])), (snapshot) => {
        let currentLak = 0;
        snapshot.forEach(doc => {
            currentLak += doc.data().lak || 0;
        });
        setStats(prev => ({ ...prev, totalUsers: snapshot.size, totalLak: currentLak }));
        if(isLoading) setIsLoading(false);
    }, (error) => {
        console.error("Users listener error:", error);
        if(isLoading) setIsLoading(false);
    });

    const inquiriesUnsub = onSnapshot(query(collection(db, 'inquiries'), where('status', '==', 'open')), (snapshot) => {
        setStats(prev => ({ ...prev, openInquiries: snapshot.size }));
    }, (error) => console.error("Inquiries listener error:", error));
    
    const productsUnsub = onSnapshot(collection(db, 'products'), (snapshot) => {
        setStats(prev => ({ ...prev, totalProducts: snapshot.size }));
    }, (error) => console.error("Products listener error:", error));

    return () => {
        usersUnsub();
        inquiriesUnsub();
        productsUnsub();
    };

  }, [isLoading]);

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
                <CardTitle className="text-sm font-medium">판매중인 상품</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stats?.totalProducts?.toLocaleString() ?? 0} 개</div>}
                <p className="text-xs text-muted-foreground">현재 상점에서 판매중인 상품 종류</p>
            </CardContent>
            </Card>
            
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">미확인 문의</CardTitle>
                <MessageCircleQuestion className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                 {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stats?.openInquiries?.toLocaleString() ?? 0} 건</div>}
                <p className="text-xs text-muted-foreground">사용자들이 보낸 처리되지 않은 문의</p>
            </CardContent>
            </Card>
        </div>
    </div>
  );
}
