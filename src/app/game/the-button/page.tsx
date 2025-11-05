
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Radio, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, pressTheButton } from '@/lib/firebase';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';

interface TheButtonState {
    lastPressedBy: string;
    lastPressedByDisplayName: string;
    lastPresserAvatar: string;
    isFinished: boolean;
    timerEndsAt: Timestamp;
}

export default function TheButtonGamePage() {
    const [user] = useAuthState(auth);
    const [gameState, setGameState] = useState<TheButtonState | null>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isPressing, setIsPressing] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const gameRef = doc(db, 'games', 'the-button');
        const unsubscribe = onSnapshot(gameRef, (doc) => {
            if (doc.exists()) {
                setGameState(doc.data() as TheButtonState);
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!gameState?.timerEndsAt) {
            setTimeLeft(null);
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const ends = gameState.timerEndsAt.toMillis();
            const secondsLeft = Math.max(0, Math.floor((ends - now) / 1000));
            setTimeLeft(secondsLeft);

            if (secondsLeft === 0 && !gameState.isFinished) {
                // Logic to declare winner will be handled by a backend function or Firestore rule trigger
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [gameState]);

    const handlePress = async () => {
        if (!user || gameState?.isFinished) return;
        setIsPressing(true);
        try {
            await pressTheButton(user.uid);
            toast({
                title: "버튼을 눌렀습니다!",
                description: "타이머가 30분으로 초기화되었습니다.",
            });
        } catch (error: any) {
            toast({
                title: '오류',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsPressing(false);
        }
    }

    const formatTime = (seconds: number | null): string => {
        if (seconds === null) return '--:--:--';
        const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    const getInitials = (name?: string) => name?.substring(0, 1).toUpperCase() || '?';

    return (
        <div className="flex flex-col items-center gap-4 text-center">
            <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
                <Radio className="mr-2 h-6 w-6" />
                더 버튼
            </h1>
             <p className="text-muted-foreground max-w-prose">
                버튼을 누르면 타이머가 30분으로 초기화됩니다. 아무도 누르지 않아 타이머가 0이 되면, 마지막으로 버튼을 누른 사람이 최종 우승자가 됩니다.
            </p>
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="font-mono text-5xl md:text-6xl tracking-wider">
                         {formatTime(timeLeft)}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center gap-4">
                     <motion.button
                        onClick={handlePress}
                        disabled={isPressing || gameState?.isFinished}
                        className="relative w-40 h-40 rounded-full bg-red-600 shadow-lg disabled:bg-gray-500"
                        whileTap={{ scale: 0.9 }}
                      >
                        {isPressing && <Loader2 className="absolute inset-0 m-auto h-12 w-12 text-white animate-spin" />}
                      </motion.button>
                      <p className="text-sm text-muted-foreground">
                        {gameState?.isFinished ? "게임이 종료되었습니다." : "버튼을 눌러 시간 초기화"}
                      </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                     <h3 className="text-sm font-semibold">마지막으로 누른 사람</h3>
                     {gameState?.lastPressedByDisplayName ? (
                        <div className="flex items-center gap-2">
                            <Avatar className={cn('h-6 w-6', `gradient-${gameState.lastPresserAvatar}`)}>
                                <AvatarFallback className="text-xs text-white font-bold bg-transparent">
                                    {getInitials(gameState.lastPressedByDisplayName)}
                                </AvatarFallback>
                            </Avatar>
                            <span className="font-bold">{gameState.lastPressedByDisplayName}</span>
                        </div>
                     ) : (
                        <span className="text-muted-foreground">아직 아무도 누르지 않았습니다.</span>
                     )}
                </CardFooter>
            </Card>
        </div>
    );
}
