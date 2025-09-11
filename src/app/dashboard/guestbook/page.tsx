
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { auth, db, postGuestbookMessage } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Loader2, Send, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  uid: string;
  text: string;
  createdAt: Timestamp;
  displayName: string;
  avatarGradient: string;
}

export default function GuestbookPage() {
  const [user] = useAuthState(auth);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'guestbook'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      setIsLoading(false);
      setTimeout(() => {
        const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }, 100);
    }, (error) => {
      console.error("Error fetching guestbook:", error);
      toast({ title: '오류', description: '방명록을 불러오는 데 실패했습니다.', variant: 'destructive' });
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [toast]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await postGuestbookMessage(user.uid, newMessage);
      setNewMessage('');
    } catch (error: any) {
      toast({ title: '전송 실패', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => name.substring(0, 1).toUpperCase() || '?';

  return (
    <Card className="w-full max-w-2xl mx-auto h-[calc(100vh-120px)] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <MessageSquare />
          종달새 방명록
        </CardTitle>
        <CardDescription>
          모든 학생과 자유롭게 대화하고 소통하는 공간입니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <p className="text-muted-foreground">아직 아무도 글을 남기지 않았어요. 첫 메시지를 남겨보세요!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex items-start gap-3",
                    msg.uid === user?.uid ? "flex-row-reverse" : ""
                  )}
                >
                  <Avatar className={cn("h-8 w-8", `gradient-${msg.avatarGradient}`)}>
                    <AvatarFallback className="text-white font-bold bg-transparent">
                      {getInitials(msg.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn(
                      "p-3 rounded-lg max-w-[80%]",
                      msg.uid === user?.uid ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
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
            placeholder="메시지를 입력하세요..."
            disabled={isSubmitting || !user}
          />
          <Button type="submit" disabled={isSubmitting || !user || !newMessage.trim()}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send />}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
