'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Blocks, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db, resetLeaderboard } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
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

interface BlockBlastPlayer {
    id: string; // userId
    displayName: string;
    studentId: string;
    score: number;
    avatarGradient: string;
    lastUpdated: Timestamp;
}

export default function AdminBlockBlastPage() {
    const [leaderboard, setLeaderboard] = useState<BlockBlastPlayer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isResetting, setIsResetting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const leaderboadRef = collection(db, 'leaderboards/block-blast/users');
        const q = query(leaderboadRef, orderBy('score', 'desc'));
        const unsubLeaderboard = onSnapshot(q, (snapshot) => {
            setLeaderboard(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlockBlastPlayer)));
            setIsLoading(false);
        });

        return () => {
            unsubLeaderboard();
        };
    }, []);
    
    const handleReset = async () => {
        setIsResetting(true);
        try {
            await resetLeaderboard('block-blast');
            toast({ title: "성공", description: "'블록 블라스트' 게임의 모든 기록이 삭제되었습니다."});
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
                        <Blocks className="mr-2 h-6 w-6" />
                        '블록 블라스트' 관리
                    </h1>
                    <p className="text-muted-foreground">
                        '블록 블라스트' 게임의 리더보드를 확인합니다.
                    </p>
                </div>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isResetting}>
                            {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            리더보드 초기화
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>정말로 초기화하시겠습니까?</AlertDialogTitle>
                            <AlertDialogDescription>
                                이 작업은 되돌릴 수 없으며, '블록 블라스트' 게임의 모든 점수 기록을 영구적으로 삭제합니다.
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
                    <CardTitle className="flex items-center gap-2"><Crown className="text-amber-500"/>리더보드</CardTitle>
                    <CardDescription>가장 점수가 높은 순서대로 표시됩니다.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>순위</TableHead>
                                <TableHead>학생</TableHead>
                                <TableHead>학번</TableHead>
                                <TableHead className="text-right">점수</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                    </TableCell>
                                </TableRow>
                            ) : leaderboard.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        아직 기록이 없습니다.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                leaderboard.map((player, index) => (
                                    <TableRow key={player.id}>
                                        <TableCell className="font-bold">{index + 1}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className={cn('h-9 w-9', `gradient-${player.avatarGradient}`)}>
                                                    <AvatarFallback className="text-white bg-transparent font-bold">
                                                        {getInitials(player.displayName)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{player.displayName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{player.studentId}</TableCell>
                                        <TableCell className="text-right font-bold">{player.score}</TableCell>
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
