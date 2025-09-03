
'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { usePathname, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Loader2 } from 'lucide-react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { SideNav } from '@/components/side-nav';
import { DesktopNav } from '@/components/desktop-nav';
import MaintenancePage from '../maintenance/page';

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [user, loading] = useAuthState(auth);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isMaintenanceMode, setMaintenanceMode] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const maintenanceRef = doc(db, 'system_settings', 'maintenance');
    const unsubscribe = onSnapshot(maintenanceRef, (doc) => {
        if (doc.exists()) {
            setMaintenanceMode(doc.data().isMaintenanceMode);
        }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkAuthorization = async () => {
      setCheckingAuth(true);
      if (loading) return;
      if (!user) {
        toast({
          title: '로그인 필요',
          description: '로그인이 필요한 페이지입니다.',
          variant: 'destructive',
        });
        setTimeout(() => router.push('/login'), 50);
        return;
      }

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists() && userDocSnap.data().role === 'teacher') {
        setIsAuthorized(true);
      } else {
        toast({
          title: '접근 권한 없음',
          description: '교직원만 접근할 수 있는 페이지입니다.',
          variant: 'destructive',
        });
        setIsAuthorized(false);
        setTimeout(() => router.push('/dashboard'), 50);
      }
      setCheckingAuth(false);
    };
    checkAuthorization();
  }, [user, loading, router, toast]);

  if (loading || checkingAuth) {
    return (
       <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    )
  }

  if (isMaintenanceMode) {
      return <MaintenancePage />;
  }
  
  if (!isAuthorized) {
    return (
       <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
       <div className="hidden border-r bg-muted/40 md:flex flex-col">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <Logo />
            </div>
            <DesktopNav role="teacher" />
        </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <SideNav role="teacher" />
          <div className="w-full flex-1" />
          <UserNav />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-transparent">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
