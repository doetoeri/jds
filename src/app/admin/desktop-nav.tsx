'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useLogout } from '@/hooks/use-logout';
import { cn } from '@/lib/utils';
import {
  Users,
  Power,
  LayoutDashboard,
  Radio,
  TrendingUp,
  Croissant,
  Brain,
  Blocks,
  FlaskConical,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const studentLinks: any[] = [];

const adminLinks = [
  { name: '대시보드', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: '사용자 관리', href: '/admin/users', icon: Users },
  { name: '더 버튼 관리', href: '/admin/the-button', icon: Radio },
  { name: '종달새 강화 관리', href: '/admin/upgrade-game', icon: TrendingUp },
  { name: '스네이크 관리', href: '/admin/snake', icon: Croissant },
  { name: '스도쿠 관리', href: '/admin/sudoku', icon: Brain },
  { name: '블록 블라스트 관리', href: '/admin/block-blast', icon: Blocks },
];

const councilLinks: any[] = [];

const teacherLinks: any[] = [];

const navConfig = {
  student: studentLinks,
  admin: adminLinks,
  council: councilLinks,
  teacher: teacherLinks,
};

type Role = keyof typeof navConfig;

interface NavLinkProps {
  name: string;
  href: string;
  icon: React.ElementType;
}

const NavLink = ({ name, href, icon: Icon }: NavLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
        isActive && 'bg-muted text-primary'
      )}
    >
      <Icon className="h-4 w-4" />
      {name}
    </Link>
  );
};

export function DesktopNav({ role }: { role: Role }) {
  const { handleLogout, isLoggingOut } = useLogout();
  const links = navConfig[role] || [];

  return (
    <div className="hidden border-r bg-muted/40 md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex-1 overflow-y-auto pt-2">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {links.map(link => (
              <NavLink key={link.href} {...link} />
            ))}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <Button
            variant="ghost"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full justify-start gap-3"
          >
            <Power className="h-4 w-4" />
            로그아웃
          </Button>
        </div>
      </div>
    </div>
  );
}
