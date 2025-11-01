
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Users, Coins, ShoppingCart, MessageCircleQuestion, Loader2 } from 'lucide-react';
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
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
        setIsLoading(true);
        try {
            const usersQuery = query(collection(db, 'users'), where('role', 'in', ['student', 'teacher', 'council', 'kiosk']));
            const usersSnapshot = await getDocs(usersQuery);
            const totalUsers = usersSnapshot.size;

            let totalLak = 0;
            usersSnapshot.forEach(doc => {
                totalLak += doc.data().lak || 0;
            });

            const inquiriesQuery = query(collection(db, 'inquiries'), where('status', '==', 'open'));
            const inquiriesSnapshot = await getDocs(inquiriesQuery);
            const openInquiries = inquiriesSnapshot.size;

            const productsQuery = query(collection(db, 'products'));
            const productsSnapshot = await getDocs(productsQuery);
            const totalProducts = productsSnapshot.size;

            setStats({ totalUsers, totalLak, openInquiries, totalProducts });

        } catch (error) {
            console.error("Failed to fetch dashboard stats:", error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchStats();

    const usersUnsub = onSnapshot(query(collection(db, 'users'), where('role', 'in', ['student', 'teacher', 'council', 'kiosk'])), (snapshot) => {
        let totalLak = 0;
        snapshot.forEach(doc => {
            totalLak += doc.data().lak || 0;
        });
        setStats(prev => prev ? { ...prev, totalUsers: snapshot.size, totalLak } : { totalUsers: snapshot.size, totalLak, openInquiries: 0, totalProducts: 0 });
    });

    const inquiriesUnsub = onSnapshot(query(collection(db, 'inquiries'), where('status', '==', 'open')), (snapshot) => {
        setStats(prev => prev ? { ...prev, openInquiries: snapshot.size } : null);
    });
    
    const productsUnsub = onSnapshot(query(collection(db, 'products')), (snapshot) => {
        setStats(prev => prev ? { ...prev, totalProducts: snapshot.size } : null);
    });

    return () => {
        usersUnsub();
        inquiriesUnsub();
        productsUnsub();
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
                {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{stats?.totalUsers.toLocaleString() ?? 0} 명</div>}
                <p className="text-xs text-muted-foreground">
                현재 시스템에 등록된 모든 사용자
                </p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">유통중인 포인트</CardTitle>
                <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-28" /> : <div className="text-2xl font-bold">{stats?.totalLak.toLocaleString() ?? 0} 포인트</div>}
                <p className="text-xs text-muted-foreground">
                모든 사용자들의 포인트 총합 (저금통 제외)
                </p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">미확인 문의</CardTitle>
                <MessageCircleQuestion className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                 {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stats?.openInquiries.toLocaleString() ?? 0} 건</div>}
                <p className="text-xs text-muted-foreground">
                사용자들이 보낸 처리되지 않은 문의 개수
                </p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">판매중인 상품</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stats?.totalProducts.toLocaleString() ?? 0} 개</div>}
                <p className="text-xs text-muted-foreground">
                현재 상점에서 판매중인 상품 종류
                </p>
            </CardContent>
            </Card>
        </div>
    </div>
  );
}
