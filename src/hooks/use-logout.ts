'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { handleSignOut } from '@/lib/firebase';
import { useToast } from './use-toast';

export function useLogout() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await handleSignOut();
      toast({ title: '로그아웃 되었습니다.' });
      router.push('/');
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
