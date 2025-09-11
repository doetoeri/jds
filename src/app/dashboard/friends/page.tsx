
'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, onSnapshot, getDocs, collection, query, where, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Users, Link as LinkIcon, Gift } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface CompletedTeam {
  id: string;
  members: { studentId: string; displayName: string; avatarGradient: string }[];
  completedAt: Timestamp;
}

export default function FriendsPage() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  
  const [completedTeams, setCompletedTeams] = useState<CompletedTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, async (userDoc) => {
        if (!userDoc.exists()) {
            setIsLoading(false);
            return;
        }
        const currentUserStudentId = userDoc.data().studentId;

        const teamLinksQuery = query(
            collection(db, 'team_links'),
            where('members', 'array-contains', currentUserStudentId),
            where('isComplete', '==', true)
        );

        const unsubscribeTeams = onSnapshot(teamLinksQuery, async (querySnapshot) => {
            const teams: CompletedTeam[] = [];
            
            for (const docSnap of querySnapshot.docs) {
                const teamData = docSnap.data();
                const membersQuery = query(collection(db, 'users'), where('studentId', 'in', teamData.members));
                const membersSnapshot = await getDocs(membersQuery);
                
                const memberDetails = teamData.members.map((studentId: string) => {
                    const memberDoc = membersSnapshot.docs.find(d => d.data().studentId === studentId);
                    if (!memberDoc) return { studentId, displayName: '알 수 없음', avatarGradient: 'gray' };
                    const memberData = memberDoc.data();
                    return {
                        studentId: memberData.studentId,
                        displayName: memberData.displayName,
                        avatarGradient: memberData.avatarGradient || 'orange'
                    };
                }).filter(Boolean);

                teams.push({
                    id: docSnap.id,
                    members: memberDetails,
                    completedAt: teamData.completedAt || teamData.createdAt,
                });
            }
            
            teams.sort((a, b) => b.completedAt.toMillis() - a.completedAt.toMillis());
            setCompletedTeams(teams);
            setIsLoading(false);
        });
        
        return () => unsubscribeTeams();
    });
    
    return () => unsubscribeUser();

  }, [user, toast]);
  
  const getInitials = (member: { displayName?: string, studentId?: string }) => {
    return member.displayName?.substring(0, 1).toUpperCase() || member.studentId?.substring(member.studentId.length - 2) || '친구';
  }

  return (
    <div>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
          <Users className="mr-2 h-6 w-6" />
          완성된 팀 링크
        </h1>
        <p className="text-muted-foreground">
          지금까지 친구들과 함께 완성한 팀 링크 기록입니다.
        </p>
      </div>
      
        {isLoading ? (
            <div className="space-y-4">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        ) : completedTeams.length === 0 ? (
            <Card className="text-center py-16">
                <CardContent className="flex flex-col items-center gap-4">
                    <Users className="h-12 w-12 text-muted-foreground"/>
                    <p className="text-muted-foreground">아직 완성된 팀 링크가 없습니다.</p>
                    <Button asChild>
                        <Link href="/dashboard/codes">
                            <LinkIcon className="mr-2 h-4 w-4"/>
                            메이트코드로 팀 만들러 가기
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        ) : (
            <div className="space-y-6">
                {completedTeams.map(team => (
                     <Card key={team.id}>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">
                                {team.completedAt.toDate().toLocaleDateString()}에 완성됨
                            </CardTitle>
                             <CardDescription className="flex items-center gap-1.5 text-primary font-bold">
                                <Gift className="h-4 w-4"/>
                                팀원 모두 7포인트 획득!
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="flex justify-center items-center gap-2 sm:gap-4 p-4 bg-muted/50 rounded-lg">
                                {team.members.map((member, i) => (
                                    <div key={i} className="flex flex-col items-center gap-2">
                                        <Avatar className={cn('h-12 w-12 sm:h-16 sm:w-16', `gradient-${member.avatarGradient}`)}>
                                        <AvatarFallback className="text-lg sm:text-xl text-white bg-transparent font-bold">
                                            {getInitials(member)}
                                        </AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                                            {member.displayName}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}
    </div>
  );
}
