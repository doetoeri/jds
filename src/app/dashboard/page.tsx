'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, Mail, QrCode, Gift, Users } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import Image from 'next/image';
import QRCode from 'qrcode';

interface NewUpdate {
  type: 'friend' | 'letter';
  message: string;
  link: string;
  icon: React.ElementType;
}

export default function DashboardPage() {
  const [user] = useAuthState(auth);
  const [lakBalance, setLakBalance] = useState<number | null>(null);
  const [mateCode, setMateCode] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [newUpdate, setNewUpdate] = useState<NewUpdate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMateCode, setCurrentMateCode] = useState<string | null>(null);
  const [unusedHiddenCodeCount, setUnusedHiddenCodeCount] = useState<number | null>(null);


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
  
  // Effect for checking new updates (friends, letters)
    useEffect(() => {
        if (!user) return;

        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribe = onSnapshot(userDocRef, async (userDocSnap) => {
            if (!userDocSnap.exists()) {
                setNewUpdate(null);
                return;
            }

            const userData = userDocSnap.data();
            const studentId = userData.studentId;
            const lastCheckTimestamp = userData.lastLetterCheckTimestamp || new Timestamp(0, 0);

            // 1. Check for new friends (highest priority)
            const friendsQuery = query(
                collection(db, 'codes'),
                where('type', '==', '메이트코드'),
                where('participants', 'array-contains', studentId),
                where('lastUsedAt', '>', lastCheckTimestamp)
            );
            
            const friendsSnapshot = await getDocs(friendsQuery);
            if (!friendsSnapshot.empty) {
                const newFriendActivities = friendsSnapshot.docs.filter(doc => (doc.data().lastUsedAt.seconds > lastCheckTimestamp.seconds));
                if (newFriendActivities.length > 0) {
                     setNewUpdate({
                        type: 'friend',
                        message: '새로운 친구가 생겼어요!',
                        link: '/dashboard/friends',
                        icon: Users
                    });
                    return; // New friend found, stop checking for other updates
                }
            }
            
            // 2. If no new friends, check for new letters
            const lettersQuery = query(
                collection(db, 'letters'),
                where('receiverStudentId', '==', studentId),
                where('status', '==', 'approved')
            );
            
            const lettersSnapshot = await getDocs(lettersQuery);
            const newLetters = lettersSnapshot.docs.filter(doc => {
                 const approvedAt = doc.data().approvedAt as Timestamp;
                 return approvedAt && approvedAt.toMillis() > lastCheckTimestamp.toMillis();
            });

            if (newLetters.length > 0) {
                setNewUpdate({
                    type: 'letter',
                    message: '새로운 편지가 도착했어요!',
                    link: '/dashboard/letters?tab=inbox',
                    icon: Mail
                });
            } else {
                setNewUpdate(null);
            }
        });

        return () => unsubscribe();
    }, [user]);


  // Effect for counting unused Hidden codes
    useEffect(() => {
        const q = query(
            collection(db, "codes"),
            where("type", "==", "히든코드"),
            where("used", "==", false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setUnusedHiddenCodeCount(snapshot.size);
        }, (error) => {
            console.error("Error fetching unused code count:", error);
            setUnusedHiddenCodeCount(0);
        });

        return () => unsubscribe();
    }, []);


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
        
        <Card className="animate-in fade-in duration-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">종달새의 선물</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {unusedHiddenCodeCount === null ? (
                    <Skeleton className="h-8 w-20" />
                ) : (
                    <div className="text-2xl font-bold">{unusedHiddenCodeCount} 개</div>
                )}
                <p className="text-xs text-muted-foreground">
                    학교 어딘가에 숨겨진 코드를 찾아보세요!
                </p>
            </CardContent>
        </Card>
        
        {newUpdate && (
             <Link href={newUpdate.link} className="block">
                <Card className="bg-primary/10 border-primary/30 hover:bg-primary/20 transition-colors animate-highlight-pulse">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-primary">새로운 소식</CardTitle>
                    <newUpdate.icon className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-xl font-bold text-primary">{newUpdate.message}</div>
                    <p className="text-xs text-primary/80">
                      지금 바로 확인해보세요.
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
