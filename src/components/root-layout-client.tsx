
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
    document.documentElement.className = theme;
    
    // Apply skeuomorphism theme if enabled
    const savedTheme = localStorage.getItem('skeuomorphism-theme');
    if (savedTheme === 'enabled') {
      document.body.classList.add('skeuo-theme-enabled');
    } else {
      document.body.classList.remove('skeuo-theme-enabled');
    }
  }, [pathname]);

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
