'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, Mail, QrCode } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import Image from 'next/image';
import QRCode from 'qrcode';

export default function DashboardPage() {
  const [user] = useAuthState(auth);
  const [lakBalance, setLakBalance] = useState<number | null>(null);
  const [mateCode, setMateCode] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [hasNewLetters, setHasNewLetters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMateCode, setCurrentMateCode] = useState<string | null>(null);


  // Effect for user data (lak, mateCode)
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, async (userDocSnap) => {
      setIsLoading(true);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        setLakBalance(userData.lak ?? 0);
        
        // Update mateCode and QR code only if it has changed
        if (userData.mateCode && userData.mateCode !== currentMateCode) {
          const code = userData.mateCode;
          setCurrentMateCode(code);
          setMateCode(code);
          try {
            const url = await QRCode.toDataURL(code, { width: 200, margin: 2 });
            setQrCodeUrl(url);
          } catch (err) {
            console.error("QR Code generation failed:", err);
            setQrCodeUrl(null);
          }
        } else if (!userData.mateCode) {
          setMateCode(null);
          setQrCodeUrl(null);
        }
      } else {
        setLakBalance(0);
        setMateCode(null);
        setQrCodeUrl(null);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching user data:", error);
      setIsLoading(false);
    });

    return () => unsubscribeUser();
  }, [user, currentMateCode]);

  // Effect for checking new letters
  useEffect(() => {
    if (!user) return;
    
    let unsubscribeLetters = () => {};
    
    const userDocRef = doc(db, 'users', user.uid);

    // This outer snapshot gets the studentId first
    const unsubscribeUser = onSnapshot(userDocRef, (userDocSnap) => {
        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const lastCheckTimestamp = userData.lastLetterCheckTimestamp || null;

            const lettersQuery = query(
              collection(db, 'letters'),
              where('receiverStudentId', '==', userData.studentId),
              where('status', '==', 'approved'),
              orderBy('approvedAt', 'desc'),
              limit(1)
            );
            
            // This inner snapshot checks for new letters
            unsubscribeLetters = onSnapshot(lettersQuery, (querySnapshot) => {
                if (!querySnapshot.empty) {
                    const latestLetter = querySnapshot.docs[0].data();
                    if (lastCheckTimestamp && latestLetter.approvedAt) {
                        setHasNewLetters(latestLetter.approvedAt.toMillis() > lastCheckTimestamp.toMillis());
                    } else if (latestLetter.approvedAt) {
                        // If user has never checked, any letter is new
                        setHasNewLetters(true); 
                    } else {
                        setHasNewLetters(false);
                    }
                } else {
                    setHasNewLetters(false);
                }
            });
        }
    });

    return () => {
        unsubscribeUser();
        unsubscribeLetters();
    };
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
                    <div className="text-xl font-bold text-primary">확인하지 않은 편지가 있어요!</div>
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
             {isLoading ? (
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
