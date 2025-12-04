'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { handleSignOut, auth } from '@/lib/firebase';
import { useToast } from './use-toast';
import { onAuthStateChanged } from 'firebase/auth';

export function useLogout() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await handleSignOut();
      toast({ title: '로그아웃 되었습니다.' });
      
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (!user) {
          unsubscribe();
          // Use a timeout to ensure state has updated before navigation
          setTimeout(() => {
            router.push('/');
            router.refresh();
          }, 100);
        }
      });

    } catch (error: any) {
      toast({
        title: '로그아웃 실패',
        description: error.message,
        variant: 'destructive',
      });
      setIsLoggingOut(false);
    }
  };

  return { handleLogout, isLoggingOut };
}
