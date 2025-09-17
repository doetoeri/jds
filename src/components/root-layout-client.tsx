
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
    
    // Apply visual theme if enabled
    const savedTheme = localStorage.getItem('theme') || 'default';
    document.body.classList.remove('skeuo-theme-enabled', 'liquid-glass-theme-enabled');
    if (savedTheme === 'skeuomorphism') {
        document.body.classList.add('skeuo-theme-enabled');
    } else if (savedTheme === 'liquid-glass') {
        document.body.classList.add('liquid-glass-theme-enabled');
    }

  }, [pathname]);

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
