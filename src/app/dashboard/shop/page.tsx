'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { ShoppingCart, Hourglass } from 'lucide-react';

export default function ShopPage() {
  return (
    <div className="w-full">
      <CardHeader className="px-0">
        <CardTitle className="font-headline text-3xl flex items-center gap-2">
          <ShoppingCart className="h-8 w-8" />
          종달 상점
        </CardTitle>
        <CardDescription>보유한 Lak으로 원하는 상품을 구매하세요.</CardDescription>
      </CardHeader>
      
      <Card className="mt-6">
        <CardContent className="pt-6 flex flex-col items-center justify-center text-center h-64 gap-4">
            <Hourglass className="h-16 w-16 text-muted-foreground/50" />
            <div className="space-y-1">
                <p className="text-xl font-headline text-muted-foreground">추후 공개될 예정입니다.</p>
                <p className="text-muted-foreground">곧 만나요!</p>
            </div>
        </CardContent>
      </Card>

    </div>
  );
}
