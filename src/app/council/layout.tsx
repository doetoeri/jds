
'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { usePathname, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { SideNav } from '@/components/side-nav';
import { DesktopNav } from '@/components/desktop-nav';


export default function CouncilLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [user, loading] = useAuthState(auth);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuthorization = async () => {
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

      if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.role === 'council') {
              setIsAuthorized(true);
          } else {
            // This user does not have council role, redirect them to their correct dashboard.
            setIsAuthorized(false);
            let redirectPath = '/dashboard';
            if (userData.role === 'admin') redirectPath = '/admin';
            else if (userData.role === 'teacher') redirectPath = '/teacher/rewards';
            else if (userData.role === 'council_booth') redirectPath = '/council/booth';
            
            toast({
              title: '접근 권한 없음',
              description: '학생회만 접근할 수 있는 페이지입니다.',
              variant: 'destructive',
            });
            setTimeout(() => router.push(redirectPath), 50);
          }
      } else {
        // Fallback for users that might exist in auth but not firestore for some reason
        setIsAuthorized(false);
        toast({
          title: '접근 권한 없음',
          description: '학생회만 접근할 수 있는 페이지입니다.',
          variant: 'destructive',
        });
        setTimeout(() => router.push('/dashboard'), 50);
      }
    };
    checkAuthorization();
  }, [user, loading, router, toast, pathname]);

  if (loading || !isAuthorized) {
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
                <Logo isCouncil />
            </div>
            <DesktopNav role="council" />
        </div>
        <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <SideNav role="council" />
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
