'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, QrCode, History, LogOut, Loader2, Mail, ShoppingCart } from 'lucide-react';
import { Button } from './ui/button';
import { useLogout } from '@/hooks/use-logout';


const links = [
  { name: '관리자 홈', href: '/admin', icon: Home },
  { name: '사용자 관리', href: '/admin/users', icon: Users },
  { name: '코드 관리', href: '/admin/codes', icon: QrCode },
  { name: '편지 관리', href: '/admin/letters', icon: Mail },
  { name: '주문 내역', href: '/admin/purchases', icon: ShoppingCart },
  { name: '전체 내역', href: '/admin/history', icon: History },
];

export function AdminNav() {
  const pathname = usePathname();
  const { handleLogout, isLoggingOut } = useLogout();

  return (
    <nav className="flex flex-col gap-2">
      {links.map((link) => {
        const isActive = pathname.startsWith(link.href) && (link.href !== '/admin' || pathname === '/admin');
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
