
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { addDoc, collection, query, orderBy, onSnapshot, Timestamp, limit } from 'firebase/firestore';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Send, Users, Hand, Gamepad, Sparkles, PartyPopper } from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { playRps, RpsInput, RpsOutput } from '@/ai/flows/rps-flow';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const formSchema = z.object({
  user1Name: z.string().min(1, '이름을 입력해주세요.').max(10, '이름은 10자 이하로 입력해주세요.'),
  user2Name: z.string().min(1, '친구의 이름을 입력해주세요.').max(10, '친구의 이름은 10자 이하로 입력해주세요.'),
  message: z.string().min(5, '메시지는 5자 이상 입력해주세요.').max(100, '메시지는 100자 이하로 입력해주세요.'),
});
type FormValues = z.infer<typeof formSchema>;

interface WallMessage {
  id: string;
  user1Name: string;
  user2Name: string;
  message: string;
  color: string;
  createdAt: Timestamp;
}

type GameStep = 'form' | 'game' | 'result';
type Move = 'rock' | 'paper' | 'scissors';

const colors = [
    'bg-blue-100', 'bg-orange-100', 'bg-green-100', 'bg-purple-100', 'bg-red-100', 'bg-yellow-100', 'bg-pink-100', 'bg-indigo-100'
];

export default function FriendshipWallPage() {
    const [messages, setMessages] = useState<WallMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [gameStep, setGameStep] = useState<GameStep>('form');
    const [gameHistory, setGameHistory] = useState<any[]>([]);
    const [gameResult, setGameResult] = useState<RpsOutput | null>(null);

    const { toast } = useToast();
    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(formSchema)
    });

    useEffect(() => {
        const q = query(collection(db, "friendship_wall"), orderBy("createdAt", "desc"), limit(50));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const wallMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as WallMessage));
            setMessages(wallMessages);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching messages:", error);
            toast({ title: "오류", description: "메시지를 불러오는 데 실패했습니다.", variant: "destructive" });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'friendship_wall'), {
                ...data,
                createdAt: Timestamp.now(),
                color: colors[Math.floor(Math.random() * colors.length)]
            });
            toast({ title: '메시지 전송 성공!', description: '우정의 벽에 메시지가 추가되었어요.' });
            setGameStep('game');
        } catch (error: any) {
            toast({ title: '오류', description: error.message || '메시지 전송에 실패했습니다.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleRpsPlay = async (userMove: Move) => {
        setIsSubmitting(true);
        setGameResult(null);
        try {
            const input: RpsInput = { userMove, history: gameHistory };
            const result = await playRps(input);
            setGameResult(result);
            setGameHistory(prev => [...prev, { userMove, aiMove: result.aiMove, result: result.result }]);
            setGameStep('result');
        } catch (error: any) {
            toast({ title: "게임 오류", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        reset();
        setGameHistory([]);
        setGameResult(null);
        setGameStep('form');
    }

    const renderMoveIcon = (move: Move) => {
        switch(move) {
            case 'rock': return <span className="text-4xl" role="img" aria-label="rock">✊</span>;
            case 'paper': return <span className="text-4xl" role="img" aria-label="paper">✋</span>;
            case 'scissors': return <span className="text-4xl" role="img" aria-label="scissors">✌️</span>;
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[calc(100vh-120px)]">
            {/* Input Side */}
            <div className="flex flex-col items-center justify-center p-4">
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
                                        <CardTitle className="flex items-center gap-2 font-headline text-2xl"><Users /> 우정의 벽에 메시지 남기기</CardTitle>
                                        <CardDescription>친구와의 우정을 메시지로 남기고 AI 미니게임에 참여하여 포인트를 받아가세요!</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label htmlFor="user1Name">내 이름</Label>
                                                <Input id="user1Name" {...register('user1Name')} disabled={isSubmitting}/>
                                                {errors.user1Name && <p className="text-xs text-destructive">{errors.user1Name.message}</p>}
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="user2Name">친구 이름</Label>
                                                <Input id="user2Name" {...register('user2Name')} disabled={isSubmitting}/>
                                                 {errors.user2Name && <p className="text-xs text-destructive">{errors.user2Name.message}</p>}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="message">우정 메시지</Label>
                                            <Textarea id="message" {...register('message')} disabled={isSubmitting}/>
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
                                        <CardTitle className="flex items-center gap-2 font-headline text-2xl"><Gamepad /> AI를 이겨라! 가위바위보</CardTitle>
                                        <CardDescription>AI에게 도전하여 승리하세요! 무엇을 내시겠어요?</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex justify-around items-center p-8">
                                         {(['rock', 'paper', 'scissors'] as Move[]).map(move => (
                                             <Button key={move} variant="outline" size="icon" className="w-20 h-20 rounded-full" onClick={() => handleRpsPlay(move)} disabled={isSubmitting}>
                                                 {renderMoveIcon(move)}
                                             </Button>
                                         ))}
                                    </CardContent>
                                    <CardFooter>
                                         {isSubmitting && (
                                            <div className="w-full flex items-center justify-center text-muted-foreground">
                                                <Loader2 className="animate-spin mr-2" />
                                                AI가 심사숙고 중입니다...
                                            </div>
                                        )}
                                    </CardFooter>
                                </>
                            )}
                            
                            {gameStep === 'result' && gameResult && (
                                <>
                                    <CardHeader className="text-center">
                                         <CardTitle className="font-headline text-2xl">
                                            {gameResult.result === 'win' && <span className="text-green-500 flex items-center justify-center gap-2"><PartyPopper/> 승리!</span>}
                                            {gameResult.result === 'loss' && <span className="text-red-500">패배!</span>}
                                            {gameResult.result === 'tie' && <span className="text-gray-500">무승부!</span>}
                                         </CardTitle>
                                        <CardDescription>{gameResult.message}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="flex justify-around items-center">
                                            <div className="text-center space-y-2">
                                                <p className="font-semibold">나</p>
                                                {renderMoveIcon(gameHistory[gameHistory.length - 1].userMove)}
                                            </div>
                                            <p className="text-2xl font-bold">VS</p>
                                            <div className="text-center space-y-2">
                                                <p className="font-semibold">AI</p>
                                                {renderMoveIcon(gameResult.aiMove)}
                                            </div>
                                        </div>
                                         <div className="p-4 bg-muted rounded-lg text-center">
                                            <p className="text-sm text-muted-foreground">참여해주셔서 감사합니다! 아래 코드를 사용해 포인트를 받아가세요.</p>
                                            <p className="font-mono text-3xl font-bold tracking-widest my-2 text-primary">FRIEND24</p>
                                            <p className="font-bold text-lg">2 포인트</p>
                                        </div>
                                    </CardContent>
                                     <CardFooter className="flex-col gap-2">
                                        <Button onClick={() => setGameStep('game')} className="w-full" variant="secondary">
                                            <Gamepad className="mr-2"/>다시 도전하기
                                        </Button>
                                        <Button onClick={handleReset} className="w-full">
                                            <Sparkles className="mr-2"/>다음 사람을 위해 새로 시작
                                        </Button>
                                    </CardFooter>
                                </>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </Card>
            </div>

            {/* Display Side */}
            <div className="relative p-4 rounded-lg overflow-hidden bg-muted/50 border">
                 <h2 className="text-2xl font-bold text-center mb-4 font-headline">실시간 우정의 벽</h2>
                 {isLoading && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Array.from({length: 6}).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
                    </div>
                 )}
                <AnimatePresence>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                layout
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                                className={cn("p-4 rounded-lg shadow-sm text-sm", msg.color)}
                            >
                                <p className="font-bold">{msg.user1Name} & {msg.user2Name}</p>
                                <p className="mt-2 text-gray-700">{msg.message}</p>
                            </motion.div>
                        ))}
                    </div>
                </AnimatePresence>
            </div>
        </div>
    );
}

