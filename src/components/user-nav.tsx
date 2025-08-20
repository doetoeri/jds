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
import { doc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { useLogout } from '@/hooks/use-logout';
import { Loader2 } from 'lucide-react';

interface UserData {
  studentId?: string;
  name?: string; // For teachers
  email?: string;
  role?: string;
}

export function UserNav() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const { handleLogout, isLoggingOut } = useLogout();
  
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserData(userDoc.data() as UserData);
          } else {
             // Handle master admin user separately without a Firestore doc
            if (user.email === 'admin@jongdalsem.com') {
                setUserData({ email: user.email, name: '관리자', role: 'admin' });
            } else {
                setUserData(null);
            }
          }
        } catch (error) {
          console.error("Error fetching user document:", error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const getInitials = () => {
    if (userData?.role === 'admin') return '관리';
    if (userData?.role === 'teacher') return userData.name?.substring(0, 1) || '교';
    if (userData?.role === 'student') return userData.studentId?.substring(userData.studentId.length - 2) || '학생';
    return '??';
  }

  const getDisplayName = () => {
     if (userData?.role === 'admin') return '관리자';
     if (userData?.role === 'teacher') return `${userData.name} 선생님`;
     if (userData?.role === 'student') return `학생 (${userData.studentId})`;
     return '사용자';
  }
  
  const getDashboardLink = () => {
      if (userData?.role === 'admin') return '/admin';
      if (userData?.role === 'teacher') return '/teacher/rewards';
      return '/dashboard';
  }


  if (!user || !userData) {
    // Don't render anything until user and userData is loaded, to prevent flashes of incorrect state.
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src="https://placehold.co/100x100.png" alt="@user" data-ai-hint="person avatar" />
            <AvatarFallback>{getInitials()}</AvatarFallback>
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

    