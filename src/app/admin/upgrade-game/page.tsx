
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, Zap, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface UpgradeLog {
    id: string;
    userId: string;
    studentId: string;
    displayName: string;
    level: number;
    pointsAwarded: number;
    timestamp: any;
}

export default function AdminUpgradeGamePage() {
    const [logs, setLogs] = useState<UpgradeLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const logsRef = collection(db, 'games/upgrade-game/logs');
        const q = query(logsRef, orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UpgradeLog));
            setLogs(logData);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
                    <TrendingUp className="mr-2 h-6 w-6" />
                    종달새 강화하기 관리
                </h1>
                <p className="text-muted-foreground">
                    학생들의 강화 성공 기록과 보상 내역을 확인합니다.
                </p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>최근 강화 성공 기록</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>시간</TableHead>
                                <TableHead>학생</TableHead>
                                <TableHead>달성 레벨</TableHead>
                                <TableHead className="text-right">획득 포인트</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={4} className="h-10 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        아직 강화 기록이 없습니다.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell>{log.timestamp?.toDate().toLocaleString()}</TableCell>
                                        <TableCell>{log.displayName} ({log.studentId})</TableCell>
                                        <TableCell><span className="font-bold">{log.level}</span> 단계</TableCell>
                                        <TableCell className="text-right font-semibold">{log.pointsAwarded.toFixed(2)} P</TableCell>
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
