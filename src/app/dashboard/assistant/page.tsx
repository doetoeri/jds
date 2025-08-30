
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { Loader2, Send, Wand2, Bot } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { chat, ChatHistory } from '@/ai/flows/assistant-flow';
import { AnimatePresence, motion } from 'framer-motion';

export default function AssistantPage() {
  const [history, setHistory] = useState<ChatHistory>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, userLoading] = useAuthState(auth);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (history.length === 0 && !isLoading) {
      setIsLoading(true);
      setTimeout(() => {
        setHistory([
          {
            role: 'model',
            content: [{ text: '안녕하세요! 저는 종달샘 허브의 AI 어시스턴트, 종달이예요. 무엇을 도와드릴까요? (예: "코드 사용해줘", "20101에게 편지 보내줘")' }],
          },
        ]);
        setIsLoading(false);
      }, 500);
    }
  }, []);

  useEffect(() => {
    // Scroll to bottom when history changes
    const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [history]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading || !user) {
        if (!user) toast({title: "오류", description: "로그인이 필요합니다.", variant: "destructive"});
        return;
    }

    const newHistory: ChatHistory = [...history, { role: 'user', content: [{ text: message }] }];
    setHistory(newHistory);
    setMessage('');
    setIsLoading(true);

    try {
      const response = await chat({ message, history });
      const newAssistantHistory = [...newHistory, response];
      setHistory(newAssistantHistory);
    } catch (error: any) {
      toast({ title: 'AI 응답 오류', description: error.message || 'AI 어시스턴트와 통신 중 오류가 발생했습니다.', variant: 'destructive' });
       setHistory(prev => [...prev, {role: 'model', content: [{text: "죄송해요, 오류가 발생했어요. 다시 시도해주세요."}]}])
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderContent = (contentItem: any) => {
      if (contentItem.text) {
          return <p className="text-sm break-words">{contentItem.text}</p>
      }
      if (contentItem.toolRequest) {
          const {name, input} = contentItem.toolRequest;
          return <div className="text-xs text-muted-foreground italic">[도구 사용: {name}, 입력값: {JSON.stringify(input)}]</div>
      }
       if (contentItem.toolResponse) {
          const {name, output} = contentItem.toolResponse;
          return <div className="text-xs text-muted-foreground italic">[도구 결과: {name}, 결과: {JSON.stringify(output.message || output)}]</div>
      }
      return null;
  }

  return (
    <div className="h-full flex flex-col max-h-[calc(100vh-100px)]">
      <div className="space-y-1 mb-6">
            <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center gap-2">
                <Wand2 className="h-6 w-6"/>
                AI 어시스턴트 '종달이'
            </h1>
            <p className="text-muted-foreground">
                '종달이'에게 말을 걸어 종달샘 허브의 기능을 이용해보세요.
            </p>
        </div>

        <div className="flex-grow overflow-hidden pr-4">
            <ScrollArea className="h-full" ref={scrollAreaRef}>
                <AnimatePresence>
                {history.map((msg, index) => (
                    <motion.div 
                        key={index}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className={cn(
                            "flex items-start gap-3 mb-4",
                            msg.role === 'user' ? "flex-row-reverse" : ""
                        )}
                    >
                        <Avatar className={cn(
                            "h-8 w-8",
                            msg.role === 'model' ? 'gradient-amber' : 'gradient-blue'
                        )}>
                            <AvatarFallback className="text-sm text-white font-bold bg-transparent">
                                {msg.role === 'model' ? <Bot/> : '나'}
                            </AvatarFallback>
                        </Avatar>
                        <div className={cn(
                            "p-3 rounded-lg max-w-[80%]",
                            msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                            {msg.content.map((c, i) => <div key={i}>{renderContent(c)}</div>)}
                        </div>
                    </motion.div>
                ))}
                {isLoading && history.length > 0 && (
                     <motion.div 
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-3 mb-4">
                        <Avatar className="h-8 w-8 gradient-amber">
                            <AvatarFallback className="text-sm text-white font-bold bg-transparent"><Bot/></AvatarFallback>
                        </Avatar>
                        <div className="p-3 rounded-lg bg-muted">
                            <Loader2 className="h-5 w-5 animate-spin"/>
                        </div>
                     </motion.div>
                )}
                </AnimatePresence>
            </ScrollArea>
        </div>

        <div className="mt-auto pt-4">
            <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
            <Input 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="종달이에게 메시지 보내기..." 
                disabled={isLoading || userLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || userLoading || !message.trim()}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
            </form>
        </div>
    </div>
  );
}
