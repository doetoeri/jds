
'use client';

import { useEffect, useState } from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { useLogout } from '@/hooks/use-logout';
import { Loader2, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface UserData {
  studentId?: string;
  name?: string; 
  displayName?: string; 
  email?: string;
  role?: 'student' | 'teacher' | 'admin' | 'pending_teacher' | 'council' | 'council_booth';
  photoURL?: string; 
  avatarGradient?: string;
}

export function UserNav() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const { handleLogout, isLoggingOut } = useLogout();
  const [councilMode, setCouncilMode] = useState<'council' | 'student'>('student');
  const router = useRouter();
  
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const unsubDoc = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
            const data = userDoc.data() as UserData;
            setUserData(data);
          } else {
            setUserData({email: user.email}); // Fallback for special accounts not yet in firestore
          }
        }, (error) => {
          console.error("Error fetching user document:", error);
          setUserData(null);
        });
        return () => unsubDoc();
      } else {
        setUserData(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (userData?.role === 'council') {
        const savedMode = localStorage.getItem('councilMode') as 'council' | 'student' | null;
        setCouncilMode(savedMode || 'council');
    }
  }, [userData?.role]);

  const handleModeSwitch = () => {
    const newMode = councilMode === 'council' ? 'student' : 'council';
    setCouncilMode(newMode);
    localStorage.setItem('councilMode', newMode);
    router.push(newMode === 'council' ? '/council' : '/dashboard');
  };

  const getInitials = () => {
    if (userData?.role === 'admin') return '관리';
    if (userData?.displayName) return userData.displayName.substring(0, 1).toUpperCase();
    if (userData?.role === 'teacher') return userData.name?.substring(0, 1) || '교';
    if (userData?.studentId) return userData.studentId.substring(userData.studentId.length - 2);
    return user?.email?.substring(0,1).toUpperCase() || '??';
  }

  const getDisplayName = () => {
     if (userData?.role === 'admin') return '관리자';
     if (userData?.displayName) return userData.displayName;
     if (userData?.role === 'teacher') return `${userData.name} 선생님`;
     if (userData?.role === 'student' || userData?.role === 'council' || userData?.role === 'council_booth') return `학생 (${userData.studentId})`;
     return '사용자';
  }
  
  const getDashboardLink = () => {
      if (userData?.role === 'admin') return '/admin';
      if (userData?.role === 'council_booth') return '/council/booth';
      if (userData?.role === 'council') {
        return councilMode === 'council' ? '/council' : '/dashboard';
      }
      if (userData?.role === 'teacher') return '/teacher/rewards';
      return '/dashboard';
  }

  if (!user || !userData) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={userData.photoURL || undefined} alt="@user" />
            <AvatarFallback className={cn(
              "text-white font-bold",
              userData.avatarGradient && `gradient-${userData.avatarGradient}`
            )}>
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{getDisplayName()}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userData.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
           <DropdownMenuItem asChild>
              <Link href={getDashboardLink()}>대시보드</Link>
            </DropdownMenuItem>
             <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">프로필 설정</Link>
            </DropdownMenuItem>
            {userData.role === 'council' && (
              <DropdownMenuItem onClick={handleModeSwitch} className="cursor-pointer">
                <Repeat className="mr-2 h-4 w-4" />
                <span>{councilMode === 'council' ? '학생 모드로 전환' : '학생회 모드로 전환'}</span>
              </DropdownMenuItem>
            )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer" disabled={isLoggingOut}>
           {isLoggingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
           로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
