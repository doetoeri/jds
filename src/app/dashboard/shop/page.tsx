'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { auth, purchaseItems } from '@/lib/firebase';
import { Loader2, ShoppingCart, Minus, Plus } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
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

// 1 Lak = 500 Won
const SNACKS_DATA = [
  { name: "담요",       stock: 5,  price: 4 },  // 2000
  { name: "도리토스",   stock: 5,  price: 4 },  // 2000
  { name: "오레오",     stock: 12, price: 4 },  // 2000
  { name: "마이구미",   stock: 10, price: 3 },  // 1500
  { name: "이클립스",   stock: 4,  price: 3 },  // 1500
  { name: "허니버터칩", stock: 2,  price: 3 },  // 1500
  { name: "프링글스",   stock: 15, price: 2 },  // 1000
  { name: "초코송이",   stock: 10, price: 2 },  // 1000
  { name: "홈런볼",     stock: 8,  price: 2 },  // 1000
  { name: "미쯔",       stock: 5,  price: 2 },  // 1000
  { name: "왕꿈틀이",   stock: 15, price: 1 },  // 500
  { name: "제티",       stock: 20, price: 0.4 }, // 200
  { name: "아이스티",   stock: 20, price: 0.2 }  // 100
];

interface CartItem {
  name: string;
  quantity: number;
  price: number;
}

export default function ShopPage() {
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [isPurchasing, setIsPurchasing] = useState(false);
  const { toast } = useToast();
  const [user] = useAuthState(auth);

  const handleQuantityChange = (name: string, price: number, stock: number, delta: number) => {
    setCart(prevCart => {
      const newQuantity = (prevCart[name]?.quantity || 0) + delta;
      if (newQuantity <= 0) {
        const { [name]: _, ...rest } = prevCart;
        return rest;
      }
      if (newQuantity > stock) {
        toast({ title: "재고 부족", description: `"${name}"의 최대 구매 가능 수량은 ${stock}개입니다.`, variant: "destructive" });
        return { ...prevCart, [name]: { ...prevCart[name], quantity: stock } };
      }
      return { ...prevCart, [name]: { name, quantity: newQuantity, price } };
    });
  };

  const totalCost = useMemo(() => {
    return Object.values(cart).reduce((total, item) => total + item.quantity * item.price, 0);
  }, [cart]);
  
  const cartItemsForPurchase = useMemo(() => {
    return Object.values(cart).filter(item => item.quantity > 0);
  }, [cart]);


  const handlePurchase = async () => {
    if (!user) {
      toast({ title: "로그인 필요", description: "구매를 위해 로그인이 필요합니다.", variant: "destructive" });
      return;
    }
    if (cartItemsForPurchase.length === 0) {
      toast({ title: "장바구니 비어있음", description: "구매할 상품을 선택해주세요.", variant: "destructive" });
      return;
    }

    setIsPurchasing(true);
    try {
      const result = await purchaseItems(user.uid, cartItemsForPurchase, totalCost);
      if (result.success) {
        toast({
          title: "구매 완료!",
          description: result.message,
        });
        setCart({}); // Reset cart
      } else {
        toast({
          title: "구매 실패",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "치명적인 오류",
        description: error.message || "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  const getCartDescription = () => {
    if (cartItemsForPurchase.length === 0) return "장바구니가 비어있습니다.";
    return cartItemsForPurchase.map(item => `${item.name} x${item.quantity}`).join(', ');
  }

  return (
    <div className="w-full">
      <CardHeader className="px-0">
        <CardTitle className="font-headline text-3xl flex items-center gap-2">
          <ShoppingCart className="h-8 w-8" />
          종달 상점
        </CardTitle>
        <CardDescription>보유한 Lak으로 원하는 상품을 구매하세요.</CardDescription>
      </CardHeader>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {SNACKS_DATA.map(({ name, stock, price }) => {
          const quantityInCart = cart[name]?.quantity || 0;
          const isSoldOut = stock <= 0;
          return (
            <Card key={name} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-headline text-primary">{name}</CardTitle>
                <CardDescription className="font-bold text-lg">{price.toLocaleString()} Lak</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                 <div className="text-sm text-muted-foreground">
                  {isSoldOut ? "품절" : `재고: ${stock}개`}
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button 
                    size="icon" 
                    variant="outline"
                    onClick={() => handleQuantityChange(name, price, stock, -1)}
                    disabled={quantityInCart === 0 || isPurchasing}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-bold text-lg">{quantityInCart}</span>
                  <Button 
                    size="icon" 
                    variant="outline"
                    onClick={() => handleQuantityChange(name, price, stock, 1)}
                    disabled={quantityInCart >= stock || isSoldOut || isPurchasing}
                   >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>
      
       {totalCost > 0 && (
        <Card className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-lg shadow-2xl z-50">
          <CardContent className="p-4 flex items-center justify-between gap-4">
             <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">총 금액</span>
                <span className="text-2xl font-bold text-primary">{totalCost.toLocaleString()} Lak</span>
             </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="lg" disabled={isPurchasing}>
                  {isPurchasing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  구매하기
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>구매 확인</AlertDialogTitle>
                  <AlertDialogDescription>
                    정말로 구매하시겠습니까? 구매 후에는 취소할 수 없습니다.
                    <div className="mt-4 p-3 bg-muted rounded-md">
                        <div className="font-bold">구매 목록:</div>
                        <div className="text-sm">{getCartDescription()}</div>
                        <div className="font-bold mt-2">총 사용 Lak:</div>
                        <div className="text-sm text-primary font-bold">{totalCost.toLocaleString()} Lak</div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isPurchasing}>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePurchase} disabled={isPurchasing}>
                     {isPurchasing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    확인
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
