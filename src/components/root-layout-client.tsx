
'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    let theme = 'theme-student'; // Default theme
    
    if (pathname.startsWith('/teacher') || pathname.startsWith('/guide/teachers')) {
      theme = 'theme-teacher';
    }

    // Always enable liquid glass for the root page, toggle for others
    if (pathname === '/' || pathname.startsWith('/teacher/login') || pathname === '/teacher' || pathname.startsWith('/(auth)')) {
        document.body.classList.add('liquid-glass-theme-enabled');
    } else {
        document.body.classList.remove('liquid-glass-theme-enabled');
    }
    
    document.documentElement.className = theme;
    
  }, [pathname]);

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
