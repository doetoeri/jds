
'use client';
export const dynamic = 'force-dynamic';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Users, Coins, ShoppingCart, MessageCircleQuestion, Loader2, BarChart2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, getDocs, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface Stats {
    totalUsers: number;
    totalLak: number;
    openInquiries: number;
    totalProducts: number;
}

interface GradeActivity {
    grade: string;
    credit: number;
    debit: number;
}

interface ProductSale {
    name: string;
    totalSold: number;
}

const chartConfig = {
  credit: {
    label: "적립",
    color: "hsl(var(--chart-1))",
  },
  debit: {
    label: "사용",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [gradeData, setGradeData] = useState<GradeActivity[]>([]);
  const [topProducts, setTopProducts] = useState<ProductSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllStats = async () => {
        setIsLoading(true);
        try {
            // Basic Stats
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

            // Grade Activity Stats
            const gradeMap: {[key: string]: GradeActivity} = {
                '1학년': { grade: '1학년', credit: 0, debit: 0 },
                '2학년': { grade: '2학년', credit: 0, debit: 0 },
                '3학년': { grade: '3학년', credit: 0, debit: 0 },
            };
            const studentUsers = usersSnapshot.docs.filter(doc => doc.data().role === 'student' && doc.data().studentId);
            for (const userDoc of studentUsers) {
                const studentId = userDoc.data().studentId;
                const grade = studentId.substring(0, 1);
                if (grade === '1' || grade === '2' || grade === '3') {
                    const gradeKey = `${grade}학년`;
                    const transactionsSnapshot = await getDocs(collection(userDoc.ref, 'transactions'));
                    transactionsSnapshot.forEach(transDoc => {
                        const t = transDoc.data();
                        if (t.type === 'credit') {
                            gradeMap[gradeKey].credit += t.amount;
                        } else if (t.type === 'debit') {
                            gradeMap[gradeKey].debit += Math.abs(t.amount);
                        }
                    });
                }
            }
            setGradeData(Object.values(gradeMap));

            // Top Products Stats
            const productSales: { [name: string]: number } = {};
            const purchasesSnapshot = await getDocs(collection(db, 'purchases'));
            purchasesSnapshot.forEach(purchaseDoc => {
                const items = purchaseDoc.data().items as { name: string, quantity: number }[];
                if (items) {
                    items.forEach(item => {
                        productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
                    });
                }
            });
            const sortedProducts = Object.entries(productSales)
                .map(([name, totalSold]) => ({ name, totalSold }))
                .sort((a, b) => b.totalSold - a.totalSold)
                .slice(0, 5);
            setTopProducts(sortedProducts);

        } catch (error) {
            console.error("Failed to fetch dashboard stats:", error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchAllStats();
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

        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart2 />학년별 포인트 활동</CardTitle>
                    <CardDescription>학년별 총 포인트 적립 및 사용량입니다.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-64 w-full" /> : (
                         <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                            <BarChart data={gradeData} accessibilityLayer>
                                <XAxis
                                dataKey="grade"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                tickFormatter={(value) => value.slice(0, 3)}
                                />
                                <YAxis />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="credit" fill="var(--color-credit)" radius={4} />
                                <Bar dataKey="debit" fill="var(--color-debit)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>인기 판매 상품 Top 5</CardTitle>
                    <CardDescription>가장 많이 판매된 상품 순위입니다.</CardDescription>
                </CardHeader>
                <CardContent>
                     {isLoading ? <Skeleton className="h-64 w-full" /> : (
                        <div className="space-y-4">
                            {topProducts.map((product, index) => (
                                <div key={product.name} className="flex items-center">
                                    <div className="text-lg font-bold w-6">{index + 1}.</div>
                                    <div className="flex-1 font-medium">{product.name}</div>
                                    <div className="font-bold">{product.totalSold.toLocaleString()}개</div>
                                </div>
                            ))}
                            {topProducts.length === 0 && <p className="text-center text-muted-foreground py-10">판매 기록이 없습니다.</p>}
                        </div>
                     )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}

