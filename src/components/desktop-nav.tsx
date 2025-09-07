
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useLogout } from '@/hooks/use-logout';
import { cn } from '@/lib/utils';
import {
  Home,
  Users,
  QrCode,
  Mail,
  History,
  UserCheck,
  Power,
  MessageCircleQuestion,
  Award,
  Cog,
  Megaphone,
  Languages,
  ShoppingCart,
  ListOrdered,
  HelpCircle,
} from 'lucide-react';
import { Separator } from './ui/separator';

const studentLinks = [
  { name: '대시보드', href: '/dashboard', icon: Home },
  { name: '업데이트 소식', href: '/dashboard/releases', icon: Megaphone },
  { name: '코드 사용', href: '/dashboard/codes', icon: QrCode },
  { name: '친구', href: '/dashboard/friends', icon: Users },
  { name: '편지 쓰기', href: '/dashboard/letters', icon: Mail },
  { name: '실시간 끝말잇기', href: '/game/word-chain', icon: Languages },
  { name: '사용 내역', href: '/dashboard/history', icon: History },
];

const studentSettingsLinks = [
  { name: '프로필 설정', href: '/dashboard/settings', icon: Cog },
  { name: '문의하기', href: '/dashboard/inquiry', icon: MessageCircleQuestion },
];

const adminLinks = [
  { name: '관리자 홈', href: '/admin', icon: Home },
  { name: '사용자 관리', href: '/admin/users', icon: Users },
  { name: '교직원 관리', href: '/admin/teachers', icon: UserCheck },
  { name: '코드 관리', href: '/admin/codes', icon: QrCode },
  { name: '편지 관리', href: '/admin/letters', icon: Mail },
  { name: '사용자 문의', href: '/admin/inquiries', icon: MessageCircleQuestion },
  { name: '전체 내역', href: '/admin/history', icon: History },
  { name: '전체 주문 내역', href: '/admin/purchases', icon: ListOrdered },
];

const councilLinks = [
  { name: '학생회 홈', href: '/council', icon: Home },
  { name: '부스 포인트 지급', href: '/council/booth', icon: Award },
  { name: '계산원 매점', href: '/council/pos', icon: ShoppingCart },
  { name: '상점 관리', href: '/council/shop', icon: Cog },
  { name: '주문 관리', href: '/council/orders', icon: ListOrdered },
  { name: '학생 사용자 관리', href: '/council/users', icon: Users },
];

const teacherLinks = [
    { name: '학생 보상', href: '/teacher/rewards', icon: Award },
    { name: '사용 가이드', href: '/guide/teachers', icon: HelpCircle },
];

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
  const links = navConfig[role];

  return (
    <div className="hidden border-r bg-muted/40 md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex-1 overflow-y-auto pt-2">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {links.map(link => (
              <NavLink key={link.href} {...link} />
            ))}
            {role === 'student' && (
              <>
                <Separator className="my-2" />
                {studentSettingsLinks.map(link => (
                  <NavLink key={link.href} {...link} />
                ))}
              </>
            )}
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
