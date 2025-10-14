
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, RadioTower } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, sendNotification } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, doc, getDoc } from 'firebase/firestore';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from './ui/label';

interface Message {
  id: string;
  uid: string;
  text: string;
  createdAt: Timestamp;
  authorName: string;
  authorRole: 'admin' | 'council';
}

export function CommunicationChannel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const [callCode, setCallCode] = useState('');
  const [callMessage, setCallMessage] = useState('');
  const [isCalling, setIsCalling] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, 'communication_channel'), orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      setIsLoading(false);
      setTimeout(() => {
        const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }, 0);
    }, (error) => {
      console.error("Error fetching messages: ", error);
      toast({ title: '오류', description: '메시지를 불러오는 데 실패했습니다.', variant: 'destructive' });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);
  

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    setIsSending(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) throw new Error('사용자 정보를 찾을 수 없습니다.');
      
      const userData = userDoc.data();
      const authorName = userData.memo || (userData.role === 'admin' ? '관리자' : userData.name || '학생회');
      const authorRole = userData.role;

      if (authorRole !== 'admin' && authorRole !== 'council' && authorRole !== 'council_booth') {
        throw new Error('메시지를 보낼 권한이 없습니다.');
      }

      await addDoc(collection(db, 'communication_channel'), {
        uid: user.uid,
        text: newMessage,
        createdAt: Timestamp.now(),
        authorName,
        authorRole,
      });

      setNewMessage('');
    } catch (error: any) {
      toast({ title: '전송 실패', description: error.message, variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };
  
  const handleCall = async () => {
      if (!callCode.trim() || !callMessage.trim()) {
          toast({ title: "입력 오류", description: "호출 코드와 메시지를 모두 입력해주세요.", variant: 'destructive' });
          return;
      }
      setIsCalling(true);
      try {
          await sendNotification(callCode, callMessage);
          toast({ title: "호출 완료", description: `${callCode} 담당자에게 알림을 보냈습니다.` });
          setCallCode('');
          setCallMessage('');
      } catch (e: any) {
          toast({ title: "호출 실패", description: e.message, variant: 'destructive'});
      } finally {
          setIsCalling(false);
      }
  }

  const getInitials = (name: string) => {
      if (name === '관리자') return 'A';
      return name.substring(0, 1) || 'S';
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>학생회 소통 채널</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full max-h-[calc(100vh-340px)] pr-4" ref={scrollAreaRef}>
          {isLoading && <Loader2 className="mx-auto h-6 w-6 animate-spin" />}
          {messages.map((msg, index) => (
            <div key={msg.id} className={cn(
                "flex items-start gap-3 mb-4",
                msg.uid === user?.uid ? "flex-row-reverse" : ""
            )}>
              <Avatar className={cn(
                  "h-8 w-8",
                  msg.authorRole === 'admin' ? 'bg-destructive' : 'bg-primary'
              )}>
                 <AvatarFallback className="text-sm text-white font-bold bg-transparent">
                    {getInitials(msg.authorName)}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                  "p-3 rounded-lg max-w-[80%]",
                   msg.uid === user?.uid ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                <p className="font-bold text-xs mb-1">{msg.authorName}</p>
                <p className="text-sm break-words">{msg.text}</p>
                <p className="text-xs text-right mt-1 opacity-70">
                    {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2">
        <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
          <Input 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="메시지를 입력하세요..." 
            disabled={isSending}
           />
          <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
         <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                    <RadioTower className="mr-2 h-4 w-4"/> 담당자 호출하기
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="grid gap-4">
                <div className="space-y-2">
                    <h4 className="font-medium leading-none">담당자 호출</h4>
                    <p className="text-sm text-muted-foreground">
                    특정 직책 담당자에게 브라우저 알림을 보냅니다.
                    </p>
                </div>
                <div className="grid gap-2">
                    <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="width">호출 코드</Label>
                        <Input
                            id="width"
                            value={callCode}
                            onChange={(e) => setCallCode(e.target.value.toUpperCase())}
                            placeholder="예: A계1"
                            className="col-span-2 h-8"
                        />
                    </div>
                     <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="height">메시지</Label>
                        <Input
                            id="height"
                            value={callMessage}
                            onChange={(e) => setCallMessage(e.target.value)}
                            placeholder="예: 계산대로 와주세요"
                            className="col-span-2 h-8"
                        />
                    </div>
                </div>
                <Button onClick={handleCall} disabled={isCalling}>
                    {isCalling && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    호출
                </Button>
                </div>
            </PopoverContent>
        </Popover>
      </CardFooter>
    </Card>
  );
}
