'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, doc, getDoc } from 'firebase/firestore';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';
import { cn } from '@/lib/utils';

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
      const authorName = userData.role === 'admin' ? '관리자' : userData.name || '학생회';
      const authorRole = userData.role;

      if (authorRole !== 'admin' && authorRole !== 'council') {
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
        <ScrollArea className="h-full max-h-[calc(100vh-300px)] pr-4" ref={scrollAreaRef}>
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
      <CardFooter>
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
      </CardFooter>
    </Card>
  );
}
