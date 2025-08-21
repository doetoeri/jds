'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, ShoppingCart, ListOrdered, LogOut, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useLogout } from '@/hooks/use-logout';


const links = [
  { name: '학생회 홈', href: '/council', icon: Home },
  { name: '상점 관리', href: '/council/shop', icon: ShoppingCart },
  { name: '주문 내역', href: '/council/orders', icon: ListOrdered },
  { name: '사용자 관리', href: '/council/users', icon: Users },
];

export function CouncilNav() {
  const pathname = usePathname();
  const { handleLogout, isLoggingOut } = useLogout();

  return (
    <nav className="flex flex-col gap-2">
      {links.map((link) => {
        const isActive = pathname.startsWith(link.href) && (link.href !== '/council' || pathname === '/council');
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
