
'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import MaintenancePage from '@/app/maintenance/page';

const protectedRoutes = {
  student: ['/dashboard', '/community', '/game'],
  teacher: ['/teacher'],
  council: ['/council'],
  admin: ['/admin'],
};

type Role = keyof typeof protectedRoutes;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const [authChecked, setAuthChecked] = useState(false);
  const [isMaintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    const settingsRef = doc(db, 'system_settings', 'main');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      setMaintenanceMode(doc.data()?.isMaintenanceMode ?? false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkAuthorization = async () => {
      if (authLoading) {
        return; 
      }
      
      const isProtected = Object.values(protectedRoutes).flat().some(p => pathname.startsWith(p));
      const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');

      if (!user && isProtected) {
        toast({
          title: '로그인 필요',
          description: '이 페이지에 접근하려면 로그인이 필요합니다.',
          variant: 'destructive',
        });
        router.push('/login');
        return;
      }

      if (user) {
        if(isAuthPage) {
           router.push('/dashboard');
           return;
        }

        const userDocRef = doc(db, 'users', user.uid);
        try {
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                const userRole = userDoc.data().role as Role;
                let isAuthorized = true;

                if (pathname.startsWith('/admin') && userRole !== 'admin') isAuthorized = false;
                else if (pathname.startsWith('/council') && !['council', 'admin'].includes(userRole)) isAuthorized = false;
                else if (pathname.startsWith('/teacher') && userRole !== 'teacher') isAuthorized = false;
                else if (isProtected && userRole !== 'student' && !['admin', 'council'].includes(userRole) && pathname.startsWith('/dashboard')) {
                    // Non-students shouldn't be on student dashboard unless they are council in student mode
                     if(userRole === 'council') {
                        const councilMode = localStorage.getItem('councilMode');
                        if (councilMode !== 'student') isAuthorized = false;
                     } else {
                        isAuthorized = false;
                     }
                }
                
                if (!isAuthorized) {
                    toast({
                        title: '접근 권한 없음',
                        description: '이 페이지에 접근할 권한이 없습니다.',
                        variant: 'destructive',
                    });
                    if (userRole === 'admin') router.push('/admin');
                    else if (userRole === 'council') router.push('/council');
                    else if (userRole === 'teacher') router.push('/teacher/rewards');
                    else router.push('/');
                    return;
                }
            } else {
                 throw new Error("User data not found.");
            }
        } catch (error) {
             toast({ title: '오류', description: '사용자 정보를 확인하는 중 문제가 발생했습니다.', variant: 'destructive' });
             router.push('/login');
             return;
        }
      }
      setAuthChecked(true);
    };

    checkAuthorization();
  }, [user, authLoading, pathname, router, toast]);

  if (authLoading || !authChecked) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAccessingProtectedContent = Object.values(protectedRoutes).flat().some(path => pathname.startsWith(path));
  if (isMaintenanceMode && isAccessingProtectedContent) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
}
