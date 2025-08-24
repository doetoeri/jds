
'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { usePathname, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Loader2, Award, Power } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { SideNav } from '@/components/side-nav';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useLogout } from '@/hooks/use-logout';

export default function TeacherLayout({ children }: { children: ReactNode }) {
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
        setTimeout(() => router.push('/login'), 300);
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
        setTimeout(() => router.push('/dashboard'), 300);
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
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <DesktopNav role="teacher" />
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
              exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
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


function DesktopNav({ role }: { role: 'teacher' }) {
    const pathname = usePathname();
    const { handleLogout, isLoggingOut } = useLogout();
    const links = teacherLinks;

    const NavLink = ({ name, href, icon: Icon }: { name: string; href: string; icon: React.ElementType }) => {
        const isActive = pathname === href;
        return (
            <Link href={href} className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                isActive && "bg-muted text-primary"
            )}>
                <Icon className="h-4 w-4" />
                {name}
            </Link>
        )
    }

    return (
        <div className="hidden border-r bg-muted/40 md:block">
            <div className="flex h-full max-h-screen flex-col gap-2">
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <Logo />
                </div>
                <div className="flex-1 overflow-y-auto">
                    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                        {links.map((link) => (
                          <NavLink key={link.href} {...link} />
                        ))}
                    </nav>
                </div>
                 <div className="mt-auto p-4">
                    <Button variant="ghost" onClick={handleLogout} disabled={isLoggingOut} className="w-full justify-start gap-3">
                        <Power className="h-4 w-4" />
                        로그아웃
                    </Button>
                </div>
            </div>
        </div>
    )
}

const teacherLinks = [
  { name: '학생 보상', href: '/teacher/rewards', icon: Award },
];
