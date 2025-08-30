
'use client';

import { useState, useEffect, useRef } from 'react';
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
import { auth, db, submitWord } from '@/lib/firebase';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Send, Gamepad, Languages } from 'lucide-react';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import Link from 'next/link';

interface Turn {
    word: string;
    studentId: string;
    displayName: string;
    createdAt: Timestamp;
}

interface GameState {
    history: Turn[];
}

export default function WordChainPage() {
    const [user] = useAuthState(auth);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [currentWord, setCurrentWord] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const gameRef = doc(db, "games", "word-chain");
        const unsubscribe = onSnapshot(gameRef, (doc) => {
            if (doc.exists()) {
                setGameState(doc.data() as GameState);
            } else {
                setGameState({ history: [] }); // Start with an empty history
            }
            setIsLoading(false);
            
            // Auto-scroll to bottom
            setTimeout(() => {
                if (scrollAreaRef.current) {
                    scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
                }
            }, 100);
        }, (error) => {
            console.error("Error fetching game state: ", error);
            toast({ title: "오류", description: "게임 정보를 불러오는 데 실패했습니다.", variant: "destructive" });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);
    
    const handleWordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !currentWord.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const result = await submitWord(user.uid, currentWord.trim());
            if (result.success) {
                toast({ title: "성공!", description: result.message });
                setCurrentWord('');
            } else {
                toast({ title: "오류", description: result.message, variant: "destructive" });
            }
        } catch (error: any) {
             toast({ title: "치명적 오류", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const lastWord = gameState?.history?.[gameState.history.length - 1]?.word;
    const lastLetter = lastWord ? lastWord.charAt(lastWord.length - 1) : '';

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline text-2xl"><Languages/> 실시간 끝말잇기</CardTitle>
                    <CardDescription>
                        다른 친구들과 함께 끝말잇기를 이어가 보세요! 규칙에 맞게 단어를 이으면 하루에 한 번 1포인트를 드립니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div ref={scrollAreaRef} className="w-full h-64 bg-muted rounded-lg p-4 overflow-y-auto flex flex-col gap-2 text-sm">
                        {isLoading ? (
                            <Loader2 className="h-6 w-6 animate-spin mx-auto my-auto"/>
                        ) : gameState?.history && gameState.history.length > 0 ? (
                           <AnimatePresence>
                             {gameState.history.map((turn, index) => (
                                <motion.div 
                                    key={index}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex"
                                >
                                    <span className="font-bold w-16 shrink-0">{turn.displayName}:</span>
                                    <span className="px-3 py-1 rounded-full bg-background break-all">
                                        {turn.word}
                                    </span>
                                </motion.div>
                            ))}
                           </AnimatePresence>
                        ) : (
                            <p className="text-center text-muted-foreground m-auto">아직 아무도 시작하지 않았어요. 첫 단어를 입력해보세요!</p>
                        )}
                    </div>
                    <form onSubmit={handleWordSubmit} className="flex gap-2">
                        <Input 
                            value={currentWord}
                            onChange={(e) => setCurrentWord(e.target.value)}
                            placeholder={lastLetter ? `'${lastLetter}' (으)로 시작하는 단어` : '시작 단어 입력'}
                            disabled={isSubmitting || !user}
                        />
                        <Button type="submit" disabled={isSubmitting || !user || !currentWord.trim()}>
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send />}
                        </Button>
                    </form>
                </CardContent>
                 <CardFooter className="flex-col gap-2">
                    {!user && <p className="text-sm text-destructive">로그인 후 참여할 수 있습니다.</p>}
                     <Button variant="link" asChild>
                        <Link href="/guestbook">비밀 방명록 남기러 가기</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
