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
import { db, restrictUser, setUserLak } from '@/lib/firebase';
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
import { Loader2, CheckCircle, AlertTriangle, Eye, Ban, Coins } from 'lucide-react';
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
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { addDays, format } from 'date-fns';
import type { DateRange } from 'react-day-picker';

interface Report {
  id: string;
  userId: string;
  studentId: string;
  displayName: string;
  reason: string;
  details: Record<string, any>;
  status: 'pending' | 'resolved';
  createdAt: Timestamp;
}

export default function AlaudaeReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const { toast } = useToast();

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isRestrictDialogOpen, setIsRestrictDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  
  const [restrictionReason, setRestrictionReason] = useState('');
  const [restrictionDate, setRestrictionDate] = useState<DateRange | undefined>({ from: new Date(), to: addDays(new Date(), 7) });
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

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

  const openRestrictDialog = (report: Report) => {
    setSelectedReport(report);
    setRestrictionReason(report.reason);
    setRestrictionDate({ from: new Date(), to: addDays(new Date(), 7)});
    setIsRestrictDialogOpen(true);
  };
  
  const openAdjustDialog = (report: Report) => {
    setSelectedReport(report);
    setAdjustmentAmount('');
    setAdjustmentReason(`Alaudae 조정: ${report.reason}`);
    setIsAdjustDialogOpen(true);
  }

  const handleRestrictUser = async () => {
    if (!selectedReport || !restrictionDate?.to || !restrictionReason) {
      toast({ title: "입력 오류", description: "제한 기간과 사유를 모두 입력해주세요.", variant: "destructive" });
      return;
    }
    setIsProcessing(selectedReport.id);
    try {
      await restrictUser(selectedReport.userId, restrictionDate.to, restrictionReason);
      await handleMarkAsResolved(selectedReport.id);
      toast({ title: "성공", description: `${selectedReport.displayName} 학생의 계정을 제한했습니다.` });
      setIsRestrictDialogOpen(false);
    } catch (error: any) {
      toast({ title: "오류", description: error.message || "계정 제한 중 오류가 발생했습니다.", variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  };
  
  const handleSetLak = async () => {
    if (!selectedReport || !adjustmentAmount || !adjustmentReason) {
      toast({ title: '입력 오류', description: '모든 필드를 채워주세요.', variant: 'destructive' });
      return;
    }
    const amount = Number(adjustmentAmount);
    if (isNaN(amount) || amount < 0) {
      toast({ title: '입력 오류', description: '유효한 양수 또는 0을 입력해주세요.', variant: 'destructive' });
      return;
    }
    setIsProcessing(selectedReport.id);
    try {
      await setUserLak(selectedReport.userId, amount, adjustmentReason);
      await handleMarkAsResolved(selectedReport.id);
      toast({ title: '성공', description: `${selectedReport.displayName} 학생의 포인트를 ${amount}으로 설정했습니다.` });
      setIsAdjustDialogOpen(false);
    } catch (error: any) {
      toast({ title: '오류', description: error.message || '포인트 설정 중 오류가 발생했습니다.', variant: 'destructive' });
    } finally {
      setIsProcessing(null);
    }
  };


  return (
    <>
    <div>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
            <AlertTriangle className="mr-2 h-6 w-6" />
            Alaudae 부정사용 탐지
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
                <TableHead className="text-right">조치</TableHead>
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
                         <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="destructive" onClick={() => openRestrictDialog(report)}><Ban className="h-4 w-4 mr-1"/>제한</Button>
                            <Button size="sm" variant="secondary" onClick={() => openAdjustDialog(report)}><Coins className="h-4 w-4 mr-1"/>조정</Button>
                            <Button size="sm" variant="outline" onClick={() => handleMarkAsResolved(report.id)}>
                                <CheckCircle className="h-4 w-4 mr-1 text-green-600" /> 처리 완료
                            </Button>
                         </div>
                      ) : (
                        <Badge variant="secondary">처리 완료됨</Badge>
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

    {/* Restriction Dialog */}
    <Dialog open={isRestrictDialogOpen} onOpenChange={setIsRestrictDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>계정 이용 제한: {selectedReport?.displayName}</DialogTitle>
                <DialogDescription>사용자의 서비스 이용을 지정된 기간동안 제한합니다.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label>제한 기간</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button id="date" variant={"outline"} className="w-full justify-start text-left font-normal">
                                {restrictionDate?.from ? (restrictionDate.to ? (<> {format(restrictionDate.from, "yyyy-MM-dd")} - {format(restrictionDate.to, "yyyy-MM-dd")} </>) : (format(restrictionDate.from, "yyyy-MM-dd"))) : (<span>기간 선택</span>)}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar initialFocus mode="range" defaultMonth={restrictionDate?.from} selected={restrictionDate} onSelect={setRestrictionDate} numberOfMonths={2} disabled={(date) => date < new Date()} />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="restriction-reason">제한 사유</Label>
                    <Input id="restriction-reason" value={restrictionReason} onChange={e => setRestrictionReason(e.target.value)} placeholder="예: 비속어 사용" />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">취소</Button></DialogClose>
                <Button variant="destructive" onClick={handleRestrictUser} disabled={isProcessing === selectedReport?.id || !restrictionDate?.to || !restrictionReason}>
                    {isProcessing === selectedReport?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 제한 실행
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    
    {/* Point Adjustment Dialog */}
    <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>포인트 재조정: {selectedReport?.displayName}</DialogTitle>
                <DialogDescription>부정 행위로 얻은 포인트를 회수하거나, 특정 값으로 재설정합니다.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="amount_set" className="text-right">설정값</Label>
                    <Input id="amount_set" type="number" placeholder="새로운 포인트 값" className="col-span-3" value={adjustmentAmount} onChange={(e) => setAdjustmentAmount(e.target.value)} disabled={isProcessing === selectedReport?.id} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reason_set" className="text-right">설정 사유</Label>
                    <Input id="reason_set" className="col-span-3" value={adjustmentReason} onChange={(e) => setAdjustmentReason(e.target.value)} disabled={isProcessing === selectedReport?.id} />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">취소</Button></DialogClose>
                <Button variant="destructive" onClick={handleSetLak} disabled={isProcessing === selectedReport?.id || !adjustmentAmount}>
                    {isProcessing === selectedReport?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 재조정 실행
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    </>
  );
}
