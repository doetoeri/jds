'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from '@/components/ui/card';
import { ShoppingCart, Plus, Minus, Loader2, User, ImageIcon, Sparkles, X, Coins, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { db, auth, processPosPayment } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDocs } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

interface SearchedStudent {
    displayName: string;
    lak: number;
}

export const dynamic = 'force-dynamic';

export default function CouncilPosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [studentId, setStudentId] = useState('');
  const [searchedStudent, setSearchedStudent] = useState<SearchedStudent | null>(null);
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const { toast } = useToast();
  const [user] = useAuthState(auth);

  useEffect(() => {
    const settingsRef = doc(db, 'system_settings', 'main');
    const unsubSettings = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        setGlobalDiscount(doc.data().globalDiscount ?? 0);
      }
    });
    
    const qProducts = query(collection(db, "products"));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(productsData);
      setIsLoading(false);
    });

    return () => {
        unsubSettings();
        unsubProducts();
    };
  }, []);

  useEffect(() => {
    if (studentId.length === 5 && /^\d{5}$/.test(studentId)) {
        setIsSearchingStudent(true);
        const fetchStudent = async () => {
            try {
                const q = query(collection(db, 'users'), where('studentId', '==', studentId), where('role', '==', 'student'));
                const snapshot = await getDocs(q);
                if (snapshot.empty) {
                    setSearchedStudent(null);
                    toast({ title: '조회 실패', description: '해당 학번의 학생을 찾을 수 없습니다.', variant: 'destructive' });
                } else {
                    const userData = snapshot.docs[0].data();
                    setSearchedStudent({ displayName: userData.displayName, lak: userData.lak });
                }
            } catch (error) {
                setSearchedStudent(null);
                toast({ title: '오류', description: '학생 정보 조회 중 오류가 발생했습니다.', variant: 'destructive' });
            } finally {
                setIsSearchingStudent(false);
            }
        };
        fetchStudent();
    } else {
        setSearchedStudent(null);
    }
  }, [studentId, toast]);


  const originalTotalCost = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const globallyDiscountedTotal = useMemo(() => {
      return Math.round(originalTotalCost * (1 - globalDiscount / 100));
  }, [originalTotalCost, globalDiscount]);
  
  const finalTotalCost = useMemo(() => {
    return Math.max(0, globallyDiscountedTotal - manualDiscount);
  }, [globallyDiscountedTotal, manualDiscount]);

  const addToCart = (product: Product) => {
    if (product.stock === 0) {
      toast({ title: "재고 소진", description: `'${product.name}' 상품의 재고가 모두 소진되었습니다.`, variant: 'destructive' });
      return;
    }
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
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };
  
  const updateQuantity = (productId: string, amount: number) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === productId);
      if (!existingItem) return prevCart;

      const newQuantity = existingItem.quantity + amount;

      if (newQuantity <= 0) {
        return prevCart.filter(item => item.id !== productId);
      }
      if (newQuantity > existingItem.stock) {
        toast({ title: "재고 부족", description: `'${existingItem.name}'의 재고가 부족합니다.`, variant: 'destructive' });
        return prevCart;
      }
      return prevCart.map(item => item.id === productId ? { ...item, quantity: newQuantity } : item);
    });
  };
  
  const handlePurchase = async () => {
    if (!user) {
        toast({ title: '오류', description: '로그인 정보가 없습니다.', variant: 'destructive' });
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
    
    const result = await processPosPayment(user.uid, studentId, itemsForPurchase, finalTotalCost);
    
    if (result.success) {
      toast({ title: '결제 완료!', description: result.message });
      setCart([]);
      setStudentId('');
      setManualDiscount(0);
    } else {
      toast({ title: '결제 실패', description: result.message, variant: 'destructive' });
    }
    setIsPurchasing(false);
  };

  const filteredProducts = useMemo(() => {
    const availableProducts = products.filter(p => p.stock > 0);
    if (!searchTerm) return availableProducts;
    return availableProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  return (
    <div>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center gap-2">
          <ShoppingCart className="h-6 w-6"/>
          종달매점 계산원
        </h1>
        <p className="text-muted-foreground">
          판매할 상품을 클릭하여 장바구니에 추가한 뒤, 학생의 학번을 입력하여 결제를 진행하세요.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Products Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="상품 이름으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {isLoading ? (
              Array.from({ length: 9 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-32 w-full" />
                  <CardContent className="p-4">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))
            ) : filteredProducts.length === 0 ? (
              <p className="col-span-full text-center text-muted-foreground py-16">
                {searchTerm ? '검색 결과가 없습니다.' : '판매중인 상품이 없습니다.'}
              </p>
            ) : (
              filteredProducts.map((product) => (
                <Card 
                  key={product.id} 
                  className="flex flex-col overflow-hidden cursor-pointer hover:border-primary transition-all"
                  onClick={() => addToCart(product)}
                >
                  <div className="relative w-full h-32 bg-muted">
                    {product.imageUrl ? (
                      <Image src={product.imageUrl} alt={product.name} layout="fill" objectFit="cover" />
                    ): (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-10 w-10"/>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3 flex flex-col flex-grow">
                    <div className="flex-grow">
                      <h3 className="font-bold text-base">{product.name}</h3>
                       {globalDiscount > 0 ? (
                          <div className="flex items-baseline gap-2">
                            <p className="text-sm text-muted-foreground line-through">{product.price} P</p>
                            <p className="text-base text-primary font-semibold">
                              {Math.round(product.price * (1 - globalDiscount / 100))} P
                            </p>
                          </div>
                      ) : (
                          <p className="text-sm text-primary font-semibold">{product.price} 포인트</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">남은 수량: {product.stock}개</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Checkout Panel */}
        <div className="lg:col-span-1 lg:sticky lg:top-24 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>결제 대상</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="studentId">학생 학번 (5자리)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="studentId"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="결제할 학생의 학번 입력"
                    disabled={isPurchasing}
                    required
                    className="pl-9"
                    maxLength={5}
                  />
                </div>
                 {isSearchingStudent && <div className="flex items-center text-sm text-muted-foreground pt-2"><Loader2 className="mr-2 h-4 w-4 animate-spin" />조회중...</div>}
                {searchedStudent && (
                    <div className="pt-2">
                        <div className="p-3 bg-muted rounded-lg flex justify-between items-center">
                            <span className="font-bold text-sm">{searchedStudent.displayName}</span>
                             <div className="flex items-center gap-1 font-bold text-primary">
                                <Coins className="h-4 w-4" />
                                <span>{searchedStudent.lak.toLocaleString()} P</span>
                            </div>
                        </div>
                    </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>결제 내역</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">장바구니가 비어있습니다.</p>
              ) : (
                <>
                  <div className="max-h-60 overflow-y-auto pr-2 space-y-3">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <div>
                          <p className="font-medium">{item.name}</p>
                           <p className="text-xs text-muted-foreground">{Math.round(item.price * (1 - globalDiscount / 100))} P</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                          <span className="font-bold w-5 text-center">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, 1)}><Plus className="h-3 w-3" /></Button>
                           <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(item.id)}><X className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    {globalDiscount > 0 && (
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">상품 합계</span>
                          <span className="text-muted-foreground line-through">{originalTotalCost} P</span>
                      </div>
                    )}
                     <div className="flex justify-between items-center text-base">
                        <span className="font-semibold">할인 적용 합계</span>
                        <span>{globallyDiscountedTotal} P</span>
                    </div>
                    <div className="flex justify-between items-center text-base">
                      <Label htmlFor="manual-discount" className="font-semibold flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary"/>에누리</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          id="manual-discount"
                          type="number"
                          value={manualDiscount || ''}
                          onChange={(e) => setManualDiscount(Number(e.target.value))}
                          className="w-24 h-8 text-right font-bold"
                          placeholder="할인액"
                          disabled={isPurchasing}
                        />
                        <span className="font-bold text-sm">P</span>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center font-bold text-xl">
                    <span>최종 금액:</span>
                    <span className="text-primary">{finalTotalCost} P</span>
                  </div>
                </>
              )}
            </CardContent>
            {cart.length > 0 && (
              <CardFooter>
                <Button className="w-full font-bold text-base h-12" onClick={handlePurchase} disabled={isPurchasing || !studentId || !searchedStudent}>
                  {isPurchasing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {studentId ? `${finalTotalCost} 포인트 결제하기` : '학생 학번을 입력하세요'}
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
