'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UserPlus, Users } from 'lucide-react';

interface MateInfo {
  usedMyId: string[];
  usedFriendId: string[];
}

export default function MatesPage() {
  const [user] = useAuthState(auth);
  const [mateInfo, setMateInfo] = useState<MateInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchMateInfo = async () => {
      setIsLoading(true);
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          setMateInfo({
            usedMyId: data.usedMyId || [],
            usedFriendId: data.usedFriendId || [],
          });
        }
      } catch (error) {
        console.error("Error fetching mate info:", error);
        toast({ title: "오류", description: "친구 정보를 불러오는 데 실패했습니다.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMateInfo();
  }, [user, toast]);

  return (
    <div>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
          <Users className="mr-2 h-6 w-6" />
          친구
        </h1>
        <p className="text-muted-foreground">
          친구 초대 내역을 확인합니다.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserPlus className="text-primary"/> 내가 초대한 친구</CardTitle>
            <CardDescription>내 학번을 입력하여 포인트를 받은 친구들입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <Skeleton className="h-10 w-full" />
            ) : mateInfo?.usedMyId.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">아직 아무도 나를 초대하지 않았습니다.</p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {mateInfo?.usedMyId.map((studentId) => (
                        <div key={studentId} className="bg-muted px-3 py-1.5 rounded-md font-mono text-sm font-semibold">
                            {studentId}
                        </div>
                    ))}
                </div>
            )}
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserPlus className="text-primary"/> 나를 초대한 친구</CardTitle>
            <CardDescription>내가 학번을 입력하여 포인트를 받은 친구입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <Skeleton className="h-10 w-full" />
            ) : mateInfo?.usedFriendId.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">아직 친구의 학번을 사용하지 않았습니다.</p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {mateInfo?.usedFriendId.map((studentId) => (
                        <div key={studentId} className="bg-muted px-3 py-1.5 rounded-md font-mono text-sm font-semibold">
                            {studentId}
                        </div>
                    ))}
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
