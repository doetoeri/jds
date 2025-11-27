'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, handleSignOut, markWarningAsSeen } from '@/lib/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc, onSnapshot, query, collection, where, Timestamp } from 'firebase/firestore';
import { Loader2, MessageCircleQuestion, AlertTriangle } from 'lucide-react';
import { SideNav } from '@/components/side-nav';
import { DesktopNav } from '@/components/desktop-nav';
import MaintenancePage from '../maintenance/page';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface RestrictionInfo {
    restrictedUntil: Timestamp;
    restrictionReason: string;
}

interface WarningInfo {
    oneTimeWarning: string;
    hasSeenWarning: boolean;
}

export const dynamic = 'force-dynamic';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isMaintenanceMode, setMaintenanceMode] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [restrictionInfo, setRestrictionInfo] = useState<RestrictionInfo | null>(null);
  const [warningInfo, setWarningInfo] = useState<WarningInfo | null>(null);
  const [warningConfirmText, setWarningConfirmText] = useState("");

  useEffect(() => {
    document.documentElement.className = 'theme-student';
    const maintenanceRef = doc(db, 'system_settings', 'main');
    const unsubscribe = onSnapshot(maintenanceRef, (doc) => {
        if (doc.exists()) {
            setMaintenanceMode(doc.data().isMaintenanceMode);
        }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (pathname === '/dashboard/shop') {
      setIsAuthorized(true);
      setCheckingAuth(false);
      return;
    }

    setCheckingAuth(true);
    if (loading) return; 
    if (!user) {
      toast({
        title: '로그인 필요',
        description: '대시보드에 접근하려면 로그인이 필요합니다.',
        variant: 'destructive',
      });
      setTimeout(() => router.push('/login'), 50);
      return;
    }
    
    const checkUserStatusAndSetup = async () => {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const role = userData.role;
            
            // Check for one-time warning first
            if (userData.oneTimeWarning && !userData.hasSeenWarning) {
                setWarningInfo({
                    oneTimeWarning: userData.oneTimeWarning,
                    hasSeenWarning: userData.hasSeenWarning,
                });
                setIsAuthorized(false); // Block access until warning is acknowledged
                setCheckingAuth(false);
                return;
            }

            // Check for restriction
            if (userData.restrictedUntil && userData.restrictedUntil.toMillis() > Date.now()) {
                setRestrictionInfo({
                    restrictedUntil: userData.restrictedUntil,
                    restrictionReason: userData.restrictionReason,
                });
                setIsAuthorized(false);
                setCheckingAuth(false);
                return;
            }
            
            // Role-based redirects
            if (role === 'council') {
                router.push('/council');
                return;
            }

            if (role === 'admin' || role === 'teacher') {
                setIsAuthorized(false);
                let redirectPath = '/dashboard';
                if (role === 'admin') redirectPath = '/admin';
                if (role === 'teacher') redirectPath = '/teacher/rewards';
                
                toast({
                  title: "잘못된 접근",
                  description: "현재 모드에서는 접근할 수 없는 페이지입니다.",
                  variant: "destructive"
                })
                setTimeout(() => router.push(redirectPath), 50);
                return; 
            }
        }
        setIsAuthorized(true);
        setCheckingAuth(false);
    };
    checkUserStatusAndSetup();
  }, [user, loading, router, toast, pathname]);

  const handleWarningConfirm = async () => {
    if (!user) return;
    try {
      await markWarningAsSeen(user.uid);
      setWarningInfo(null);
      setIsAuthorized(true); // Grant access after confirmation
    } catch (error) {
      toast({
        title: "오류",
        description: "경고 확인 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    }
  };


  if (loading || checkingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (warningInfo) {
    return (
        <AlertDialog open={true}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/> 관리자 경고</AlertDialogTitle>
                    <AlertDialogDescription>
                        다음은 관리자가 보낸 중요 메시지입니다. 내용을 반드시 확인해주세요.
                        <div className="mt-4 p-4 bg-muted rounded-lg text-foreground whitespace-pre-wrap">{warningInfo.oneTimeWarning}</div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                        아래 입력창에 '확인'을 입력하여 메시지를 읽었음을 알려주세요.
                    </p>
                    <Input 
                        value={warningConfirmText}
                        onChange={(e) => setWarningConfirmText(e.target.value)}
                        placeholder="'확인'을 입력하세요"
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={handleWarningConfirm} disabled={warningConfirmText !== '확인'}>확인</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
  }

  if (restrictionInfo) {
    return (
        <AlertDialog open={true}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>계정 이용 제한</AlertDialogTitle>
                    <AlertDialogDescription>
                        귀하의 계정은 관리자에 의해 이용이 제한되었습니다.
                        <div className="mt-4 space-y-2 text-foreground">
                            <p><strong>제한 기간:</strong> {restrictionInfo.restrictedUntil.toDate().toLocaleString()}까지</p>
                            <p><strong>제한 사유:</strong> {restrictionInfo.restrictionReason}</p>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button variant="outline" onClick={() => router.push('/dashboard/inquiry')}><MessageCircleQuestion className="mr-2 h-4 w-4" /> 문의하기</Button>
                    <AlertDialogAction onClick={() => handleSignOut().then(() => router.push('/login'))}>확인 및 로그아웃</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
  }

  if (isMaintenanceMode && user) {
      return <MaintenancePage />;
  }

  if (!isAuthorized) {
       return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        );
  }
  
  if (pathname === '/dashboard/shop' && !user) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-transparent">
        {children}
      </main>
    );
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <div className="hidden border-r bg-muted/40 md:flex flex-col">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <Logo />
            </div>
            <DesktopNav role="student" />
        </div>
        <div className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
            <SideNav role="student" />
            <div className="w-full flex-1" />
            <UserNav />
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-transparent">
             <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, filter: 'blur(16px)', y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, filter: 'blur(0px)', y: 0, scale: 1 }}
                  exit={{ opacity: 0, filter: 'blur(16px)', y: -30, scale: 1.05 }}
                  transition={{ duration: 0.9, ease: [0.25, 1, 0.5, 1] }}
                >
                  {children}
                </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
  );
}
