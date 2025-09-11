
'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { auth, db, postTeamChatMessage } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, onSnapshot, getDocs, collection, query, where, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Users, Link as LinkIcon, Gift, Check, Loader2, Copy, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TeamMember {
  studentId: string;
  displayName: string;
  avatarGradient: string;
}

interface TeamLinkData {
  members: string[];
  isComplete: boolean;
}

interface TeamMessage {
  id: string;
  uid: string;
  text: string;
  createdAt: Timestamp;
  displayName: string;
  avatarGradient: string;
}

export default function LinksPage() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  
  const [teamLinkData, setTeamLinkData] = useState<TeamLinkData | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [mateCode, setMateCode] = useState<string | null>(null);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Chat state
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (userDoc) => {
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setMateCode(userData.mateCode);
        setActiveTeamId(userData.activeTeamId);
      }
    });
    
    return () => unsubscribeUser();
  }, [user]);

  useEffect(() => {
    if (!activeTeamId) {
        setIsLoading(false);
        return;
    }

    const teamLinkRef = doc(db, 'team_links', activeTeamId);
    const unsubscribeTeamLink = onSnapshot(teamLinkRef, async (teamDoc) => {
      setIsLoading(true);
      if (teamDoc.exists()) {
        const data = teamDoc.data() as TeamLinkData;
        setTeamLinkData(data);

        if (data.members && data.members.length > 0) {
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

    const messagesQuery = query(collection(db, `team_chats/${activeTeamId}/messages`), orderBy('createdAt', 'asc'));
    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMessage));
        setMessages(msgs);
        setTimeout(() => {
            const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
            if (viewport) {
                viewport.scrollTop = viewport.scrollHeight;
            }
        }, 100);
    });


    return () => {
        unsubscribeTeamLink();
        unsubscribeMessages();
    };
  }, [activeTeamId]);
  
  const handleCopyToClipboard = () => {
    if (!mateCode) return;
    navigator.clipboard.writeText(mateCode);
    toast({ description: "나의 메이트코드가 복사되었습니다." });
  };
  
  const getInitials = (member: TeamMember | TeamMessage) => {
    return member.displayName?.substring(0, 1).toUpperCase() || '?';
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeTeamId || !newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
        await postTeamChatMessage(user.uid, activeTeamId, newMessage);
        setNewMessage('');
    } catch(error: any) {
        toast({ title: '전송 실패', description: error.message, variant: 'destructive' });
    } finally {
        setIsSending(false);
    }
  };

  const memberSlots = Array.from({ length: 5 });
  const currentMemberCount = teamMembers.length;

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
              <LinkIcon className="mr-2 h-6 w-6" />
              나의 팀 현황
            </h1>
            <p className="text-muted-foreground">
              친구들과 팀을 만들어 보너스 포인트를 획득하세요!
            </p>
          </div>
        
          <Card>
            <CardHeader>
              <CardTitle>나의 메이트코드 (팀 초대코드)</CardTitle>
              <CardDescription>
                친구에게 이 코드를 공유하여 팀원을 모으세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && !mateCode ? (
                <Skeleton className="h-10 w-full" />
              ) : mateCode ? (
                <div className="flex items-center gap-2">
                  <Input value={mateCode} readOnly className="font-mono text-lg tracking-widest"/>
                  <Button variant="outline" size="icon" onClick={handleCopyToClipboard}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">메이트코드를 불러오는 중입니다...</p>
              )}
            </CardContent>
          </Card>

          <Card>
              <CardHeader>
                <CardTitle>현재 팀 진행상황</CardTitle>
                <CardDescription>
                  {isLoading ? <Skeleton className="h-4 w-48"/> :
                  teamLinkData?.isComplete 
                    ? '팀이 완성되었습니다! 모두 보너스를 받았습니다.' 
                    : `팀을 완성하기까지 ${5 - currentMemberCount}명의 친구가 더 필요합니다.`
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
                              <Users className="h-6 w-6 sm:h-8 sm-w-8 text-muted-foreground"/>
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

      <div className="lg:sticky lg:top-6">
        <Card className="h-full flex flex-col max-h-[calc(100vh-120px)]">
             <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageCircle />
                    팀 채팅
                </CardTitle>
                <CardDescription>
                    현재 팀원들과 대화를 나눠보세요.
                </CardDescription>
             </CardHeader>
             <CardContent className="flex-grow overflow-hidden">
                <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-6 w-6 animate-spin"/>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex justify-center items-center h-full">
                            <p className="text-muted-foreground">아직 나눈 대화가 없습니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map(msg => (
                                <div key={msg.id} className={cn("flex items-start gap-3", msg.uid === user?.uid ? "flex-row-reverse" : "")}>
                                    <Avatar className={cn("h-8 w-8", `gradient-${msg.avatarGradient}`)}>
                                        <AvatarFallback className="text-white font-bold bg-transparent">
                                            {getInitials(msg)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className={cn("p-3 rounded-lg max-w-[80%]", msg.uid === user?.uid ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                        <p className="font-bold text-xs mb-1">{msg.displayName}</p>
                                        <p className="text-sm break-words">{msg.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
             </CardContent>
             <CardFooter>
                <form onSubmit={handleSendMessage} className="flex w-full gap-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="팀에게 메시지 보내기..."
                        disabled={isSending || isLoading}
                    />
                    <Button type="submit" disabled={isSending || isLoading || !newMessage.trim()}>
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send />}
                    </Button>
                </form>
             </CardFooter>
        </Card>
      </div>
    </div>
  );
}
