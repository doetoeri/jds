
'use client';

import { useState, type ReactNode, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DashboardNav } from '@/components/dashboard-nav';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { doc, getDoc } from 'firebase/firestore';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r bg-muted/40 md:block">
          <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
              <Logo />
            </div>
            <div className="flex-1">
              <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                <DashboardNav />
              </nav>
            </div>
          </div>
        </aside>
        <div className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col">
                <SheetHeader>
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                </SheetHeader>
                <nav className="grid gap-2 text-lg font-medium">
                  <div className="mb-4">
                    <Logo />
                  </div>
                  <DashboardNav />
                </nav>
              </SheetContent>
            </Sheet>
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
