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
  email?: string;
}

export function UserNav() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const { handleLogout, isLoggingOut } = useLogout();
  
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        // Handle admin user separately without a Firestore doc
        if (user.email === 'admin@jongdalsem.com') {
          setUserData({ email: user.email });
        } else {
          // For regular users, fetch data from Firestore
          const userDocRef = doc(db, 'users', user.uid);
          try {
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              setUserData(userDoc.data() as UserData);
            } else {
              console.error("User document not found in Firestore for UID:", user.uid);
              setUserData(null);
            }
          } catch (error) {
            console.error("Error fetching user document:", error);
            setUserData(null);
          }
        }
      } else {
        setUserData(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const getInitials = (studentId: string | undefined) => {
    if (!studentId) return '학생';
    return studentId.substring(studentId.length - 2);
  }

  const isAdmin = userData?.email === 'admin@jongdalsem.com';

  if (!user || !userData) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src="https://placehold.co/100x100.png" alt="@student" data-ai-hint="person avatar" />
            <AvatarFallback>{isAdmin ? '관리' : getInitials(userData?.studentId)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{isAdmin ? '관리자' : `학생 (${userData.studentId})`}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userData.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link href="/admin">관리자 페이지</Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        {isAdmin && <DropdownMenuSeparator />}
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer" disabled={isLoggingOut}>
           {isLoggingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
           로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
