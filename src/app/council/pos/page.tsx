
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ShoppingCart, Plus, Minus, Loader2, User, ImageIcon, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { db, auth, processPosPayment } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

interface Operator {
    id: string;
    name: string;
}

export default function CouncilPosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const { toast } = useToast();
  const [user] = useAuthState(auth);

  useEffect(() => {
    const qProducts = query(collection(db, "products"), where("stock", ">", 0));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(productsData);
      setIsLoading(false);
    });

    const qOperators = query(collection(db, "users"), where("role", "in", ["council", "council_booth"]));
    const unsubOperators = onSnapshot(qOperators, (snapshot) => {
        const opsData = snapshot.docs.map(doc => ({id: doc.id, name: doc.data().name || doc.data().displayName } as Operator));
        setOperators(opsData);
    });

    return () => {
        unsubProducts();
        unsubOperators();
    };
  }, []);

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
    if (!selectedOperatorId) {
      toast({ title: '오류', description: '계산원(운영자)을 선택해주세요.', variant: 'destructive' });
      return;
    }
    if (!studentId || !/^\d{5}$/.test(studentId)) {
      toast({ title: '입력 오류', description: '올바른 학생 학번 5자리를 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (cart.length === 0) {
      toast({ title: '장바구니 비어있음', description: '판매할 상품을 선택해주세요.', variant: 'destructive' });
      return;
    }

    setIsPurchasing(true);
    
    const itemsForPurchase = cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
    }));
    
    const result = await processPosPayment(selectedOperatorId, studentId, itemsForPurchase, totalCost);
    
    if (result.success) {
      toast({ title: '결제 완료!', description: result.message });
      setCart([]);
      setStudentId('');
    } else {
      toast({ title: '결제 실패', description: result.message, variant: 'destructive' });
    }
    setIsPurchasing(false);
  };

  const isOperatorSelected = !!selectedOperatorId;

  return (
    <div className="pb-48">
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center gap-2">
            <ShoppingCart className="h-6 w-6"/>
            종달매점 계산원
        </h1>
        <p className="text-muted-foreground">
            운영자를 선택하고, 상품을 선택한 뒤 학생의 학번을 입력하여 결제를 진행하세요.
        </p>
      </div>
      
       <Card className="mb-6">
            <CardHeader>
                <CardTitle>계산원 및 결제 대상</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label htmlFor="operator">계산원(운영자)</Label>
                    <Select value={selectedOperatorId} onValueChange={setSelectedOperatorId}>
                      <SelectTrigger id="operator">
                        <SelectValue placeholder="계산원을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map(op => (
                            <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="studentId">학생 학번 (5자리)</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="studentId"
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                          placeholder="결제할 학생의 학번 입력"
                          disabled={isPurchasing || !isOperatorSelected}
                          required
                          className="pl-9"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${!isOperatorSelected ? 'opacity-50 pointer-events-none' : ''}`}>
        {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)
        ) : products.length === 0 ? (
            <p className="col-span-full text-center text-muted-foreground py-16">판매중인 상품이 없습니다.</p>
        ) : (
            products.map((product) => (
              <Card key={product.id} className="flex flex-col overflow-hidden">
                <div className="relative w-full h-32 bg-muted">
                    {product.imageUrl ? (
                        <Image src={product.imageUrl} alt={product.name} layout="fill" objectFit="cover" />
                    ): (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-10 w-10"/>
                        </div>
                    )}
                </div>
                <CardContent className="p-4 flex flex-col flex-grow">
                  <div className="flex-grow">
                    <h3 className="font-bold text-lg">{product.name}</h3>
                    <p className="text-sm text-primary font-semibold">{product.price} 포인트</p>
                    <p className="text-xs text-muted-foreground">남은 수량: {product.stock}개</p>
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => removeFromCart(product.id)} disabled={!cart.some(item => item.id === product.id) || isPurchasing}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-bold w-10 text-center text-lg">{cart.find(item => item.id === product.id)?.quantity || 0}</span>
                    <Button variant="outline" size="icon" onClick={() => addToCart(product)} disabled={isPurchasing}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
        )}
      </div>

       {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 md:left-[220px] lg:left-[280px] bg-background/80 backdrop-blur-sm border-t p-4 shadow-lg">
          <div className="container mx-auto max-w-6xl">
            <h3 className="text-lg font-semibold mb-2">결제 내역</h3>
            <div className="max-h-32 overflow-y-auto pr-2">
                {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm mb-1">
                        <span>{item.name} x{item.quantity}</span>
                        <span>{item.price * item.quantity} 포인트</span>
                    </div>
                ))}
            </div>
            <Separator className="my-2"/>
            <div className="flex justify-between items-center font-bold text-xl">
              <span>총 금액:</span>
              <span>{totalCost} 포인트</span>
            </div>
            <Button className="w-full mt-3 font-bold text-base h-12" onClick={handlePurchase} disabled={isPurchasing || !studentId || !isOperatorSelected}>
              {isPurchasing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!isOperatorSelected ? '계산원을 먼저 선택해주세요' : studentId ? `${studentId} 학생 / ${totalCost} 포인트 결제하기` : '학생 학번을 입력하세요'}
            </Button>
          </div>
        </div>
       )}
    </div>
  );
}
