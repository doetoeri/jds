
'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { auth, db, joinTeamLink } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, onSnapshot, getDoc, collection, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Users, Link as LinkIcon, Gift, Check, Loader2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';


interface TeamMember {
  studentId: string;
  displayName: string;
  avatarGradient: string;
}

interface TeamLinkData {
    members: string[];
    isComplete: boolean;
}

export default function LinksPage() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  
  const [teamLinkData, setTeamLinkData] = useState<TeamLinkData | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLinkCode, setTeamLinkCode] = useState<string | null>(null);
  
  const [friendCode, setFriendCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
        setIsLoading(false);
        return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            setTeamLinkCode(doc.data().teamLinkCode);
        }
    });
    
    return () => unsubscribeUser();

  }, [user]);

  useEffect(() => {
    if (!teamLinkCode) {
      setIsLoading(false);
      return;
    };

    const teamLinkRef = doc(db, 'team_links', teamLinkCode);
    const unsubscribeTeamLink = onSnapshot(teamLinkRef, async (docSnap) => {
        setIsLoading(true);
        if (docSnap.exists()) {
            const data = docSnap.data() as TeamLinkData;
            setTeamLinkData(data);

            if (data.members && data.members.length > 0) {
                // To fetch details, we might need a more complex query or denormalization
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('studentId', 'in', data.members));
                const querySnapshot = await getDocs(q);
                
                const membersDetails: TeamMember[] = [];
                querySnapshot.forEach((userDoc) => {
                    const userData = userDoc.data();
                    membersDetails.push({
                        studentId: userData.studentId,
                        displayName: userData.displayName,
                        avatarGradient: userData.avatarGradient || 'orange'
                    });
                });
                
                // Ensure the order is the same as in data.members
                const sortedMemberDetails = data.members.map(studentId => 
                    membersDetails.find(m => m.studentId === studentId)!
                ).filter(Boolean);

                setTeamMembers(sortedMemberDetails);
            } else {
                setTeamMembers([]);
            }
        }
        setIsLoading(false);
    });

    return () => unsubscribeTeamLink();

  }, [teamLinkCode]);
  
  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !friendCode) return;
    
    setIsJoining(true);
    try {
      const result = await joinTeamLink(user.uid, friendCode.toUpperCase());
      if (result.success) {
        toast({ title: '성공!', description: result.message });
        setFriendCode('');
      } else {
        toast({ title: '오류', description: result.message, variant: 'destructive' });
      }
    } catch(error: any) {
      toast({ title: '치명적 오류', description: error.message, variant: 'destructive'});
    } finally {
      setIsJoining(false);
    }
  }

  const handleCopyToClipboard = () => {
    if (!teamLinkCode) return;
    navigator.clipboard.writeText(teamLinkCode);
    toast({ description: "팀 링크 코드가 복사되었습니다." });
  }
  
  const getInitials = (member: TeamMember) => {
    return member.displayName?.substring(0, 1).toUpperCase() || member.studentId?.substring(member.studentId.length - 2) || '친구';
  }

  const memberSlots = Array.from({ length: 5 });
  const currentMemberCount = teamMembers.length;

  return (
    <div>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
          <LinkIcon className="mr-2 h-6 w-6" />
          팀 링크
        </h1>
        <p className="text-muted-foreground">
          친구들과 팀을 만들어 보너스 포인트를 획득하세요!
        </p>
      </div>
        
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>나의 팀 링크 코드</CardTitle>
            <CardDescription>
              친구에게 이 코드를 공유하여 팀원을 모으세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && !teamLinkCode ? (
              <Skeleton className="h-10 w-full" />
            ) : teamLinkCode ? (
              <div className="flex items-center gap-2">
                <Input value={teamLinkCode} readOnly className="font-mono text-lg tracking-widest"/>
                <Button variant="outline" size="icon" onClick={handleCopyToClipboard}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">팀 링크 코드를 불러오는 중입니다...</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>친구 팀에 합류하기</CardTitle>
            <CardDescription>
              친구에게 받은 팀 링크 코드를 입력하세요.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleJoinTeam}>
            <CardContent>
              <Label htmlFor="friend-code">친구의 팀 링크 코드</Label>
              <Input 
                id="friend-code" 
                value={friendCode} 
                onChange={(e) => setFriendCode(e.target.value)} 
                disabled={isJoining}
                placeholder="코드를 여기에 입력"
                className="font-mono"
                autoCapitalize="characters"
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isJoining || !friendCode} className="ml-auto">
                {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                합류하기
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      <Card className="mt-6">
          <CardHeader>
            <CardTitle>나의 팀 현황</CardTitle>
            <CardDescription>
              {isLoading ? <Skeleton className="h-4 w-48"/> :
               teamLinkData?.isComplete 
                ? '팀이 완성되었습니다! 모두 보너스를 받았습니다.' 
                : `${5 - currentMemberCount}명의 팀원이 더 필요합니다.`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center gap-4 sm:gap-6 p-4 bg-muted/50 rounded-lg">
                {memberSlots.map((_, i) => {
                  const member = teamMembers[i];
                  return (
                    <div key={i} className="flex flex-col items-center gap-2">
                      {isLoading ? <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 rounded-full" /> : 
                      member ? (
                        <Avatar className={cn('h-16 w-16 sm:h-20 sm:w-20', `gradient-${member.avatarGradient}`)}>
                          <AvatarFallback className="text-xl sm:text-2xl text-white bg-transparent font-bold">
                              {getInitials(member)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-background border-2 border-dashed flex items-center justify-center">
                          <Users className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground"/>
                        </div>
                      )}
                      <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                        {isLoading ? <Skeleton className="h-4 w-12"/> : member ? member.displayName : '미정'}
                      </span>
                    </div>
                  );
                })}
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
                {isLoading ? <Skeleton className="h-5 w-24"/> :
                teamLinkData?.isComplete ? (
                    <>
                        <Check className="h-5 w-5 text-green-500"/>
                        <p className="font-bold text-green-500">팀 완성!</p>
                    </>
                ) : (
                    <>
                        <Gift className="h-4 w-4" />
                        <p>5명이 모이면 모두 <strong className="text-primary">7포인트</strong> 획득!</p>
                    </>
                )}
            </div>
          </CardContent>
      </Card>
    </div>
  );
}
