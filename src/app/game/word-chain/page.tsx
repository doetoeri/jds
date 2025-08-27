
'use client';

import { useState } from 'react';
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
import { addPointsForGameWin } from '@/lib/firebase';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Send, Gamepad, Award, RefreshCcw } from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { playWordChain, WordChainInput } from '@/ai/flows/word-chain-flow';
import Link from 'next/link';

const formSchema = z.object({
  studentId: z.string().regex(/^\d{5}$/, '학번은 5자리 숫자여야 합니다.'),
});
type FormValues = z.infer<typeof formSchema>;

type GameStep = 'form' | 'game' | 'result';

interface Turn {
    speaker: 'user' | 'ai';
    word: string;
}

export default function WordChainPage() {
    const [gameStep, setGameStep] = useState<GameStep>('form');
    const [isProcessing, setIsProcessing] = useState(false);
    
    const { toast } = useToast();
    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
    });

    // Game state
    const [studentIdForReward, setStudentIdForReward] = useState('');
    const [turns, setTurns] = useState<Turn[]>([]);
    const [currentWord, setCurrentWord] = useState('');
    const [gameMessage, setGameMessage] = useState('AI가 첫 단어를 생성 중입니다...');
    const [isGameOver, setIsGameOver] = useState(false);
    const [isAITurn, setIsAITurn] = useState(true);
    const [isWin, setIsWin] = useState(false);

    const onStudentIdSubmit: SubmitHandler<FormValues> = async (data) => {
        setStudentIdForReward(data.studentId);
        setGameStep('game');
        await startNewGame();
    };
    
    const startNewGame = async () => {
        setIsAITurn(true);
        setIsGameOver(false);
        setIsWin(false);
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
                setIsWin(false);
            } else {
                if (result.isGameOver) {
                    if (result.reason.includes("You win")) {
                        setIsWin(true);
                        setGameStep('result');
                    } else {
                       setGameMessage(`게임 오버! 이유: ${result.reason}`);
                       setIsGameOver(true);
                       setIsWin(false);
                    }
                } else if (result.aiWord) {
                    const finalHistory = [...newHistory, { speaker: 'ai', word: result.aiWord }];
                    setTurns(finalHistory);

                    if (finalHistory.length >= 10) { // 5 turns for user, 5 for AI
                         setIsWin(true);
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
            setIsWin(false);
        } finally {
            setCurrentWord('');
        }
    };

     useEffect(() => {
        if (gameStep === 'result' && isWin) {
            const giveReward = async () => {
                setIsProcessing(true);
                const rewardResult = await addPointsForGameWin(studentIdForReward);
                if (rewardResult.success) {
                    toast({ title: '챌린지 성공!', description: rewardResult.message });
                } else {
                    toast({ title: '포인트 지급 실패', description: rewardResult.message, variant: 'destructive' });
                }
                setIsProcessing(false);
            };
            giveReward();
        }
    }, [gameStep, isWin, studentIdForReward, toast]);


    const handleReset = () => {
        reset();
        setTurns([]);
        setCurrentWord('');
        setGameMessage('');
        setIsGameOver(false);
        setIsAITurn(true);
        setStudentIdForReward('');
        setGameStep('form');
        setIsWin(false);
    }

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
                             <form onSubmit={handleSubmit(onStudentIdSubmit)}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 font-headline text-2xl"><Gamepad/> AI 끝말잇기 챌린지</CardTitle>
                                    <CardDescription>AI와 끝말잇기를 5턴 이상 성공하여 2포인트를 획득하세요! 보상을 받을 학번을 입력해주세요.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="space-y-1">
                                        <Label htmlFor="studentId">내 학번 (5자리)</Label>
                                        <Input id="studentId" {...register('studentId')} placeholder="예: 20101" disabled={isProcessing}/>
                                        {errors.studentId && <p className="text-xs text-destructive">{errors.studentId.message}</p>}
                                    </div>
                                </CardContent>
                                <CardFooter className="flex-col gap-4">
                                    <Button type="submit" className="w-full" disabled={isProcessing}>
                                        {isProcessing ? <Loader2 className="animate-spin" /> : <Gamepad />}
                                        <span className="ml-2">게임 시작!</span>
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
                                    <CardTitle className="flex items-center gap-2 font-headline text-2xl"><Gamepad /> AI와 끝말잇기</CardTitle>
                                    <CardDescription>AI와 끝말잇기를 5턴 이상 성공하여 보상을 획득하세요!</CardDescription>
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
                                        {isAITurn && !isGameOver && <Loader2 className="h-5 w-5 animate-spin"/>}
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
                                            <Send />
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
                                    <CardDescription>AI와의 대결에서 승리하셨습니다! {studentIdForReward} 학번으로 2포인트가 자동 지급됩니다.</CardDescription>
                                </CardHeader>
                                <CardContent className="text-center">
                                     {isProcessing ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                                            <p className="text-sm text-muted-foreground">포인트를 지급하고 있습니다...</p>
                                        </div>
                                     ) : (
                                        <p className="text-lg font-bold text-primary">🎉 포인트 지급 완료! 🎉</p>
                                     )}
                                </CardContent>
                                 <CardFooter className="flex-col gap-2">
                                    <Button onClick={handleReset} className="w-full" disabled={isProcessing}>
                                        <RefreshCcw className="mr-2"/>새로운 게임 시작하기
                                    </Button>
                                </CardFooter>
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            </Card>
        </div>
    );
}

