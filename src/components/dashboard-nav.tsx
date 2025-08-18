'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, History, QrCode, LogOut, Loader2, Mail, ShoppingCart, HelpCircle } from 'lucide-react';
import { Button } from './ui/button';
import { useLogout } from '@/hooks/use-logout';

const links = [
  { name: '대시보드', href: '/dashboard', icon: Home },
  { name: '코드 사용', href: '/dashboard/codes', icon: QrCode },
  { name: '편지 쓰기', href: '/dashboard/letters', icon: Mail },
  { name: '쇼핑', href: '/dashboard/shop', icon: ShoppingCart },
  { name: '사용 내역', href: '/dashboard/history', icon: History },
  { name: '사용 방법', href: '/dashboard/guide', icon: HelpCircle },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { handleLogout, isLoggingOut } = useLogout();

  return (
    <nav className="flex flex-col gap-2">
      {links.map((link) => {
        const isActive = pathname.startsWith(link.href) && (link.href !== '/dashboard' || pathname === '/dashboard');
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
