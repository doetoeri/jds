'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, ShoppingCart, TrendingUp } from 'lucide-react';

interface Product {
  name: string;
  stock: number;
}

interface Purchase {
  createdAt: Timestamp;
}

export default function AdminDashboardPage() {
  const [stockData, setStockData] = useState<Product[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const productsQuery = query(collection(db, 'products'));
    const unsubProducts = onSnapshot(productsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Product).sort((a,b) => a.stock - b.stock).slice(0, 10);
      setStockData(data);
    });

    const oneWeekAgo = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const purchasesQuery = query(collection(db, 'purchases'), where('createdAt', '>=', oneWeekAgo));
    const unsubPurchases = onSnapshot(purchasesQuery, (snapshot) => {
      const purchases = snapshot.docs.map(doc => doc.data() as Purchase);
      const salesByDay: { [key: string]: number } = {};
      
      for(let i=0; i<7; i++) {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          const key = d.toISOString().split('T')[0];
          salesByDay[key] = 0;
      }

      purchases.forEach(p => {
        const date = p.createdAt.toDate();
        const dayKey = date.toISOString().split('T')[0];
        if(salesByDay[dayKey] !== undefined) {
           salesByDay[dayKey]++;
        }
      });
      
      const formattedData = Object.entries(salesByDay)
        .map(([date, sales]) => ({
          date: new Date(date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }),
          판매량: sales,
        }))
        .reverse();

      setSalesData(formattedData);
    });
    
    // Combine unsubscribe functions and set loading to false once both are active
    Promise.all([new Promise(res => unsubProducts()), new Promise(res => unsubPurchases())])
        .then(() => setIsLoading(false))
        .catch(() => setIsLoading(false)); // Also stop loading on error

    return () => {
      unsubProducts();
      unsubPurchases();
    };
  }, []);

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold tracking-tight font-headline">관리자 대시보드</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Package className="mr-2"/>재고 현황</CardTitle>
            <CardDescription>재고가 가장 적게 남은 10개 상품입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stockData} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'hsl(var(--accent))' }} />
                  <Bar dataKey="stock" name="재고" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><TrendingUp className="mr-2"/>일일 판매량</CardTitle>
            <CardDescription>지난 7일간의 총 판매 건수입니다.</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesData}>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="판매량" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
