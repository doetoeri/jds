'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const [user] = useAuthState(auth);
  const [lakBalance, setLakBalance] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setLakBalance(doc.data().lak);
        } else {
          // This case should ideally not happen for a logged-in user
          console.error("User document not found!");
          setLakBalance(0);
        }
      });
      // Cleanup subscription on unmount
      return () => unsubscribe();
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
      </div>
    </div>
  );
}
