
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { auth, db, submitWord } from '@/lib/firebase';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Send, Gamepad, RefreshCcw } from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, onSnapshot } from 'firebase/firestore';

const formSchema = z.object({
  displayName: z.string().min(2, '닉네임은 2자 이상이어야 합니다.').max(10, '닉네임은 10자 이하여야 합니다.'),
});
type FormValues = z.infer<typeof formSchema>;

type GameStep = 'form' | 'game';

interface Turn {
    word: string;
    displayName: string;
    uid: string;
}

interface GameState {
    words: Turn[];
    lastWord?: string;
    lastPlayerId?: string;
    gameId?: string;
}

export default function WordChainPage() {
    const [user, userLoading] = useAuthState(auth);
    const [gameStep, setGameStep] = useState<GameStep>('form');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const { toast } = useToast();
    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
    });

    const [gameState, setGameState] = useState<GameState | null>(null);
    const [myDisplayName, setMyDisplayName] = useState('');
    const [currentWord, setCurrentWord] = useState('');
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [isGameLoading, setIsGameLoading] = useState(true);

    useEffect(() => {
        const gameRef = doc(db, 'word-chain-game', 'current-game');
        const unsubscribe = onSnapshot(gameRef, (doc) => {
            if (doc.exists()) {
                setGameState(doc.data() as GameState);
            } else {
                // No game state, maybe initialize one
                setGameState({ words: [] });
            }
            setIsGameLoading(false);
        });

        return () => unsubscribe();
    }, []);
    
    useEffect(() => {
        // Scroll to bottom when new words are added
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    }, [gameState?.words]);

    const onDisplayNameSubmit: SubmitHandler<FormValues> = async (data) => {
        setMyDisplayName(data.displayName);
        setGameStep('game');
    };
    
    const handleWordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentWord.trim() || !user) return;

        const lastWord = gameState?.lastWord;
        if (lastWord && lastWord.charAt(lastWord.length - 1) !== currentWord.charAt(0)) {
            toast({ title: "규칙 위반!", description: `'${lastWord.slice(-1)}'(으)로 시작하는 단어를 입력해야 합니다.`, variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            await submitWord(user.uid, myDisplayName, currentWord);
            setCurrentWord('');
        } catch (error: any) {
            toast({ title: "오류", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const lastCharacter = gameState?.lastWord ? gameState.lastWord.slice(-1) : '';

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-md">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={gameStep}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {gameStep === 'form' && (
                             <form onSubmit={handleSubmit(onDisplayNameSubmit)}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 font-headline text-2xl"><Gamepad/> 실시간 끝말잇기</CardTitle>
                                    <CardDescription>다른 친구들과 함께 끝말잇기를 즐겨보세요! 게임에 사용할 닉네임을 먼저 입력해주세요.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="space-y-1">
                                        <Label htmlFor="displayName">닉네임</Label>
                                        <Input id="displayName" {...register('displayName')} placeholder="예: 고촌중캡틴" disabled={isSubmitting}/>
                                        {errors.displayName && <p className="text-xs text-destructive">{errors.displayName.message}</p>}
                                    </div>
                                </CardContent>
                                <CardFooter className="flex-col gap-4">
                                    <Button type="submit" className="w-full" disabled={isSubmitting || userLoading}>
                                        {(isSubmitting || userLoading) ? <Loader2 className="animate-spin" /> : <Gamepad />}
                                        <span className="ml-2">게임 참가!</span>
                                    </Button>
                                    <Button variant="link" asChild>
                                        <Link href="/guestbook">비밀 방명록 남기러 가기</Link>
                                    </Button>
                                </CardFooter>
                            </form>
                        )}

                        {gameStep === 'game' && (
                            <>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between font-headline text-2xl">
                                       <span><Gamepad className="inline-block mr-2" /> 실시간 끝말잇기</span>
                                    </CardTitle>
                                    <CardDescription>다른 친구들과 함께 끝말잇기를 이어가세요.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div ref={scrollAreaRef} className="w-full h-56 bg-muted rounded-lg p-4 overflow-y-auto flex flex-col gap-2 text-sm">
                                        {isGameLoading ? (
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto my-auto"/>
                                        ) : gameState?.words.length === 0 ? (
                                            <p className="m-auto text-muted-foreground">아직 아무도 단어를 말하지 않았어요. 첫 단어를 말해보세요!</p>
                                        ) : (
                                            gameState?.words.map((turn, index) => (
                                                <div key={index} className={`flex items-end gap-2 ${turn.uid === user?.uid ? 'justify-end' : 'justify-start'}`}>
                                                    {turn.uid !== user?.uid && <span className="text-xs text-muted-foreground mb-1">{turn.displayName}</span>}
                                                    <span className={`px-3 py-1 rounded-full max-w-[70%] break-all ${turn.uid === user?.uid ? 'bg-primary text-primary-foreground' : 'bg-background'}`}>
                                                        {turn.word}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <form onSubmit={handleWordSubmit} className="flex gap-2">
                                        <Input 
                                            value={currentWord}
                                            onChange={(e) => setCurrentWord(e.target.value)}
                                            placeholder={lastCharacter ? `${lastCharacter}(으)로 시작하는 단어` : '첫 단어를 입력하세요!'}
                                            disabled={isSubmitting || gameState?.lastPlayerId === user?.uid}
                                        />
                                        <Button type="submit" disabled={isSubmitting || !currentWord || gameState?.lastPlayerId === user?.uid}>
                                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send />}
                                        </Button>
                                    </form>
                                </CardContent>
                                 <CardFooter>
                                    <Button onClick={() => setGameStep('form')} variant="ghost" className="w-full">닉네임 바꾸기</Button>
                                </CardFooter>
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            </Card>
        </div>
    );
}
