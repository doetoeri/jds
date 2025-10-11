

'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { usePathname, useRouter } from 'next/navigation';
import { auth, db, handleSignOut } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Loader2, Settings, LogOut } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';

export default function KioskLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
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
      
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().role === 'kiosk') {
          setIsAuthorized(true);
      } else {
        toast({
          title: '접근 권한 없음',
          description: '키오스크 계정만 접근할 수 있는 페이지입니다.',
          variant: 'destructive',
        });
        setIsAuthorized(false);
        setTimeout(() => router.push('/dashboard'), 50);
        return;
      }
    };
    checkAuthorization();
  }, [user, loading, router, toast]);

  const handleEndSession = () => {
      localStorage.removeItem('kiosk_point_value');
      localStorage.removeItem('kiosk_point_reason');
      router.push('/kiosk/setup');
  }

  const handleSecretLogout = async () => {
      handleEndSession();
      await handleSignOut();
      toast({title: "로그아웃", description: "키오스크 세션이 종료되었습니다."});
      router.push('/login');
  }

  if (loading || !isAuthorized) {
    return (
       <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
             <h1 className="text-3xl font-bold font-batang text-orange-500">JongDalSam</h1>
             <div className="flex items-center gap-2">
                 <Button variant="ghost" size="sm" onClick={handleEndSession}>
                     <Settings className="h-4 w-4 mr-2"/>
                     설정 변경
                 </Button>
                <Button variant="ghost" size="icon" className="w-10 h-10 opacity-0 hover:opacity-100" onClick={handleSecretLogout}>
                    <LogOut className="h-4 w-4 text-muted-foreground" />
                </Button>
             </div>
        </header>
        {children}
    </div>
  );
}
