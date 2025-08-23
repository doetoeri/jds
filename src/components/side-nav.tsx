
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Home, Users, QrCode, History, Mail, ShoppingCart, 
  HelpCircle, Cog, Award, ListOrdered, UserCheck, Power,
  ChevronRight,
} from 'lucide-react';
import { useLogout } from '@/hooks/use-logout';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Separator } from './ui/separator';

const studentLinks = [
  { name: '대시보드', href: '/dashboard', icon: Home },
  { name: '코드 사용', href: '/dashboard/codes', icon: QrCode },
  { name: '친구', href: '/dashboard/friends', icon: Users },
  { name: '편지 쓰기', href: '/dashboard/letters', icon: Mail },
  { name: '쇼핑', href: '/dashboard/shop', icon: ShoppingCart },
  { name: '사용 내역', href: '/dashboard/history', icon: History },
  { name: '사용 방법', href: '/dashboard/guide', icon: HelpCircle },
];

const adminLinks = [
  { name: '관리자 홈', href: '/admin', icon: Home },
  { name: '사용자 관리', href: '/admin/users', icon: Users },
  { name: '교직원 관리', href: '/admin/teachers', icon: UserCheck },
  { name: '코드 관리', href: '/admin/codes', icon: QrCode },
  { name: '편지 관리', href: '/admin/letters', icon: Mail },
  { name: '주문 내역', href: '/admin/purchases', icon: ShoppingCart },
  { name: '전체 내역', href: '/admin/history', icon: History },
];

const councilLinks = [
  { name: '학생회 홈', href: '/council', icon: Home },
  { name: '상점 관리', href: '/council/shop', icon: ShoppingCart },
  { name: '주문 내역', href: '/council/orders', icon: ListOrdered },
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

const NavLink = ({ link, pathname }: { link: (typeof studentLinks)[0], pathname: string }) => {
  const isActive = pathname.startsWith(link.href) && (link.href.length > (link.href.startsWith('/admin') ? '/admin' : link.href.startsWith('/council') ? '/council' : '/dashboard').length || pathname === link.href);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={link.href}>
          <motion.div
            className={cn(
              "flex items-center h-10 px-3 rounded-lg cursor-pointer transition-colors",
              isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <link.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
            <span
              className="overflow-hidden font-medium ml-3 whitespace-nowrap"
            >
              {link.name}
            </span>
          </motion.div>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">{link.name}</TooltipContent>
    </Tooltip>
  )
};


export function SideNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const { handleLogout, isLoggingOut } = useLogout();
  const [isExpanded, setIsExpanded] = useState(false);
  const links = navConfig[role];
  const settingsLink = role === 'student' ? { name: '프로필 설정', href: '/dashboard/settings', icon: Cog } : null;

  return (
    <TooltipProvider>
      <motion.aside
        className="fixed left-0 top-0 h-full z-40 flex flex-col border-r bg-background/80 backdrop-blur-sm"
        initial={{ x: '-100%' }}
        animate={{ x: isExpanded ? 0 : 'calc(-100% - 40px)' }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex flex-col h-full p-3 w-56">
            <div className="flex-grow flex flex-col gap-2 my-auto">
                {links.map((link) => (
                    <NavLink key={link.href} link={link} pathname={pathname}/>
                ))}
            </div>

            <div className="flex flex-col gap-2">
               {settingsLink && (
                 <>
                    <Separator />
                    <NavLink link={settingsLink} pathname={pathname}/>
                 </>
               )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    className="flex items-center h-10 px-3 rounded-lg cursor-pointer text-destructive hover:bg-destructive/10"
                     whileHover={{ scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                     onClick={handleLogout}
                  >
                      <Power className="h-5 w-5 shrink-0" />
                      <span
                        className="overflow-hidden font-medium ml-3 whitespace-nowrap"
                      >
                        {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
                      </span>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="right">로그아웃</TooltipContent>
              </Tooltip>
            </div>
        </div>
      </motion.aside>
      
      <motion.button
            onClick={() => setIsExpanded(!isExpanded)}
            className="fixed top-1/2 -translate-y-1/2 z-50 bg-background hover:bg-muted border-y border-r rounded-r-lg p-2"
            animate={{ left: isExpanded ? 224 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
        >
            <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
            >
                <ChevronRight className="h-6 w-6" />
            </motion.div>
        </motion.button>
    </TooltipProvider>
  );
}
