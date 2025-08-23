
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { ShoppingCart, Plus, Minus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { db, auth, purchaseItems } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';


interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl: string;
}

interface CartItem extends Product {
  quantity: number;
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const { toast } = useToast();
  const [user] = useAuthState(auth);

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

  useEffect(() => {
    const newTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    setTotalCost(newTotal);
  }, [cart]);

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        if (existingItem.quantity < product.stock) {
          return prevCart.map(item =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          );
        } else {
          toast({ title: "재고 부족", description: `'${product.name}'의 재고가 부족합니다.`, variant: 'destructive' });
          return prevCart;
        }
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === productId);
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map(item =>
          item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prevCart.filter(item => item.id !== productId);
    });
  };

  const handlePurchase = async () => {
    if (!user) {
      toast({ title: '로그인 필요', description: '구매를 위해 로그인이 필요합니다.', variant: 'destructive' });
      return;
    }
    if (cart.length === 0) {
      toast({ title: '장바구니 비어있음', description: '구매할 상품을 선택해주세요.', variant: 'destructive' });
      return;
    }

    setIsPurchasing(true);
    const result = await purchaseItems(user.uid, cart, totalCost);
    if (result.success) {
      toast({ title: '구매 완료!', description: result.message });
      setCart([]);
    } else {
      toast({ title: '구매 실패', description: result.message, variant: 'destructive' });
    }
    setIsPurchasing(false);
  };

  return (
    <div className="pb-24">
       <div className="space-y-1 mb-6">
            <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center gap-2">
                <ShoppingCart className="h-6 w-6"/>
                종달 상점
            </h1>
            <p className="text-muted-foreground">
                모은 Lak으로 원하는 상품을 구매해보세요!
            </p>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)
        ) : products.length === 0 ? (
            <p className="col-span-full text-center text-muted-foreground py-16">판매중인 상품이 없습니다.</p>
        ) : (
            products.map((product) => (
              <Card key={product.id} className="flex flex-col overflow-hidden">
                <div className="relative w-full h-40">
                    <Image src={product.imageUrl} alt={product.name} layout="fill" objectFit="cover" />
                </div>
                <CardContent className="p-4 flex flex-col flex-grow">
                  <div className="flex-grow">
                    <h3 className="font-bold text-lg">{product.name}</h3>
                    <p className="text-sm text-primary font-semibold">{product.price} Lak</p>
                    <p className="text-xs text-muted-foreground">남은 수량: {product.stock}개</p>
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => removeFromCart(product.id)} disabled={!cart.some(item => item.id === product.id)}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-bold w-8 text-center">{cart.find(item => item.id === product.id)?.quantity || 0}</span>
                    <Button variant="outline" size="icon" onClick={() => addToCart(product)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
        )}
      </div>

       {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t p-4 shadow-lg">
          <div className="container mx-auto max-w-4xl">
            <h3 className="text-lg font-semibold mb-2">장바구니</h3>
            <div className="max-h-32 overflow-y-auto pr-2">
                {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm mb-1">
                        <span>{item.name} x{item.quantity}</span>
                        <span>{item.price * item.quantity} Lak</span>
                    </div>
                ))}
            </div>
            <Separator className="my-2"/>
            <div className="flex justify-between items-center font-bold text-xl">
              <span>총 금액:</span>
              <span>{totalCost} Lak</span>
            </div>
            <Button className="w-full mt-3 font-bold" onClick={handlePurchase} disabled={isPurchasing}>
              {isPurchasing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {totalCost} Lak으로 구매하기
            </Button>
          </div>
        </div>
       )}
    </div>
  );
}

    