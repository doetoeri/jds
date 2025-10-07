'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { ShoppingCart, ImageIcon, Store } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl: string;
}

export default function PublicShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, "products"), where("stock", ">", 0));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));
      setProducts(productsData);
      setIsLoading(false);
    }, (error) => {
      console.error(error);
      toast({ title: "상품 목록 로딩 실패", description: "상품을 불러오는 중 오류가 발생했습니다.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  return (
    <div>
       <div className="space-y-1 mb-6 text-center">
            <h1 className="text-4xl font-bold tracking-tight font-headline flex items-center justify-center gap-2">
                <ShoppingCart className="h-8 w-8"/>
                종달 상점
            </h1>
            <p className="text-muted-foreground text-lg">
                현재 판매중인 전체 상품 목록입니다.
            </p>
        </div>

        {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
            </div>
        ) : products.length === 0 ? (
            <div className="text-center py-20">
                <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4"/>
                <h2 className="text-2xl font-bold">판매중인 상품이 없습니다</h2>
                <p className="text-muted-foreground">곧 새로운 상품으로 찾아오겠습니다.</p>
            </div>
        ) : (
             <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                <Card key={product.id} className="flex flex-col overflow-hidden">
                    <div className="relative w-full h-48 bg-muted">
                        {product.imageUrl ? (
                           <Image src={product.imageUrl} alt={product.name} layout="fill" objectFit="cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <ImageIcon className="h-12 w-12"/>
                            </div>
                        )}
                    </div>
                    <CardContent className="p-4 flex flex-col flex-grow">
                    <div className="flex-grow">
                        <h3 className="font-bold text-lg">{product.name}</h3>
                        <p className="text-sm text-primary font-semibold">{product.price} 포인트</p>
                        <p className="text-xs text-muted-foreground">남은 수량: {product.stock}개</p>
                    </div>
                    </CardContent>
                </Card>
                ))}
            </div>
        )}
    </div>
  );
}
