
'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Users, Smile, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';


interface FriendData {
  id: string;
  studentId: string;
  displayName: string;
  avatarGradient: string;
}

export default function FriendsPage() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mateCode, setMateCode] = useState<string | null>(null);
  const router = useRouter();

  const fetchFriends = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    try {
      // 1. Get current user's studentId
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) throw new Error('현재 사용자 정보를 찾을 수 없습니다.');
      const userData = userDocSnap.data();
      const currentUserStudentId = userData.studentId;
      setMateCode(userData.mateCode);

      // 2. Find all mate code documents where the current user is a participant
      const friendsQuery = query(
        collection(db, 'codes'),
        where('type', '==', '메이트코드'),
        where('participants', 'array-contains', currentUserStudentId)
      );
      const friendsSnapshot = await getDocs(friendsQuery);

      if (friendsSnapshot.empty) {
        setIsLoading(false);
        return;
      }

      const friendStudentIdsSet = new Set<string>();
      friendsSnapshot.forEach(doc => {
          const participants = doc.data().participants as string[];
          participants.forEach(pId => {
              if (pId !== currentUserStudentId) {
                  friendStudentIdsSet.add(pId);
              }
          });
      });
      
      const friendStudentIds = Array.from(friendStudentIdsSet);

      if (friendStudentIds.length === 0) {
          setIsLoading(false);
          return;
      }

      // 3. Fetch user data for each friend
      const usersQuery = query(collection(db, 'users'), where('studentId', 'in', friendStudentIds));
      const usersSnapshot = await getDocs(usersQuery);

      const friendsData = usersSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
              id: doc.id,
              studentId: data.studentId,
              displayName: data.displayName || `학생 (${data.studentId})`,
              avatarGradient: data.avatarGradient || 'orange',
          } as FriendData
      });

      setFriends(friendsData);

    } catch (error: any) {
      console.error('Error fetching friends:', error);
      toast({
        title: '오류',
        description: error.message || '친구 목록을 불러오는 데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);
  
  const getInitials = (displayName: string, studentId: string) => {
    return displayName?.substring(0, 1).toUpperCase() || studentId?.substring(studentId.length - 2) || '친구';
  }

  const handleSendLetter = (friendStudentId: string) => {
    router.push(`/dashboard/letters?to=${friendStudentId}`);
  };


  return (
     <div className="container mx-auto max-w-4xl p-0 sm:p-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <Users className="mr-2 h-6 w-6" />
            내 친구 목록
          </CardTitle>
          <CardDescription>
            나의 메이트 코드를 사용했거나, 내가 메이트 코드를 사용한 친구들입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                      <Card key={i} className="p-4 flex flex-col items-center justify-center gap-3">
                          <Skeleton className="w-20 h-20 rounded-full" />
                          <Skeleton className="h-5 w-24" />
                          <Skeleton className="h-4 w-16" />
                      </Card>
                  ))}
              </div>
          ) : friends.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {friends.map((friend) => (
                <Card key={friend.id} className="p-4 flex flex-col items-center justify-center gap-2 transform transition-transform hover:scale-105">
                  <Avatar className={cn('h-20 w-20', `gradient-${friend.avatarGradient}`)}>
                      <AvatarFallback className="text-3xl text-white bg-transparent font-bold">
                          {getInitials(friend.displayName, friend.studentId)}
                      </AvatarFallback>
                  </Avatar>
                  <p className="font-bold text-center">{friend.displayName}</p>
                  <p className="text-sm text-muted-foreground">{friend.studentId}</p>
                  <CardFooter className="p-0 mt-2">
                      <Button variant="outline" size="sm" onClick={() => handleSendLetter(friend.studentId)}>
                          <Send className="mr-1 h-3.5 w-3.5" />
                          편지 쓰기
                      </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-4 border-2 border-dashed rounded-lg">
              <Smile className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium text-muted-foreground">아직 친구가 없어요</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                대시보드에서 나의 메이트 코드 <strong className="text-primary font-mono">{mateCode || '...'}</strong>를 친구에게 공유하고 함께 Lak을 받아보세요!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
