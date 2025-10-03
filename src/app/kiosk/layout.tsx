
'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { usePathname, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';

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

  if (loading || !isAuthorized) {
    return (
       <div className="flex items-center justify-center min-h-screen bg-orange-50">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-orange-50 p-4">
        <div className="absolute top-6 left-1/2 -translate-x-1/2">
            <h1 className="text-3xl font-bold font-headline text-orange-500">JongDalSam</h1>
        </div>
        {children}
    </div>
  );
}
