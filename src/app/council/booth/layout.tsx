
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

export default function CouncilBoothLayout({ children }: { children: ReactNode }) {
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
        const role = userDocSnap.data().role;
        if (role === 'council' || role === 'council_booth') {
          setIsAuthorized(true);
        } else {
          toast({
            title: '접근 권한 없음',
            description: '학생회 계정만 접근할 수 있는 페이지입니다.',
            variant: 'destructive',
          });
          setIsAuthorized(false);
          // Redirect to the correct dashboard based on role
          let redirectPath = '/dashboard';
          if (role === 'admin') redirectPath = '/admin';
          if (role === 'teacher') redirectPath = '/teacher/rewards';
          setTimeout(() => router.push(redirectPath), 50);
        }
      } else {
         toast({
            title: '오류',
            description: '사용자 정보를 찾을 수 없습니다.',
            variant: 'destructive',
          });
          setIsAuthorized(false);
          setTimeout(() => router.push('/login'), 50);
      }
    };
    checkAuthorization();
  }, [user, loading, router, toast]);

  if (loading || !isAuthorized) {
    return (
       <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Logo isCouncil />
          <div className="w-full flex-1" />
          <UserNav />
        </header>
        <main className="flex flex-1 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
  );
}
