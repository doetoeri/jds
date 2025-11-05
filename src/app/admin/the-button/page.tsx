
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Radio, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db, resetLeaderboard } from '@/lib/firebase';
import { collection, doc, getDocs, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TheButtonState {
    lastPressedBy: string;
    lastPressedByDisplayName: string;
    lastPresserAvatar: string;
    isFinished: boolean;
    timerEndsAt: Timestamp;
}

interface Winner {
    id: string; // userId
    displayName: string;
    avatarGradient: string;
    timestamp: Timestamp;
}

export default function AdminTheButtonPage() {
    const [gameState, setGameState] = useState<TheButtonState | null>(null);
    const [winners, setWinners] = useState<Winner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isResetting, setIsResetting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const gameRef = doc(db, 'games', 'the-button');
        const unsubGame = onSnapshot(gameRef, (doc) => {
            if (doc.exists()) {
                setGameState(doc.data() as TheButtonState);
            }
        });

        const winnersRef = collection(db, 'games/the-button/winners');
        const q = query(winnersRef, orderBy('timestamp', 'desc'));
        const unsubWinners = onSnapshot(q, (snapshot) => {
            setWinners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Winner)));
            setIsLoading(false);
        });

        return () => {
            unsubGame();
            unsubWinners();
        };
    }, []);
    
    const handleReset = async () => {
        setIsResetting(true);
        try {
            await resetLeaderboard('the-button');
            toast({ title: "성공", description: "'더 버튼' 게임의 모든 우승 기록이 삭제되었습니다."});
        } catch (error: any) {
            toast({ title: '오류', description: error.message, variant: 'destructive'});
        } finally {
            setIsResetting(false);
        }
    }

    const getInitials = (name?: string) => name?.substring(0, 1).toUpperCase() || '?';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
                        <Radio className="mr-2 h-6 w-6" />
                        '더 버튼' 관리
                    </h1>
                    <p className="text-muted-foreground">
                        '더 버튼' 게임의 역대 우승자 목록을 확인합니다.
                    </p>
                </div>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isResetting}>
                            {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            우승 기록 초기화
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>정말로 초기화하시겠습니까?</AlertDialogTitle>
                            <AlertDialogDescription>
                                이 작업은 되돌릴 수 없으며, '더 버튼' 게임의 모든 우승 기록을 영구적으로 삭제합니다.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction onClick={handleReset}>초기화</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Crown className="text-amber-500"/>역대 우승자</CardTitle>
                    <CardDescription>가장 최근에 승리한 순서대로 표시됩니다.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>우승자</TableHead>
                                <TableHead className="text-right">우승 시각</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                    </TableCell>
                                </TableRow>
                            ) : winners.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center">
                                        아직 우승자가 없습니다.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                winners.map((winner) => (
                                    <TableRow key={winner.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className={cn('h-9 w-9', `gradient-${winner.avatarGradient}`)}>
                                                    <AvatarFallback className="text-white bg-transparent font-bold">
                                                        {getInitials(winner.displayName)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{winner.displayName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">{winner.timestamp.toDate().toLocaleString()}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
