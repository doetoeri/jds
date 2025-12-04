'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from './ui/button';
import {
  Menu,
  Power,
  Bird,
  LayoutDashboard,
  Users,
  Swords
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLogout } from '@/hooks/use-logout';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';

const studentLinks = [
  { name: '미니게임', href: '/game', icon: Swords },
];

const adminLinks = [
  { name: '대시보드', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: '사용자 관리', href: '/admin/users', icon: Users },
];


const navConfig = {
  student: studentLinks,
  admin: adminLinks,
};

type Role = 'student' | 'admin';

export function SideNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const { handleLogout, isLoggingOut } = useLogout();
  const links = navConfig[role] || [];
  
  const NavLink = ({ name, href, icon: Icon }: { name: string; href: string; icon: React.ElementType }) => {
    const isActive = pathname === href;
    return (
        <Link href={href} className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
            isActive && "bg-muted text-primary"
        )}>
            <Icon className="h-4 w-4" />
            {name}
        </Link>
    )
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col">
         <SheetHeader>
            <SheetTitle>
                 <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                    <Bird className="h-6 w-6 text-primary" />
                    <span className="font-headline">종달샘 허브</span>
                </Link>
            </SheetTitle>
        </SheetHeader>
        <nav className="grid gap-2 text-lg font-medium flex-1 py-4 overflow-y-auto">
          {links.map((link) => {
            return <NavLink key={link.href} {...link} />
          })}
        </nav>
        <div className="mt-auto">
            <Button variant="ghost" onClick={handleLogout} disabled={isLoggingOut} className="w-full justify-start gap-3 px-3 py-2 text-muted-foreground">
                <Power className="h-4 w-4" />
                로그아웃
            </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
