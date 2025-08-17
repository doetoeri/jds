'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, History, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

const links = [
  { name: '대시보드', href: '/dashboard', icon: Home },
  { name: '코드 사용', href: '/dashboard/codes', icon: QrCode },
  { name: '사용 내역', href: '/dashboard/history', icon: History },
];

export function DashboardNav() {
  const pathname = usePathname();

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
    </nav>
  );
}
