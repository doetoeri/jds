

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
  Home,
  Users,
  QrCode,
  History,
  Mail,
  ShoppingCart,
  HelpCircle,
  Cog,
  Award,
  ListOrdered,
  UserCheck,
  Power,
  Bird,
  MessageCircleQuestion,
  Megaphone,
  Languages,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLogout } from '@/hooks/use-logout';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';

const studentLinks = [
  { name: '대시보드', href: '/dashboard', icon: Home },
  { name: 'AI 어시스턴트', href: '/dashboard/assistant', icon: Wand2 },
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
  { name: '방명록 관리', href: '/admin/guestbook', icon: MessageCircleQuestion },
  { name: '사용자 문의', href: '/admin/inquiries', icon: MessageCircleQuestion },
  { name: '전체 내역', href: '/admin/history', icon: History },
];

const councilLinks = [
  { name: '학생회 홈', href: '/council', icon: Home },
  { name: '사용자 관리', href: '/council/users', icon: Users },
];

const teacherLinks = [
  { name: '학생 보상', href: '/teacher/rewards', icon: Award },
];

const navConfig = {
  student: studentLinks,
  admin: adminLinks,
  council: councilLinks,
  teacher: teacherLinks,
};

type Role = 'student' | 'admin' | 'council' | 'teacher';

export function SideNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const { handleLogout, isLoggingOut } = useLogout();
  const links = navConfig[role];
  
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
          {links.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
          {role === 'student' && (
              <>
                <Separator className="my-2" />
                {studentSettingsLinks.map((link) => (
                    <NavLink key={link.href} {...link} />
                ))}
              </>
          )}
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
