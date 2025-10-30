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
  Cog,
  Award,
  UserCheck,
  Power,
  Bird,
  MessageCircleQuestion,
  Megaphone,
  ShoppingCart,
  ListOrdered,
  HelpCircle,
  MessageSquareText,
  Swords,
  Trophy,
  User as UserIcon,
  CheckSquare,
  BarChart3,
  ShieldQuestion,
  LayoutDashboard,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLogout } from '@/hooks/use-logout';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';

const studentLinks = [
  { name: '대시보드', href: '/dashboard', icon: Home },
  { name: '업데이트 소식', href: '/dashboard/releases', icon: Megaphone },
  { name: '커뮤니티', href: '/community', icon: MessageSquareText },
  { name: '미니게임', href: '/game', icon: Swords },
  { name: '리더보드', href: '/dashboard/leaderboard', icon: Trophy },
  { name: '설문/투표', href: '/dashboard/polls', icon: CheckSquare },
  { name: '코드 사용', href: '/dashboard/codes', icon: QrCode },
  { name: '친구', href: '/dashboard/mates', icon: UserPlus },
  { name: '종달 우체국', href: '/dashboard/letters', icon: Mail },
  { name: '종달 상점', href: '/dashboard/shop', icon: ShoppingCart },
  { name: '사용 내역', href: '/dashboard/history', icon: History },
];

const studentSettingsLinks = [
  { name: '프로필 설정', href: '/dashboard/settings', icon: Cog },
  { name: '문의하기', href: '/dashboard/inquiry', icon: MessageCircleQuestion },
];


const adminLinks = [
  { name: '대시보드', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: '사용자 관리', href: '/admin/users', icon: Users },
  { name: '상점 관리', href: '/council/shop', icon: ShoppingCart },
  { name: '주문 관리', href: '/council/orders', icon: ListOrdered },
  { name: '학생회 관리', href: '/admin/council', icon: ShieldQuestion },
  { name: '교직원 관리', href: '/admin/teachers', icon: UserCheck },
  { name: '커뮤니티 관리', href: '/admin/community', icon: MessageSquareText },
  { name: '설문조사 관리', href: '/admin/polls', icon: BarChart3 },
  { name: '코드 관리', href: '/admin/codes', icon: QrCode },
  { name: '편지 관리', href: '/admin/letters', icon: Mail },
  { name: '사용자 문의', href: '/admin/inquiries', icon: MessageCircleQuestion },
  { name: '구매 문의 관리', href: '/admin/disputes', icon: ShieldQuestion },
  { name: '전체 내역', href: '/admin/history', icon: History },
  { name: '전체 주문 내역', href: '/admin/purchases', icon: ListOrdered },
  { name: '시스템 설정', href: '/admin/settings', icon: Cog },
];

const councilLinks = [
  { name: '학생회 홈', href: '/council', icon: Home },
  { name: '학생 사용자 관리', href: '/council/users', icon: Users },
  { name: '상점 관리', href: '/council/shop', icon: ShoppingCart },
  { name: '주문 관리', href: '/council/orders', icon: ListOrdered },
  { name: '부스 포인트 지급', href: '/council/booth', icon: Award },
  { name: '계산원 매점', href: '/council/pos', icon: ShoppingCart },
];

const teacherLinks = [
    { name: '학생 보상', href: '/teacher/rewards', icon: Award },
    { name: '종달 우체국', href: '/teacher/letters', icon: Mail },
    { name: '사용 가이드', href: '/guide/teachers', icon: HelpCircle },
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
