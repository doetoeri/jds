
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, Mail, QrCode, Gift, Users, Megaphone, Share2 } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where, orderBy, limit, getDocs, Timestamp, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import Image from 'next/image';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();


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

    const handleShare = async () => {
        if (!mateCode) return;
    
        const shareData = {
          title: '종달샘 허브 메이트코드 공유',
          text: `💌 종달샘 허브 메이트코드로 함께 포인트 받아요!\n\n제 메이트 코드는 [ ${mateCode} ] 입니다.\n\n✅ 사용 방법:\n1️⃣ 아래 링크를 통해 '종달샘 허브'에 접속\n2️⃣ 회원가입 시 추천인 코드에 입력하거나,\n3️⃣ 로그인 후 '코드 사용' 메뉴에서 입력\n\n⬇️ 종달샘 허브 바로가기 ⬇️\n`,
          url: 'https://jongdalsam.shop',
        };
    
        try {
          if (navigator.share) {
            await navigator.share(shareData);
          } else {
            // Fallback for desktop browsers
            await navigator.clipboard.writeText(`${shareData.text}${shareData.url}`);
            toast({
              title: '클립보드에 복사 완료!',
              description: '메이트코드와 초대 메시지가 클립보드에 복사되었어요.',
            });
          }
        } catch (error: any) {
            // Silently ignore AbortError/NotAllowedError which occurs when the user cancels the share sheet
            if (error.name === 'AbortError' || error.name === 'NotAllowedError') {
              return;
            }
            console.error('Error sharing:', error);
            toast({
              title: '공유 실패',
              description: '코드를 공유하는 중 오류가 발생했습니다.',
              variant: 'destructive',
            });
        }
      };


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">대시보드</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">나의 포인트</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{lakBalance?.toLocaleString() ?? 0} 포인트</div>
            )}
            <p className="text-xs text-muted-foreground">
              (1 포인트 = 약 500원)
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
                   <p className="text-xs text-muted-foreground">친구에게 코드를 공유하고 함께 포인트를 받으세요!</p>
                </div>
                 <Button onClick={handleShare} size="sm" variant="outline">
                    <Share2 className="mr-2 h-4 w-4" />
                    공유하기
                </Button>
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
