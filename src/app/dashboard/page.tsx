'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, Mail } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export default function DashboardPage() {
  const [user] = useAuthState(auth);
  const [lakBalance, setLakBalance] = useState<number | null>(null);
  const [hasNewLetters, setHasNewLetters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      // Subscribe to Lak balance changes
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeLak = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setLakBalance(doc.data().lak);
        } else {
          console.error("User document not found!");
          setLakBalance(0);
        }
      });
      
      // Check for new letters
      const checkForNewLetters = async () => {
         try {
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const currentUserStudentId = userDocSnap.data().studentId;
                const q = query(
                    collection(db, 'letters'),
                    where('receiverStudentId', '==', currentUserStudentId),
                    where('status', '==', 'approved'),
                    where('isRead', '==', false) // Check for unread letters
                );
                const querySnapshot = await getDocs(q);
                setHasNewLetters(!querySnapshot.empty);
            }
        } catch (error) {
            console.error("Error checking for new letters:", error);
        } finally {
            setIsLoading(false);
        }
      };
      
      checkForNewLetters();

      // Cleanup subscription on unmount
      return () => unsubscribeLak();
    } else {
        setIsLoading(false);
    }
  }, [user]);

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight font-headline">대시보드</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">나의 Lak</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {lakBalance === null ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{lakBalance.toLocaleString()} Lak</div>
            )}
            <p className="text-xs text-muted-foreground">
              (1 라크 = 500원)
            </p>
          </CardContent>
        </Card>
        
        {isLoading ? (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <Skeleton className="h-5 w-32" />
                     <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-48" />
                </CardContent>
            </Card>
        ) : hasNewLetters ? (
            <Link href="/dashboard/letters?tab=inbox" className="block animate-in fade-in slide-in-from-bottom-5 duration-500">
                <Card className="bg-primary/10 border-primary/30 hover:bg-primary/20 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-primary">새로운 소식</CardTitle>
                    <Mail className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-xl font-bold text-primary">새로운 편지가 도착했어요!</div>
                    <p className="text-xs text-primary/80">
                    지금 바로 받은 편지함을 확인해보세요.
                    </p>
                </CardContent>
                </Card>
            </Link>
        ) : null}

      </div>
    </div>
  );
}
