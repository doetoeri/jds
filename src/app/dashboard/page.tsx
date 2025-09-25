
'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Coins, Mail, QrCode, Gift, Users, Megaphone, Share2, Award, Trophy, Info, Instagram } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where, orderBy, limit, getDocs, Timestamp, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import Image from 'next/image';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { toPng } from 'html-to-image';
import { MateCodeShareCard } from '@/components/mate-code-share-card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface NewUpdate {
  title: string;
  link: string;
  icon: React.ElementType;
}

const POINT_THRESHOLDS = [
    { threshold: 100, label: '영광의 뱃지', icon: Trophy, color: 'text-amber-400' },
    { threshold: 50, label: '빛나는 뱃지', icon: Award, color: 'text-slate-400' },
    { threshold: 25, label: '반짝이는 뱃지', icon: Gift, color: 'text-amber-600' }
];

export default function DashboardPage() {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState<{ lak?: number; mateCode?: string; displayName?: string; avatarGradient?: string; piggyBank?: number } | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [newUpdate, setNewUpdate] = useState<NewUpdate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unusedHiddenCodeCount, setUnusedHiddenCodeCount] = useState<number | null>(null);
  const { toast } = useToast();
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);


  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, async (userDocSnap) => {
      setIsLoading(true);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        setUserData({
            lak: data.lak ?? 0,
            mateCode: data.mateCode,
            displayName: data.displayName,
            avatarGradient: data.avatarGradient,
            piggyBank: data.piggyBank ?? 0,
        });
        
        if (data.mateCode && data.mateCode !== userData?.mateCode) {
          try {
            const url = await QRCode.toDataURL(data.mateCode, { width: 200, margin: 2 });
            setQrCodeUrl(url);
          } catch (err) {
            console.error("QR Code generation failed:", err);
            setQrCodeUrl(null);
          }
        }
      } else {
        setUserData({ lak: 0, mateCode: null });
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching user data:", error);
      setIsLoading(false);
    });

    return () => unsubscribeUser();
  }, [user]);
  
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
        if (!userData?.mateCode) return;
    
        const shareData = {
          title: '종달샘 허브 메이트코드',
          text: `종달샘 허브에서 함께 포인트 받자! 🙌\n내 코드: ${userData.mateCode}\n`,
          url: 'https://jongdalsam.shop',
        };
    
        try {
          if (navigator.share && typeof navigator.share === 'function') {
            await navigator.share(shareData);
          } else {
            await navigator.clipboard.writeText(`${shareData.text}${shareData.url}`);
            toast({
              title: '클립보드에 복사 완료!',
              description: '메이트코드와 초대 메시지가 클립보드에 복사되었어요.',
            });
          }
        } catch (error: any) {
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

    const handleInstagramShare = async () => {
        if (!shareCardRef.current || !userData) return;
        setIsSharing(true);

        try {
            const dataUrl = await toPng(shareCardRef.current, { cacheBust: true, pixelRatio: 2 });
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], "jongdalsam_matecode.png", { type: "image/png" });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: '나의 종달샘 메이트코드',
                    text: `종달샘 허브에서 함께 포인트를 모아봐요!\n내 코드: ${userData.mateCode}`,
                });
            } else {
                 const link = document.createElement('a');
                 link.download = 'jongdalsam_matecode.png';
                 link.href = dataUrl;
                 link.click();
                 toast({
                    title: "이미지 다운로드 완료",
                    description: "다운로드된 이미지를 인스타그램에 공유해주세요!",
                 });
            }

        } catch (err: any) {
            console.error(err);
            toast({ title: "이미지 생성 오류", description: "공유 이미지 생성에 실패했습니다.", variant: "destructive" });
        } finally {
            setIsSharing(false);
        }
    };

    const currentBadge = POINT_THRESHOLDS.find(b => (userData?.lak || 0) >= b.threshold);

  return (
    <>
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
                <>
                <div className="text-2xl font-bold">{userData?.lak?.toLocaleString() ?? 0} 포인트</div>
                 {currentBadge && (
                    <p className={`flex items-center text-xs mt-1 font-semibold ${currentBadge.color}`}>
                        <currentBadge.icon className="w-3.5 h-3.5 mr-1" />
                        {currentBadge.label}
                    </p>
                )}
                </>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              초과 포인트 저금통: {userData?.piggyBank?.toLocaleString() ?? 0} 포인트
            </p>
          </CardContent>
        </Card>
        
        <Card className="animate-in fade-in duration-500 bg-primary/10 border-primary/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-primary">종달새의 선물</CardTitle>
                <Gift className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
                {unusedHiddenCodeCount === null ? (
                    <Skeleton className="h-8 w-20" />
                ) : (
                    <div className="text-2xl font-bold text-primary">{unusedHiddenCodeCount} 개</div>
                )}
                <p className="text-xs text-primary/80">
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
            ) : userData?.mateCode && qrCodeUrl ? (
              <>
                <Image src={qrCodeUrl} alt="Mate Code QR" width={120} height={120} />
                <div className="text-center">
                   <p className="font-mono text-2xl font-bold">{userData.mateCode}</p>
                   <p className="text-xs text-muted-foreground">친구에게 코드를 공유하고 함께 포인트를 받으세요!</p>
                </div>
                 <div className="flex gap-2">
                    <Button onClick={handleShare} size="sm" variant="outline" disabled={isSharing}>
                        <Share2 className="mr-2 h-4 w-4" />
                        일반 공유
                    </Button>
                    <Button onClick={handleInstagramShare} size="sm" disabled={isSharing}>
                        {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Instagram className="mr-2 h-4 w-4" />}
                        인스타그램 스토리 카드
                    </Button>
                 </div>
              </>
            ) : (
               <p className="text-sm text-muted-foreground py-10 text-center">메이트 코드를 불러올 수 없습니다.</p>
            )}
          </CardContent>
        </Card>
         <Alert className="md:col-span-2 lg:col-span-3">
            <Info className="h-4 w-4"/>
            <AlertTitle>인스타그램으로 공유하는 법</AlertTitle>
            <AlertDescription>
                <ul className="list-disc pl-4 space-y-1 mt-2">
                    <li><strong>모바일:</strong> '인스타그램 스토리 카드' 버튼을 누르면 공유 창이 나타납니다. 여기서 'Instagram' 앱의 '스토리' 또는 '피드'를 선택하여 바로 공유할 수 있습니다.</li>
                    <li><strong>PC:</strong> '인스타그램 스토리 카드' 버튼을 누르면 공유용 이미지가 컴퓨터에 다운로드됩니다. 인스타그램 웹사이트에 접속하여 다운로드된 이미지를 직접 업로드해주세요.</li>
                </ul>
            </AlertDescription>
        </Alert>
      </div>
    </div>
    <div className="absolute -left-[9999px] top-0">
        {userData && qrCodeUrl && (
          <MateCodeShareCard
            ref={shareCardRef}
            displayName={userData.displayName || '학생'}
            mateCode={userData.mateCode || ''}
            qrCodeUrl={qrCodeUrl}
            avatarGradient={userData.avatarGradient || 'orange'}
          />
        )}
      </div>
    </>
  );
}
