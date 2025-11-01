'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertTriangle, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
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

interface Report {
  id: string;
  studentId: string;
  displayName: string;
  reason: string;
  details: Record<string, any>;
  status: 'pending' | 'resolved';
  createdAt: Timestamp;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const reportsCollection = collection(db, 'reports');
    const q = query(reportsCollection, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const reportList = snapshot.docs.map(
            doc => ({ id: doc.id, ...doc.data() } as Report)
        );
        setReports(reportList);
        setIsLoading(false);
    }, (error) => {
        console.error('Error fetching reports: ', error);
        toast({
            title: '오류',
            description: '보고서 목록을 불러오는 데 실패했습니다.',
            variant: 'destructive',
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  const formatDetails = (details: Report['details']) => {
    return Object.entries(details)
      .map(([key, value]) => `${key}: ${value instanceof Timestamp ? value.toDate().toLocaleString() : JSON.stringify(value)}`)
      .join('\n');
  }

  const handleMarkAsResolved = async (reportId: string) => {
    setIsProcessing(reportId);
    try {
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, { status: 'resolved' });
      toast({
        title: '성공',
        description: '보고서를 해결됨으로 처리했습니다.',
      });
    } catch (error) {
      toast({
        title: '오류',
        description: '상태 변경 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
            <AlertTriangle className="mr-2 h-6 w-6" />
            의심 활동 보고서
        </h1>
        <p className="text-muted-foreground">
          시스템에서 자동으로 감지한 사용자들의 비정상 활동 의심 목록입니다.
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>의심 학생</TableHead>
                <TableHead>의심 사유</TableHead>
                <TableHead>세부 정보</TableHead>
                <TableHead>발생일</TableHead>
                <TableHead className="text-right">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    감지된 의심 활동이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                reports.map(report => (
                  <TableRow key={report.id}>
                    <TableCell>{report.displayName} ({report.studentId})</TableCell>
                    <TableCell className="font-semibold">{report.reason}</TableCell>
                    <TableCell>
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <Button variant="ghost" size="icon"><Eye className="h-4 w-4"/></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                             <AlertDialogHeader>
                                <AlertDialogTitle>세부 정보</AlertDialogTitle>
                                <AlertDialogDescription className="whitespace-pre-wrap break-words max-h-[60vh] overflow-y-auto bg-muted p-4 rounded-md">
                                   {formatDetails(report.details)}
                                </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                                <AlertDialogCancel>닫기</AlertDialogCancel>
                             </AlertDialogFooter>
                          </AlertDialogContent>
                       </AlertDialog>
                    </TableCell>
                    <TableCell>
                      {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      {isProcessing === report.id ? (
                          <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                      ) : report.status === 'pending' ? (
                         <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAsResolved(report.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                            해결됨으로 표시
                          </Button>
                      ) : (
                        <Badge variant="secondary">해결됨</Badge>
                      )}
                    </TableCell>
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
