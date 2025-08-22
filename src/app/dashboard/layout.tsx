
'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { FloatingNav } from '@/components/floating-nav';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return; // Wait until auth state is loaded
    if (!user) {
      toast({
        title: '로그인 필요',
        description: '대시보드에 접근하려면 로그인이 필요합니다.',
        variant: 'destructive',
      });
      router.push('/login');
      return;
    }
    
    // Check user role to prevent unauthorized access and redirect if necessary
    const checkRole = async () => {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const role = userDoc.data().role;
            if (role === 'admin') {
                router.push('/admin');
                return; // Redirect and stop further execution
            } else if (role === 'council') {
                router.push('/council');
                return; // Redirect and stop further execution
            } else if (role === 'teacher') {
                router.push('/teacher/rewards');
                return;
            }
        }
        // If user is not admin, council, or teacher, they can access the dashboard.
        setIsAuthorized(true);
    };
    checkRole();

  }, [user, loading, router, toast]);

  if (loading || !isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen w-full">
         <FloatingNav role="student" />
        <div className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
            <Logo />
            <div className="w-full flex-1" />
            <UserNav />
          </header>
          <motion.main 
            className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-transparent"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 10, duration: 0.3 }}
          >
            {children}
          </motion.main>
        </div>
      </div>
    </>
  );
}
