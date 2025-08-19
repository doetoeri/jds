'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Coins, Mail, QrCode } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import Image from 'next/image';
import QRCode from 'qrcode';

export default function DashboardPage() {
  const [user] = useAuthState(auth);
  const [lakBalance, setLakBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mateCode, setMateCode] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isCodeLoading, setIsCodeLoading] = useState(true);

  // New state to always show the "new letter" card as a static prompt
  const [hasNewLetters, setHasNewLetters] = useState(true);

  useEffect(() => {
    let unsubscribeUser = () => {};

    if (user) {
      setIsLoading(true);
      setIsCodeLoading(true);
      
      const userDocRef = doc(db, 'users', user.uid);
      
      unsubscribeUser = onSnapshot(userDocRef, async (userDocSnap) => {
        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setLakBalance(userData.lak);
            
            if (userData.mateCode) {
                const code = userData.mateCode;
                setMateCode(code);
                try {
                    const url = await QRCode.toDataURL(code, { width: 200, margin: 2 });
                    setQrCodeUrl(url);
                } catch (err) {
                    console.error("QR Code generation failed:", err);
                    setQrCodeUrl(null);
                }
            } else {
                 setMateCode(null);
                 setQrCodeUrl(null);
            }
        } else {
          setLakBalance(0);
          setMateCode(null);
        }
        setIsLoading(false);
        setIsCodeLoading(false);
      }, (error) => {
        console.error("Error fetching user data:", error);
        setIsLoading(false);
        setIsCodeLoading(false);
      });

      return () => {
        unsubscribeUser();
      };
    } else {
        setIsLoading(false);
        setIsCodeLoading(false);
    }
  }, [user]);

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight font-headline">대시보드</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">나의 Lak</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{lakBalance?.toLocaleString() ?? 0} Lak</div>
            )}
            <p className="text-xs text-muted-foreground">
              (1 라크 = 500원)
            </p>
          </CardContent>
        </Card>
        
        {hasNewLetters && (
            <Link href="/dashboard/letters?tab=inbox" className="block animate-in fade-in slide-in-from-bottom-5 duration-500">
                <Card className="bg-primary/10 border-primary/30 hover:bg-primary/20 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-primary">새로운 소식</CardTitle>
                    <Mail className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-xl font-bold text-primary">도착한 편지가 있을 수 있어요!</div>
                    <p className="text-xs text-primary/80">
                      지금 바로 받은 편지함을 확인해보세요.
                    </p>
                </CardContent>
                </Card>
            </Link>
        )}

        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">나의 메이트 코드</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-4 gap-4">
             {isCodeLoading ? (
              <>
                <Skeleton className="h-[120px] w-[120px]" />
                <Skeleton className="h-6 w-24" />
              </>
            ) : mateCode && qrCodeUrl ? (
              <>
                <Image src={qrCodeUrl} alt="Mate Code QR" width={120} height={120} />
                <div className="text-center">
                   <p className="font-mono text-2xl font-bold">{mateCode}</p>
                   <p className="text-xs text-muted-foreground">친구에게 코드를 공유하고 함께 Lak을 받으세요!</p>
                </div>
              </>
            ) : (
               <p className="text-sm text-muted-foreground py-10 text-center">메이트 코드를 불러올 수 없습니다.</p>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
