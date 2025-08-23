
'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { SideNav } from '@/components/side-nav';


export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const pathname = usePathname();
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
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <DesktopNav role="student" />
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
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 260, damping: 30, duration: 0.3 }}
                >
                  {children}
                </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
  );
}


function DesktopNav({ role }: { role: 'student' | 'admin' | 'council' | 'teacher' }) {
    const pathname = usePathname();
    const { handleLogout, isLoggingOut } = useLogout();
    const links = navConfig[role];
    const settingsLink = { name: '프로필 설정', href: '/dashboard/settings', icon: Cog };

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
                <div className="flex-1">
                    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                        {links.map((link) => (
                          <NavLink key={link.href} {...link} />
                        ))}
                         {role === 'student' && (
                          <>
                            <Separator className="my-2" />
                            <NavLink {...settingsLink} />
                          </>
                        )}
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

const studentLinks = [
  { name: '대시보드', href: '/dashboard', icon: Home },
  { name: '코드 사용', href: '/dashboard/codes', icon: QrCode },
  { name: '친구', href: '/dashboard/friends', icon: Users },
  { name: '편지 쓰기', href: '/dashboard/letters', icon: Mail },
  { name: '쇼핑', href: '/dashboard/shop', icon: ShoppingCart },
  { name: '사용 내역', href: '/dashboard/history', icon: History },
  { name: '사용 방법', href: '/dashboard/guide', icon: HelpCircle },
];

const navConfig = {
  student: studentLinks,
};
