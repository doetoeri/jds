
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
    
    // Check for experimental themes
    const experimentalTheme = localStorage.getItem('theme');
    if (experimentalTheme === 'liquid-glass') {
      document.body.classList.add('liquid-glass-theme-enabled');
    } else {
      document.body.classList.remove('liquid-glass-theme-enabled');
    }


  }, [pathname]);

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
