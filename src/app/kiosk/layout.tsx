

'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { usePathname, useRouter } from 'next/navigation';
import { auth, db, handleSignOut } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Loader2, Settings, LogOut, Home } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function KioskLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [user, loading] = useAuthState(auth);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuthorization = async () => {
      if (loading) {
        return;
      }
      
      if (!user) {
        toast({
          title: '로그인 필요',
          description: '로그인이 필요한 페이지입니다.',
          variant: 'destructive',
        });
        setTimeout(() => router.push('/login'), 50);
        return;
      }
      
      setIsAuthorized(true);
    };
    checkAuthorization();
  }, [user, loading, router, toast]);

  const handleEndSession = () => {
      localStorage.removeItem('kiosk_point_value');
      localStorage.removeItem('kiosk_point_reason');
      router.push('/kiosk');
  }

  const handleSecretLogout = async () => {
      handleEndSession();
      await handleSignOut();
      toast({title: "로그아웃", description: "키오스크 세션이 종료되었습니다."});
      router.push('/login');
  }

  if (loading || !isAuthorized) {
    return (
       <div className="flex items-center justify-center min-h-screen bg-amber-50">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-amber-50 p-4">
        <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
             <Button asChild variant="ghost">
                <Link href="/kiosk">
                    <Home className="h-5 w-5 mr-2" />
                    <span className="font-bold">키오스크 홈</span>
                </Link>
             </Button>
             <div className="flex items-center gap-2">
                 {pathname !== '/kiosk' && (
                     <Button variant="ghost" size="sm" onClick={handleEndSession}>
                         <Settings className="h-4 w-4 mr-2"/>
                         세션/활동 종료
                     </Button>
                 )}
                <Button variant="ghost" size="icon" className="w-10 h-10 opacity-0 hover:opacity-100" onClick={handleSecretLogout}>
                    <LogOut className="h-4 w-4 text-muted-foreground" />
                </Button>
             </div>
        </header>
        {children}
    </div>
  );
}
