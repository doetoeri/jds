
'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, handleSignOut } from '@/lib/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc, onSnapshot, query, collection, where, Timestamp } from 'firebase/firestore';
import { Loader2, MessageCircleQuestion } from 'lucide-react';
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

interface RestrictionInfo {
    restrictedUntil: Timestamp;
    restrictionReason: string;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isMaintenanceMode, setMaintenanceMode] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [restrictionInfo, setRestrictionInfo] = useState<RestrictionInfo | null>(null);

  useEffect(() => {
    document.documentElement.className = 'theme-student';
    const maintenanceRef = doc(db, 'system_settings', 'main');
    const unsubscribe = onSnapshot(maintenanceRef, (doc) => {
        if (doc.exists()) {
            setMaintenanceMode(doc.data().isMaintenanceMode);
        } else {
            setMaintenanceMode(false);
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
    
    const checkRoleAndSetupNotifications = async () => {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const role = userData.role;

            if (userData.restrictedUntil && userData.restrictedUntil.toMillis() > Date.now()) {
                setRestrictionInfo({
                    restrictedUntil: userData.restrictedUntil,
                    restrictionReason: userData.restrictionReason,
                });
                setIsAuthorized(false);
                setCheckingAuth(false);
                return;
            }
            
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
            
            if ((role === 'council') && userData.memo && 'Notification' in window) {
                if (Notification.permission === 'granted') {
                    const notificationsQuery = query(
                        collection(db, 'notifications'),
                        where('roleCode', '==', userData.memo),
                        where('createdAt', '>', Timestamp.now())
                    );
                    
                    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
                        snapshot.docChanges().forEach((change) => {
                            if (change.type === 'added') {
                                const notificationData = change.doc.data();
                                new Notification(`호출: ${notificationData.roleCode}`, {
                                    body: notificationData.message,
                                    icon: '/logo-192.png',
                                });
                            }
                        });
                    });
                    return () => unsubscribeNotifications();
                }
            }
        }
        setIsAuthorized(true);
        setCheckingAuth(false);
    };
    checkRoleAndSetupNotifications();
  }, [user, loading, router, toast, pathname]);

  if (loading || checkingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
