

'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PiggyBank, PartyPopper, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

function PiggyBankContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const amount = searchParams.get('amount') || '0';

  return (
    <div className="flex items-center justify-center min-h-screen bg-background/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 100, duration: 0.5 }}
      >
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, -10, 10, -10, 0] }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 10 }}
            >
              <PiggyBank className="h-20 w-20 mx-auto text-primary" />
            </motion.div>
            <CardTitle className="text-2xl font-bold font-headline mt-4">초과 포인트 저금 완료!</CardTitle>
            <CardDescription>포인트 한도를 초과하여 저금통에 안전하게 적립되었습니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">이번에 저금된 포인트</p>
              <p className="text-3xl font-bold text-primary">{parseInt(amount).toLocaleString()} P</p>
            </div>
            <div className="text-xs text-muted-foreground text-left bg-secondary/50 p-3 rounded-md space-y-1">
                <p><strong>- 일일 획득 한도:</strong> 하루에 게임, 코드 사용 등으로 얻을 수 있는 포인트는 <strong>최대 15포인트</strong>입니다.</p>
                <p><strong>- 최대 보유 한도:</strong> 현재 보유할 수 있는 포인트는 <strong>최대 25포인트</strong>입니다.</p>
                <p className="pt-2">💡 <strong>팁:</strong> 상점에서 포인트를 사용하면 다시 포인트를 획득할 수 있습니다!</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full font-bold" onClick={() => router.push('/dashboard')}>
              <CheckCircle className="mr-2 h-4 w-4" />
              확인했습니다
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}

export default function PiggyBankPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
            <PiggyBankContent />
        </Suspense>
    )
}
