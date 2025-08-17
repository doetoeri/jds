'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, History, QrCode, LogOut, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useLogout } from '@/hooks/use-logout';

const links = [
  { name: '대시보드', href: '/dashboard', icon: Home },
  { name: '코드 사용', href: '/dashboard/codes', icon: QrCode },
  { name: '사용 내역', href: '/dashboard/history', icon: History },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { handleLogout, isLoggingOut } = useLogout();

  return (
    <nav className="flex flex-col gap-2">
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Button
            key={link.name}
            asChild
            variant={isActive ? 'secondary' : 'ghost'}
            className="justify-start"
          >
            <Link href={link.href}>
              <link.icon className="mr-2 h-4 w-4" />
              {link.name}
            </Link>
          </Button>
        );
      })}
       <Button
        variant="ghost"
        className="justify-start mt-4"
        onClick={handleLogout}
        disabled={isLoggingOut}
      >
        {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
        로그아웃
      </Button>
    </nav>
  );
}
