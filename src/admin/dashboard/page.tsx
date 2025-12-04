
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Users, Coins, ShoppingCart, MessageCircleQuestion, Minus, Plus, UserCheck } from 'lucide-react';
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
    totalCredits: number;
    totalDebits: number;
    totalItemsSold: number;
    uniqueCustomers: number;
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
  const [stats, setStats] = useState<Partial<Stats>>({});
  const [gradeData, setGradeData] = useState<GradeActivity[]>([]);
  const [topProducts, setTopProducts] = useState<ProductSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const fetchAllStats = async () => {
        setIsLoading(true);
        try {
            // Fetch all necessary data in parallel
            const usersQuery = query(collection(db, 'users'), where('role', 'in', ['student', 'teacher', 'council', 'kiosk']));
            const inquiriesQuery = query(collection(db, 'inquiries'), where('status', '==', 'open'));
            const productsQuery = query(collection(db, 'products'));
            const transactionsGroupQuery = collectionGroup(db, 'transactions');
            const purchasesQuery = collection(db, 'purchases');

            const [
                usersSnapshot,
                inquiriesSnapshot,
                productsSnapshot,
                transactionsSnapshot,
                purchasesSnapshot
            ] = await Promise.all([
                getDocs(usersQuery),
                getDocs(inquiriesQuery),
                getDocs(productsQuery),
                getDocs(transactionsGroupQuery),
                getDocs(purchasesQuery)
            ]);

            // Process Users
            let totalLak = 0;
            const studentGradeMap: { [userId: string]: string } = {};
            usersSnapshot.forEach(doc => {
              const userData = doc.data();
              totalLak += userData.lak || 0;
              if (userData.role === 'student' && userData.studentId) {
                  const grade = userData.studentId.substring(0, 1);
                  if (['1', '2', '3'].includes(grade)) {
                      studentGradeMap[doc.id] = `${grade}학년`;
                  }
              }
            });
            
            // Process Transactions
            let totalCredits = 0;
            let totalDebits = 0;
            const gradeMap: {[key: string]: GradeActivity} = {
                '1학년': { grade: '1학년', credit: 0, debit: 0 },
                '2학년': { grade: '2학년', credit: 0, debit: 0 },
                '3학년': { grade: '3학년', credit: 0, debit: 0 },
            };

            transactionsSnapshot.forEach(doc => {
                const t = doc.data();
                const userId = doc.ref.parent.parent?.id;
                const userGrade = userId ? studentGradeMap[userId] : undefined;

                if (t.type === 'credit') {
                    totalCredits += t.amount;
                    if (userGrade && gradeMap[userGrade]) {
                        gradeMap[userGrade].credit += t.amount;
                    }
                } else if (t.type === 'debit') {
                    totalDebits += Math.abs(t.amount);
                    if (userGrade && gradeMap[userGrade]) {
                        gradeMap[userGrade].debit += Math.abs(t.amount);
                    }
                }
            });
            setGradeData(Object.values(gradeMap));

            // Process Purchases
            let totalItemsSold = 0;
            const customerSet = new Set<string>();
            const productSales: { [name: string]: number } = {};
            
            purchasesSnapshot.forEach(purchaseDoc => {
                const data = purchaseDoc.data();
                if (data.studentId) {
                  customerSet.add(data.studentId);
                }
                const items = data.items as { name: string, quantity: number }[];
                if (items) {
                    items.forEach(item => {
                        totalItemsSold += item.quantity;
                        productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
                    });
                }
            });

            const sortedProducts = Object.entries(productSales)
                .map(([name, totalSold]) => ({ name, totalSold }))
                .sort((a, b) => b.totalSold - a.totalSold)
                .slice(0, 5);
            setTopProducts(sortedProducts);
            
            // Set all stats at once
            setStats({
                totalUsers: usersSnapshot.size,
                openInquiries: inquiriesSnapshot.size,
                totalProducts: productsSnapshot.size,
                totalLak,
                totalCredits,
                totalDebits,
                totalItemsSold,
                uniqueCustomers: customerSet.size,
            });

        } catch (error) {
            console.error("Failed to fetch dashboard stats:", error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchAllStats();

    // Setup listeners for real-time simple stats
    const usersUnsub = onSnapshot(query(collection(db, 'users'), where('role', 'in', ['student', 'teacher', 'council', 'kiosk'])), (snapshot) => {
        let currentLak = 0;
        snapshot.forEach(doc => {
            currentLak += doc.data().lak || 0;
        });
        setStats(prev => ({ ...prev, totalUsers: snapshot.size, totalLak: currentLak }));
    }, (error) => console.error("Users listener error:", error));

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
                <CardTitle className="text-sm font-medium">총 판매 상품 수</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{stats?.totalItemsSold?.toLocaleString() ?? 0} 개</div>}
                 <p className="text-xs text-muted-foreground">지금까지 판매된 모든 상품 개수 합계</p>
            </CardContent>
            </Card>

            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">상점 이용 고객</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{stats?.uniqueCustomers?.toLocaleString() ?? 0} 명</div>}
                 <p className="text-xs text-muted-foreground">한 번이라도 상점을 이용한 학생 수</p>
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

        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>학년별 포인트 활동</CardTitle>
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
