
'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Server } from 'lucide-react';

interface KioskUsageLog {
  id: string;
  studentId: string;
  activity: 'poem' | 'letter';
  date: string; // YYYY-MM-DD
  timestamp: Timestamp;
}

export default function AdminKioskLogsPage() {
  const [logs, setLogs] = useState<KioskUsageLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const logsCollection = collection(db, 'kiosk_usage');
        const q = query(logsCollection, orderBy('timestamp', 'desc'));
        const logSnapshot = await getDocs(q);
        const logList = logSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KioskUsageLog));
        setLogs(logList);
        
      } catch (error) {
        console.error("Error fetching kiosk logs: ", error);
        toast({ title: "오류", description: "키오스크 사용 기록을 불러오는 데 실패했습니다.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLogs();
  }, [toast]);

  const activityNames = {
      poem: '종달샘 삼행시',
      letter: '비밀 편지'
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center gap-2">
            <Server />
            키오스크 사용 기록
          </h1>
          <p className="text-muted-foreground">키오스크 활동별 학생 참여 기록입니다.</p>
        </div>
      </div>
      
       <Card>
          <CardContent className="p-0">
          <Table>
              <TableHeader>
              <TableRow>
                  <TableHead>날짜</TableHead>
                  <TableHead>학번</TableHead>
                  <TableHead>활동</TableHead>
              </TableRow>
              </TableHeader>
              <TableBody>
              {isLoading ? (
                  Array.from({ length: 10 }).map((_, index) => (
                  <TableRow key={index}>
                      <TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                  ))
              ) : logs.length === 0 ? (
                  <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">기록이 없습니다.</TableCell>
                  </TableRow>
              ) : (
                  logs.map((log) => (
                  <TableRow key={log.id}>
                      <TableCell>{log.timestamp.toDate().toLocaleString()}</TableCell>
                      <TableCell className="font-mono">{log.studentId}</TableCell>
                      <TableCell>{activityNames[log.activity] || log.activity}</TableCell>
                  </TableRow>
                  ))
              )}
              </TableBody>
          </Table>
          </CardContent>
      </Card>
    </>
  );
}
