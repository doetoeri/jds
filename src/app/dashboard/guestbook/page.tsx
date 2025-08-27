
'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { db, auth, submitGuestbookMessage } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Send, Gamepad, MessageSquare, Award, RefreshCcw } from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { playWordChain, WordChainInput, WordChainOutput } from '@/ai/flows/word-chain-flow';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  myStudentId: z.string().regex(/^\d{5}$/, '학번은 5자리 숫자여야 합니다.'),
  friendStudentId: z.string().regex(/^\d{5}$/, '학번은 5자리 숫자여야 합니다.'),
  message: z.string().min(5, '메시지는 5자 이상 입력해주세요.').max(100, '메시지는 100자 이하로 입력해주세요.'),
});
type FormValues = z.infer<typeof formSchema>;

type GameStep = 'form' | 'game' | 'result';

interface Turn {
    speaker: 'user' | 'ai';
    word: string;
}

interface MyMessage {
    id: string;
    friendStudentId: string;
    message: string;
    createdAt: Timestamp;
}

export default function GuestbookPage() {
    const [user] = useAuthState(auth);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [gameStep, setGameStep] = useState<GameStep>('form');
    
    // My Messages state
    const [myMessages, setMyMessages] = useState<MyMessage[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(true);

    // Game state
    const [turns, setTurns] = useState<Turn[]>([]);
    const [currentWord, setCurrentWord] = useState('');
    const [gameMessage, setGameMessage] = useState('AI가 첫 단어를 생성 중입니다...');
    const [isGameOver, setIsGameOver] = useState(false);
    const [isAITurn, setIsAITurn] = useState(true);

    const { toast } = useToast();
    const { register, handleSubmit, reset, formState: { errors, isSubmitSuccessful }, setValue } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            myStudentId: '',
            friendStudentId: '',
            message: '',
        }
    });

    useEffect(() => {
        if (isSubmitSuccessful) {
            reset();
        }
    }, [isSubmitSuccessful, reset]);

    useEffect(() => {
        if (!user) return;
        setIsLoadingMessages(true);
        const q = query(
            collection(db, 'guestbook'),
            where('senderUid', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as MyMessage));
            // Sort by date client-side
            userMessages.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
            setMyMessages(userMessages);
            setIsLoadingMessages(false);
        }, (error) => {
            console.error("Error fetching my messages:", error);
            toast({ title: '오류', description: '내가 쓴 글을 불러오는 데 실패했습니다.', variant: 'destructive' });
            setIsLoadingMessages(false);
        });

        return () => unsubscribe();
    }, [user, toast]);

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        if (!user) {
            toast({ title: '오류', description: '로그인 정보가 필요합니다.', variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        try {
            await submitGuestbookMessage(user.uid, data.myStudentId, data.friendStudentId, data.message);
            toast({ title: '메시지 전송 성공!', description: '비밀 방명록에 메시지가 추가되었어요.' });
            setGameStep('game');
            startNewGame();
        } catch (error: any) {
            toast({ title: '오류', description: error.message || '메시지 전송에 실패했습니다.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const startNewGame = async () => {
        setIsAITurn(true);
        setIsGameOver(false);
        setTurns([]);
        setGameMessage('AI가 첫 단어를 생성 중입니다...');
        
        const input: WordChainInput = { word: '시작', history: [] };
        try {
            const result = await playWordChain(input);
            if (result.aiWord) {
                setTurns([{ speaker: 'ai', word: result.aiWord }]);
                setGameMessage('당신의 차례입니다!');
            } else {
                setGameMessage('AI가 첫 단어를 생각하지 못했어요. 다시 시작해주세요.');
                setIsGameOver(true);
            }
        } catch(e: any) {
             toast({ title: "게임 오류", description: e.message, variant: "destructive" });
             setIsGameOver(true);
        } finally {
            setIsAITurn(false);
        }
    };

    const handleWordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentWord || isAITurn || isGameOver) return;

        setIsAITurn(true);
        const newHistory: Turn[] = [...turns, { speaker: 'user', word: currentWord }];
        setTurns(newHistory);
        setGameMessage('AI가 당신의 단어를 확인하고 있습니다...');
        
        try {
            const input: WordChainInput = { word: currentWord, history: turns };
            const result = await playWordChain(input);
            
            if (!result.isValid) {
                setGameMessage(`게임 오버! 이유: ${result.reason}`);
                setIsGameOver(true);
            } else {
                if (result.isGameOver) {
                    setGameMessage(`게임 오버! 이유: ${result.reason}`);
                    setIsGameOver(true);
                } else if (result.aiWord) {
                    const finalHistory = [...newHistory, { speaker: 'ai', word: result.aiWord }];
                    setTurns(finalHistory);

                    if (finalHistory.length >= 10) {
                         setGameStep('result');
                    } else {
                        setGameMessage('성공! 당신의 차례입니다.');
                        setIsAITurn(false);
                    }
                }
            }

        } catch (e: any) {
            toast({ title: "게임 오류", description: e.message, variant: "destructive" });
            setIsGameOver(true);
        } finally {
            setCurrentWord('');
        }
    };

    const handleReset = () => {
        reset();
        setTurns([]);
        setCurrentWord('');
        setGameMessage('');
        setIsGameOver(false);
        setIsAITurn(true);
        setGameStep('form');
    }

    return (
        <div className="flex flex-col items-center justify-center p-4 gap-8">
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
                            <form onSubmit={handleSubmit(onSubmit)}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 font-headline text-2xl"><MessageSquare /> 비밀 방명록 남기기</CardTitle>
                                    <CardDescription>친구에게 비밀 메시지를 남기고 AI 끝말잇기 게임에 참여하여 포인트를 받아가세요!</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="space-y-1">
                                        <Label htmlFor="myStudentId">내 학번 (5자리)</Label>
                                        <Input id="myStudentId" {...register('myStudentId')} placeholder="예: 20101" disabled={isSubmitting}/>
                                        {errors.myStudentId && <p className="text-xs text-destructive">{errors.myStudentId.message}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="friendStudentId">친구 학번 (5자리)</Label>
                                        <Input id="friendStudentId" {...register('friendStudentId')} placeholder="예: 10203" disabled={isSubmitting}/>
                                        {errors.friendStudentId && <p className="text-xs text-destructive">{errors.friendStudentId.message}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="message">비밀 메시지</Label>
                                        <Textarea id="message" {...register('message')} disabled={isSubmitting} placeholder="친구에게 전하고 싶은 말을 남겨보세요."/>
                                        {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
                                        <span className="ml-2">메시지 남기고 게임 시작!</span>
                                    </Button>
                                </CardFooter>
                            </form>
                        )}

                        {gameStep === 'game' && (
                            <>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 font-headline text-2xl"><Gamepad /> AI와 끝말잇기</CardTitle>
                                    <CardDescription>AI와 끝말잇기를 10턴 이상 성공하여 보상을 획득하세요!</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="w-full h-40 bg-muted rounded-lg p-4 overflow-y-auto flex flex-col gap-2 text-sm">
                                        {turns.map((turn, index) => (
                                            <div key={index} className={`flex ${turn.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <span className={`px-3 py-1 rounded-full ${turn.speaker === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}>
                                                    {turn.word}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-center text-muted-foreground text-sm h-5">{gameMessage}</p>
                                    <form onSubmit={handleWordSubmit} className="flex gap-2">
                                        <Input 
                                            value={currentWord}
                                            onChange={(e) => setCurrentWord(e.target.value)}
                                            placeholder={turns.length > 0 ? `${turns[turns.length-1].word.slice(-1)} (으)로 시작하는 단어` : ''}
                                            disabled={isAITurn || isGameOver}
                                        />
                                        <Button type="submit" disabled={isAITurn || isGameOver || !currentWord}>
                                            {isAITurn ? <Loader2 className="animate-spin" /> : <Send />}
                                        </Button>
                                    </form>
                                </CardContent>
                                 <CardFooter>
                                    <Button onClick={handleReset} variant="ghost" className="w-full">처음으로</Button>
                                </CardFooter>
                            </>
                        )}
                        
                        {gameStep === 'result' && (
                            <>
                                <CardHeader className="text-center">
                                     <CardTitle className="font-headline text-2xl text-green-500 flex items-center justify-center gap-2">
                                        <Award />
                                        챌린지 성공!
                                     </CardTitle>
                                    <CardDescription>AI와의 대결에서 10턴 이상 생존하셨습니다!</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                     <div className="p-4 bg-muted rounded-lg text-center">
                                        <p className="text-sm text-muted-foreground">참여해주셔서 감사합니다! 아래 코드를 사용해 포인트를 받아가세요.</p>
                                        <p className="font-mono text-3xl font-bold tracking-widest my-2 text-primary">GUESTBOOK24</p>
                                        <p className="font-bold text-lg">2 포인트</p>
                                    </div>
                                </CardContent>
                                 <CardFooter className="flex-col gap-2">
                                    <Button onClick={handleReset} className="w-full">
                                        <RefreshCcw className="mr-2"/>다음 사람을 위해 새로 시작
                                    </Button>
                                </CardFooter>
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            </Card>

            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>내가 남긴 글</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {isLoadingMessages ? (
                        Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
                    ) : myMessages.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-4">아직 남긴 글이 없어요.</p>
                    ) : (
                        myMessages.map(msg => (
                            <div key={msg.id} className="border p-3 rounded-md">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-sm font-semibold">To: {msg.friendStudentId}</p>
                                    <Badge variant="outline">{new Date(msg.createdAt.seconds * 1000).toLocaleDateString()}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{msg.message}</p>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
