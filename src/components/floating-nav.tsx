
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, Users, QrCode, History, LogOut, Loader2, Mail, ShoppingCart, 
  HelpCircle, Cog, Award, ListOrdered, UserCheck, Menu, X
} from 'lucide-react';
import { useLogout } from '@/hooks/use-logout';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const studentLinks = [
  { name: '대시보드', href: '/dashboard', icon: Home },
  { name: '프로필 설정', href: '/dashboard/settings', icon: Cog },
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

export function FloatingNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const { handleLogout, isLoggingOut } = useLogout();
  const [isOpen, setIsOpen] = useState(false);
  
  const links = navConfig[role];
  const radius = 100;

  return (
    <TooltipProvider>
      <motion.div
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.1}
        dragMomentum={false}
        className="fixed bottom-10 right-10 z-50 flex items-center justify-center"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <AnimatePresence>
          {isOpen && (
            <>
              {links.map((link, i) => {
                const angle = (i / links.length) * 2 * Math.PI - (Math.PI / 2);
                const isActive = pathname.startsWith(link.href) && (link.href.length > (role === 'student' ? '/dashboard' : `/${role}`).length || pathname === link.href);
                return (
                  <motion.div
                    key={link.name}
                    initial={{ scale: 0, x: 0, y: 0 }}
                    animate={{
                      scale: 1,
                      x: radius * Math.cos(angle),
                      y: radius * Math.sin(angle),
                    }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: i * 0.05 }}
                    className="absolute"
                  >
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <Link href={link.href} onClick={() => setIsOpen(false)}>
                                <div className={cn(
                                    "w-12 h-12 rounded-full flex items-center justify-center bg-background border shadow-lg hover:scale-110 transition-transform",
                                    isActive ? 'text-primary border-primary' : 'text-muted-foreground'
                                )}>
                                    <link.icon className="h-6 w-6" />
                                </div>
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="center">
                            <p>{link.name}</p>
                        </TooltipContent>
                     </Tooltip>
                  </motion.div>
                );
              })}
              {/* Logout Button */}
               <motion.div
                    initial={{ scale: 0, x: 0, y: 0 }}
                    animate={{
                      scale: 1,
                      x: radius * Math.cos((links.length / links.length) * 2 * Math.PI - (Math.PI / 2)),
                      y: radius * Math.sin((links.length / links.length) * 2 * Math.PI - (Math.PI / 2)),
                    }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: links.length * 0.05 }}
                    className="absolute"
                  >
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <button onClick={handleLogout} disabled={isLoggingOut}
                             className="w-12 h-12 rounded-full flex items-center justify-center bg-background border shadow-lg hover:scale-110 transition-transform text-destructive">
                               {isLoggingOut ? <Loader2 className="h-6 w-6 animate-spin" /> : <LogOut className="h-6 w-6" />}
                           </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="center">
                            <p>로그아웃</p>
                        </TooltipContent>
                     </Tooltip>
                  </motion.div>
            </>
          )}
        </AnimatePresence>
        
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center focus:outline-none"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isOpen ? <X className="h-8 w-8" /> : <Menu className="h-8 w-8" />}
        </motion.button>
      </motion.div>
    </TooltipProvider>
  );
}
