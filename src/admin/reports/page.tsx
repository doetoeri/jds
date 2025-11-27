
'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, Timestamp, getDocs, writeBatch, where } from 'firebase/firestore';
import { db, restrictUser, setUserLak } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertTriangle, Eye, Ban, Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { addDays, format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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

interface GroupedReport {
  studentId: string;
  displayName: string;
  userId: string;
  reports: Report[];
  lastReportedAt: Timestamp;
  status: 'pending' | 'resolved';
}

export default function AdminReportsPage() {
  const [groupedReports, setGroupedReports] = useState<GroupedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const { toast } = useToast();

  const [selectedUser, setSelectedUser] = useState<GroupedReport | null>(null);
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
        
        const groups: { [key: string]: GroupedReport } = {};
        for (const report of reportList) {
            if (!groups[report.studentId]) {
                groups[report.studentId] = {
                    studentId: report.studentId,
                    displayName: report.displayName,
                    userId: report.userId,
                    reports: [],
                    lastReportedAt: report.createdAt,
                    status: 'pending',
                };
            }
            groups[report.studentId].reports.push(report);
            if (report.status === 'pending') {
                groups[report.studentId].status = 'pending';
            }
            if (report.createdAt > groups[report.studentId].lastReportedAt) {
                 groups[report.studentId].lastReportedAt = report.createdAt;
            }
        }

        const groupedArray = Object.values(groups);
        groupedArray.forEach(group => {
            if(group.reports.every(r => r.status === 'resolved')) {
                group.status = 'resolved';
            }
        });
        
        groupedArray.sort((a,b) => b.lastReportedAt.toMillis() - a.lastReportedAt.toMillis());

        setGroupedReports(groupedArray);
        setIsLoading(false);
    }, (error) => {
        console.error('Error fetching reports: ', error);
        toast({ title: '오류', description: '보고서 목록을 불러오는 데 실패했습니다.', variant: 'destructive' });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  const formatDetails = (details: Report['details']) => {
    return Object.entries(details)
      .map(([key, value]) => `${key}: ${value instanceof Timestamp ? value.toDate().toLocaleString() : JSON.stringify(value)}`)
      .join('\n');
  }

  const handleMarkAsResolved = async (userId: string) => {
    setIsProcessing(userId);
    try {
      const reportsToUpdateQuery = query(collection(db, 'reports'), where('userId', '==', userId), where('status', '==', 'pending'));
      const snapshot = await getDocs(reportsToUpdateQuery);
      
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        snapshot.forEach(docToUpdate => {
            batch.update(docToUpdate.ref, { status: 'resolved' });
        });
        await batch.commit();
      }

      toast({ title: '성공', description: '해당 학생의 모든 의심 활동을 해결됨으로 처리했습니다.' });
    } catch (error) {
      console.error("Error marking reports as resolved: ", error);
      toast({ title: '오류', description: '상태 변경 중 오류가 발생했습니다.', variant: 'destructive' });
    } finally {
      setIsProcessing(null);
    }
  };

  const openRestrictDialog = (reportGroup: GroupedReport) => {
    setSelectedUser(reportGroup);
    setRestrictionReason(reportGroup.reports.map(r => r.reason).join(', '));
    setRestrictionDate({ from: new Date(), to: addDays(new Date(), 7)});
    setIsRestrictDialogOpen(true);
  };
  
  const openAdjustDialog = (reportGroup: GroupedReport) => {
    setSelectedUser(reportGroup);
    setAdjustmentAmount('');
    setAdjustmentReason(`Alaudae 조정: ${reportGroup.reports.map(r => r.reason).join(', ')}`);
    setIsAdjustDialogOpen(true);
  }

  const handleRestrictUser = async () => {
    if (!selectedUser || !restrictionDate?.to || !restrictionReason) {
      toast({ title: "입력 오류", description: "제한 기간과 사유를 모두 입력해주세요.", variant: "destructive" });
      return;
    }
    setIsProcessing(selectedUser.userId);
    try {
      await restrictUser(selectedUser.userId, restrictionDate.to, restrictionReason);
      await handleMarkAsResolved(selectedUser.userId);
      toast({ title: "성공", description: `${selectedUser.displayName} 학생의 계정을 제한했습니다.` });
      setIsRestrictDialogOpen(false);
    } catch (error: any) {
      toast({ title: "오류", description: error.message || "계정 제한 중 오류가 발생했습니다.", variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  };
  
  const handleSetLak = async () => {
    if (!selectedUser || !adjustmentAmount || !adjustmentReason) {
      toast({ title: '입력 오류', description: '모든 필드를 채워주세요.', variant: 'destructive' });
      return;
    }
    const amount = Number(adjustmentAmount);
    if (isNaN(amount) || amount < 0) {
      toast({ title: '입력 오류', description: '유효한 양수 또는 0을 입력해주세요.', variant: 'destructive' });
      return;
    }
    setIsProcessing(selectedUser.userId);
    try {
      await setUserLak(selectedUser.userId, amount, adjustmentReason);
      await handleMarkAsResolved(selectedUser.userId);
      toast({ title: '성공', description: `${selectedUser.displayName} 학생의 포인트를 ${amount}으로 설정했습니다.` });
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
                <TableHead>의심 활동 요약</TableHead>
                <TableHead>최근 발생일</TableHead>
                <TableHead className="text-right">조치</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}> <Skeleton className="h-16 w-full" /> </TableCell>
                  </TableRow>
                ))
              ) : groupedReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24"> 감지된 의심 활동이 없습니다. </TableCell>
                </TableRow>
              ) : (
                groupedReports.map(group => (
                  <TableRow key={group.userId} className={group.status === 'resolved' ? 'bg-muted/50' : ''}>
                    <TableCell>{group.displayName} ({group.studentId})</TableCell>
                    <TableCell>
                      <Accordion type="single" collapsible>
                        <AccordionItem value="item-1" className="border-b-0">
                          <AccordionTrigger className="p-0 hover:no-underline">
                              {group.reports[0].reason} 등 총 {group.reports.length}건
                          </AccordionTrigger>
                          <AccordionContent className="pt-4">
                            <div className="max-h-60 overflow-y-auto space-y-2 p-2 bg-secondary/50 rounded-md">
                                {group.reports.map(report => (
                                    <div key={report.id} className="text-xs p-2 border rounded-md bg-background">
                                        <p><strong>사유:</strong> {report.reason}</p>
                                        <p><strong>일시:</strong> {report.createdAt.toDate().toLocaleString()}</p>
                                        <p className="whitespace-pre-wrap break-words"><strong>세부사항:</strong> {formatDetails(report.details)}</p>
                                    </div>
                                ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </TableCell>
                    <TableCell> {group.lastReportedAt?.toDate ? group.lastReportedAt.toLocaleString() : 'N/A'} </TableCell>
                    <TableCell className="text-right">
                      {isProcessing === group.userId ? (
                          <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                      ) : group.status === 'pending' ? (
                         <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="destructive" onClick={() => openRestrictDialog(group)}><Ban className="h-4 w-4 mr-1"/>제한</Button>
                            <Button size="sm" variant="secondary" onClick={() => openAdjustDialog(group)}><Coins className="h-4 w-4 mr-1"/>조정</Button>
                            <Button size="sm" variant="outline" onClick={() => handleMarkAsResolved(group.userId)}>
                                <CheckCircle className="h-4 w-4 mr-1 text-green-600" /> 처리
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
                <DialogTitle>계정 이용 제한: {selectedUser?.displayName}</DialogTitle>
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
                <Button variant="destructive" onClick={handleRestrictUser} disabled={isProcessing === selectedUser?.userId || !restrictionDate?.to || !restrictionReason}>
                    {isProcessing === selectedUser?.userId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 제한 실행
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    
    {/* Point Adjustment Dialog */}
    <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>포인트 재조정: {selectedUser?.displayName}</DialogTitle>
                <DialogDescription>부정 행위로 얻은 포인트를 회수하거나, 특정 값으로 재설정합니다.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="amount_set" className="text-right">설정값</Label>
                    <Input id="amount_set" type="number" placeholder="새로운 포인트 값" className="col-span-3" value={adjustmentAmount} onChange={(e) => setAdjustmentAmount(e.target.value)} disabled={isProcessing === selectedUser?.userId} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reason_set" className="text-right">설정 사유</Label>
                    <Input id="reason_set" className="col-span-3" value={adjustmentReason} onChange={(e) => setAdjustmentReason(e.target.value)} disabled={isProcessing === selectedUser?.userId} />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">취소</Button></DialogClose>
                <Button variant="destructive" onClick={handleSetLak} disabled={isProcessing === selectedUser?.userId || !adjustmentAmount}>
                    {isProcessing === selectedUser?.userId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 재조정 실행
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
