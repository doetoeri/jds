'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Award, LogOut, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useLogout } from '@/hooks/use-logout';

const links = [
  { name: '학생 보상', href: '/teacher/rewards', icon: Award },
];

export function TeacherNav() {
  const pathname = usePathname();
  const { handleLogout, isLoggingOut } = useLogout();

  return (
    <nav className="flex flex-col gap-2">
      {links.map((link) => {
        const isActive = pathname.startsWith(link.href);
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

    