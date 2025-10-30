
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { playWordChain } from '@/ai/flows/play-word-chain-flow';
import { Loader2, Send, MessageCircle, ArrowRight } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface Word {
    text: string;
    uid: string;
    displayName: string;
    avatarGradient: string;
}

export default function WordChainPage() {
  const [word, setWord] = useState('');
  const [history, setHistory] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const gameRef = doc(db, 'games', 'word-chain');
    const unsubscribe = onSnapshot(gameRef, (doc) => {
        if (doc.exists()) {
            setHistory(doc.data().history || []);
        }
        setIsLoading(false);
        setTimeout(() => {
            const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
            if (viewport) {
                viewport.scrollTop = viewport.scrollHeight;
            }
        }, 100);
    });
    return () => unsubscribe();
  }, []);

  const handlePlay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) return;
    if (!user) {
        toast({ title: "로그인 필요", description: "게임에 참여하려면 로그인이 필요합니다.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    try {
        const result = await playWordChain({userId: user.uid, word});
        if (result.success) {
            toast({ title: "성공!", description: result.message });
            setWord('');
        } else {
            toast({ title: "실패", description: result.message, variant: "destructive" });
        }
    } catch(error: any) {
        toast({ title: "오류", description: error.message || "알 수 없는 오류가 발생했습니다.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const getInitials = (displayName: string) => {
    return displayName.substring(0, 1).toUpperCase() || '?';
  }

  const lastWord = history.length > 0 ? history[history.length - 1].text : null;
  const placeholder = lastWord ? `'${lastWord[lastWord.length-1]}'(으)로 시작하는 단어` : '첫 단어를 입력하세요!';


  return (
    <div className="max-w-4xl mx-auto">
        <Card className="flex flex-col h-full max-h-[calc(100vh-160px)]">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageCircle />
                    실시간 끝말잇기
                </CardTitle>
                <CardDescription>
                    모두와 함께 끝말잇기를 이어가세요! 성공하면 리더보드 점수가 올라갑니다.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden">
                <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
                     {isLoading ? (
                         <div className="space-y-4">
                            <Skeleton className="h-12 w-2/3" />
                            <Skeleton className="h-12 w-2/3 ml-auto" />
                         </div>
                    ) : history.length === 0 ? (
                        <div className="flex justify-center items-center h-full">
                            <p className="text-muted-foreground">아직 기록이 없습니다. 첫 단어를 입력해보세요!</p>
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-center justify-center gap-2 p-4">
                            {history.map((h, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <div className={cn(
                                        "flex items-center gap-2 p-3 rounded-lg animate-in fade-in zoom-in-95",
                                        index === history.length - 1 ? 'bg-primary/20 ring-2 ring-primary' : 'bg-muted'
                                    )}>
                                        <Avatar className={cn("h-6 w-6 text-xs", `gradient-${h.avatarGradient}`)}>
                                            <AvatarFallback className="text-white font-bold bg-transparent">
                                                {getInitials(h.displayName)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="font-bold text-lg">{h.text}</span>
                                    </div>
                                    {index < history.length - 1 && <ArrowRight className="h-5 w-5 text-muted-foreground" />}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
            <CardFooter>
                 <form onSubmit={handlePlay} className="flex w-full gap-2">
                    <Input
                        value={word}
                        onChange={(e) => setWord(e.target.value)}
                        placeholder={placeholder}
                        disabled={isSubmitting || isLoading}
                    />
                    <Button type="submit" size="icon" disabled={isSubmitting || isLoading || !word.trim()}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
            </CardFooter>
        </Card>
    </div>
  );
}
