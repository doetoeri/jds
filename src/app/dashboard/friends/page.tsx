
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
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) throw new Error('현재 사용자 정보를 찾을 수 없습니다.');
      
      const userData = userDocSnap.data();
      const currentUserStudentId = userData.studentId;
      const currentUserMateCode = userData.mateCode;
      setMateCode(currentUserMateCode);

      const friendStudentIds = new Set<string>();

      // 1. Find users whose mate codes I have used. (They are my friends)
      const usedMateCodesQuery = query(
        collection(db, 'codes'),
        where('type', '==', '메이트코드'),
        where('participants', 'array-contains', currentUserStudentId)
      );
      const usedMateCodesSnapshot = await getDocs(usedMateCodesQuery);
      usedMateCodesSnapshot.forEach(doc => {
        const codeData = doc.data();
        // The owner of the code is a friend.
        if (codeData.ownerStudentId !== currentUserStudentId) {
          friendStudentIds.add(codeData.ownerStudentId);
        }
      });
      
      // 2. Find users who have used my mate code. (They are my friends)
      if (currentUserMateCode) {
          const myMateCodeQuery = query(
              collection(db, 'codes'),
              where('type', '==', '메이트코드'),
              where('code', '==', currentUserMateCode)
          );
          const myMateCodeSnapshot = await getDocs(myMateCodeQuery);
          if (!myMateCodeSnapshot.empty) {
              const myCodeDoc = myMateCodeSnapshot.docs[0];
              const participants = myCodeDoc.data().participants as string[];
              participants.forEach(pId => {
                  if (pId !== currentUserStudentId) {
                      friendStudentIds.add(pId);
                  }
              });
          }
      }

      const uniqueFriendIds = Array.from(friendStudentIds);
      
      if (uniqueFriendIds.length === 0) {
          setFriends([]);
          setIsLoading(false);
          return;
      }

      const usersQuery = query(collection(db, 'users'), where('studentId', 'in', uniqueFriendIds));
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
    <div>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
          <Users className="mr-2 h-6 w-6" />
          내 친구 목록
        </h1>
        <p className="text-muted-foreground">
          나의 메이트 코드를 사용했거나, 내가 메이트 코드를 사용한 친구들입니다.
        </p>
      </div>
        
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
        <Card>
          <CardContent className="text-center py-16 px-4">
            <Smile className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium text-muted-foreground">아직 친구가 없어요</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              대시보드에서 나의 메이트 코드 <strong className="text-primary font-mono">{mateCode || '...'}</strong>를 친구에게 공유하고 함께 포인트를 받아보세요!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
