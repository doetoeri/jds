
'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc, onSnapshot, query, collection, where, Timestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { SideNav } from '@/components/side-nav';
import { DesktopNav } from '@/components/desktop-nav';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
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
            const role = userDoc.data().role;
            // Allow student and council roles, redirect others
            if (role === 'admin' || role === 'teacher' || role === 'council_booth') {
                setIsAuthorized(false);
                let redirectPath = '/dashboard';
                if (role === 'admin') redirectPath = '/admin';
                if (role === 'teacher') redirectPath = '/teacher/rewards';
                if (role === 'council_booth') redirectPath = '/council/booth';
                
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
        
        // Setup notifications listener
        const userDocData = userDoc.data();
        if (!userDocData) return;

        const lastCheck = userDocData.lastLetterCheckTimestamp || new Timestamp(0, 0);

        const q = query(
          collection(db, 'letters'),
          where('receiverStudentId', '==', userDocData.studentId),
          where('status', '==', 'approved'),
          where('approvedAt', '>', lastCheck)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const letter = change.doc.data();
                    new Notification('새로운 편지가 도착했어요!', {
                        body: `${letter.senderStudentId}님으로부터 편지가 도착했습니다.`,
                        icon: '/logo-192.png',
                    });
                }
            });
        });

        return () => unsubscribe();
    };

    checkRoleAndSetupNotifications();

  }, [user, loading, router, toast]);

  if (loading || !isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
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
