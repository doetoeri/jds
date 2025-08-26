
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, Mail, QrCode, Gift, Users, Megaphone } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where, orderBy, limit, getDocs, Timestamp, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import Image from 'next/image';
import QRCode from 'qrcode';

interface NewUpdate {
  title: string;
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
  
  // Effect for checking new announcements
    useEffect(() => {
        if (!user) return;

        const userDocRef = doc(db, 'users', user.uid);

        const checkNewAnnouncements = async () => {
            const userDocSnap = await getDoc(userDocRef);
            if (!userDocSnap.exists()) return;

            const userData = userDocSnap.data();
            const lastCheck = userData.lastLetterCheckTimestamp || new Timestamp(0, 0);

            const announcementsQuery = query(
                collection(db, 'announcements'),
                orderBy('createdAt', 'desc'),
                limit(1)
            );

            const announcementsSnapshot = await getDocs(announcementsQuery);
            if (!announcementsSnapshot.empty) {
                const latestAnnouncement = announcementsSnapshot.docs[0].data();
                if (latestAnnouncement.createdAt.toMillis() > lastCheck.toMillis()) {
                    setNewUpdate({
                        title: `새로운 소식: ${latestAnnouncement.title}`,
                        link: '/dashboard/releases',
                        icon: Megaphone,
                    });
                } else {
                    setNewUpdate(null);
                }
            } else {
                setNewUpdate(null);
            }
        };

        checkNewAnnouncements();
        const unsubscribe = onSnapshot(collection(db, 'announcements'), checkNewAnnouncements);

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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">대시보드</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                    <CardTitle className="text-sm font-medium text-primary">알림</CardTitle>
                    <newUpdate.icon className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-lg font-bold text-primary">{newUpdate.title}</div>
                    <p className="text-xs text-primary/80">
                      탭하여 자세히 보기
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
