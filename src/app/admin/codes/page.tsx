

'use client';

import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Trash2, Loader2, Download, Users, Sparkles, Ticket, Filter } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, Timestamp, writeBatch, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { toPng } from 'html-to-image';
import { CouponTicket } from '@/components/coupon-ticket';
import { Checkbox } from '@/components/ui/checkbox';


interface Code {
  id: string;
  code: string;
  type: '종달코드' | '메이트코드' | '온라인 특수코드' | '히든코드' | '선착순코드';
  value: number;
  used?: boolean;
  completed?: boolean;
  usedBy: string | string[] | null;
  createdAt: Timestamp;
  ownerStudentId?: string;
  participants?: string[];
  limit?: number;
}


export default function AdminCodesPage() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isBulkCreateDialogOpen, setIsBulkCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [newCode, setNewCode] = useState('');
  const [newCodeType, setNewCodeType] = useState<Code['type'] | ''>('');
  const [newCodeValue, setNewCodeValue] = useState('');
  const [newCodeOwnerStudentId, setNewCodeOwnerStudentId] = useState('');
  const [newCodeLimit, setNewCodeLimit] = useState('');


  const [bulkCodeType, setBulkCodeType] = useState<Code['type'] | ''>('');
  const [bulkCodeValue, setBulkCodeValue] = useState('');
  const [bulkCodeQuantity, setBulkCodeQuantity] = useState('');

  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  const [generatedCouponInfo, setGeneratedCouponInfo] = useState<{code: string, value: number, type: Code['type']} | null>(null);
  const couponRef = useRef<HTMLDivElement>(null);
  const a4ContainerRef = useRef<HTMLDivElement>(null);

  const [gradeFilter, setGradeFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');


  const { toast } = useToast();

  const fetchCodes = useCallback(async () => {
    setIsLoading(true);
    try {
      const codesCollection = collection(db, 'codes');
      const q = query(codesCollection, orderBy('createdAt', 'desc'));
      const codeSnapshot = await getDocs(q);
      const codeList = codeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Code));
      setCodes(codeList);
      
    } catch (error) {
      console.error("Error fetching codes: ", error);
      toast({ title: "오류", description: "코드를 불러오는 데 실패했습니다.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  const filteredCodes = useMemo(() => {
    if (!gradeFilter && !classFilter) {
      return codes;
    }
    return codes.filter(code => {
      const studentIds = new Set<string>();
      
      if (Array.isArray(code.usedBy)) {
        code.usedBy.forEach(id => studentIds.add(id));
      } else if (typeof code.usedBy === 'string') {
        studentIds.add(code.usedBy);
      }
      
      if (code.ownerStudentId) {
        studentIds.add(code.ownerStudentId);
      }
      
      if (code.participants) {
        code.participants.forEach(id => studentIds.add(id));
      }

      for (const studentId of studentIds) {
        if (typeof studentId !== 'string' || !/^\d{5}$/.test(studentId)) continue;
        
        const grade = studentId.substring(0, 1);
        const studentClass = studentId.substring(1, 3);
        
        const gradeMatch = gradeFilter ? grade === gradeFilter : true;
        const classMatch = classFilter ? studentClass === classFilter : true;

        if (gradeMatch && classMatch) {
          return true;
        }
      }
      
      return false;
    });
  }, [codes, gradeFilter, classFilter]);


  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const handleShowCoupon = (code: Code) => {
    setGeneratedCouponInfo({ code: code.code, value: code.value, type: code.type });
  }

  const generateRandomCode = (length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  

  const handleCreateCode = async () => {
    if (!newCodeType || !newCodeValue || !newCode) {
        toast({ title: "입력 오류", description: "코드, 유형, 포인트 값을 모두 채워주세요.", variant: "destructive" });
        return;
    }
     if (newCodeType === '메이트코드' && !newCodeOwnerStudentId) {
      toast({ title: "입력 오류", description: "메이트코드는 소유자 학번이 필요합니다.", variant: "destructive" });
      return;
    }
    if (newCodeType === '선착순코드' && (!newCodeLimit || Number(newCodeLimit) <= 0)) {
        toast({ title: "입력 오류", description: "선착순 코드는 유효한 사용 제한 인원이 필요합니다.", variant: "destructive" });
        return;
    }

    setIsCreating(true);
    try {
      const finalCode = newCode.toUpperCase();

      let codeData: any = {
        code: finalCode,
        type: newCodeType,
        value: Number(newCodeValue),
        used: false,
        usedBy: [],
        createdAt: Timestamp.now(),
      };

       if (newCodeType === '메이트코드') {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('studentId', '==', newCodeOwnerStudentId));
        const userSnapshot = await getDocs(q);

        if (userSnapshot.empty) {
            throw new Error(`학번 ${newCodeOwnerStudentId}에 해당하는 사용자를 찾을 수 없습니다.`);
        }
        const userDoc = userSnapshot.docs[0];
        codeData = {
            ...codeData,
            ownerUid: userDoc.id,
            ownerStudentId: newCodeOwnerStudentId,
            participants: [newCodeOwnerStudentId]
        };
      } else if (newCodeType === '선착순코드') {
          codeData.limit = Number(newCodeLimit);
      }


      await addDoc(collection(db, 'codes'), codeData);

      toast({ title: "성공", description: "새 코드를 생성했습니다." });
      setGeneratedCouponInfo({ code: codeData.code, value: codeData.value, type: codeData.type });

      setNewCode('');
      setNewCodeType('');
      setNewCodeValue('');
      setNewCodeOwnerStudentId('');
      setNewCodeLimit('');
      setIsCreateDialogOpen(false);
      fetchCodes();
    } catch (error: any) {
      toast({ title: "오류", description: error.message || "코드 생성에 실패했습니다.", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleBulkCreateCodes = async () => {
    const value = Number(bulkCodeValue);
    const quantity = Number(bulkCodeQuantity);

    if (!bulkCodeType || !value || value <= 0 || !quantity || quantity <= 0) {
      toast({ title: "입력 오류", description: "유효한 코드 유형, 포인트 값, 수량을 입력해주세요.", variant: "destructive" });
      return;
    }
    
    if (quantity > 500) {
        toast({ title: "입력 오류", description: "한 번에 500개 이상의 코드를 생성할 수 없습니다.", variant: "destructive" });
        return;
    }

    setIsCreating(true);
    try {
      const batch = writeBatch(db);
      const codesCollection = collection(db, 'codes');
      let lastGeneratedCode: string | null = null;

      for (let i = 0; i < quantity; i++) {
        const newCodeRef = doc(codesCollection);
        const codeValue = generateRandomCode(6);
        lastGeneratedCode = codeValue;

        let codeData: any = {
          code: codeValue,
          type: bulkCodeType,
          value: value,
          used: false,
          createdAt: Timestamp.now(),
        };

        batch.set(newCodeRef, codeData);
      }

      await batch.commit();

      toast({ title: "성공!", description: `${quantity}개의 코드를 성공적으로 생성했습니다.` });

      if (lastGeneratedCode && bulkCodeType) {
        setGeneratedCouponInfo({ code: lastGeneratedCode, value: value, type: bulkCodeType });
      }

      setBulkCodeValue('');
      setBulkCodeQuantity('');
      setBulkCodeType('');
      setIsBulkCreateDialogOpen(false);
      fetchCodes();

    } catch (error: any) {
      console.error("Bulk code creation error: ", error);
      toast({ title: "오류", description: error.message || "코드 대량 생성 중 오류가 발생했습니다.", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!window.confirm('정말로 이 코드를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setIsDeleting(codeId);
    try {
      await deleteDoc(doc(db, 'codes', codeId));
      toast({ title: "성공", description: "코드를 삭제했습니다." });
      fetchCodes(); // Fetch the updated list of codes
    } catch (error) {
      console.error("Error deleting code: ", error);
      toast({ title: "오류", description: "코드 삭제에 실패했습니다.", variant: "destructive" });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDownloadCoupon = useCallback(() => {
    if (!couponRef.current || !generatedCouponInfo) {
      return;
    }

    toPng(couponRef.current, { cacheBust: true, pixelRatio: 2, fontEmbedCSS: '@font-face { font-family: "Gowun Batang"; }', })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `JDS_Coupon_${generatedCouponInfo.code}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error(err);
        toast({ title: "이미지 생성 오류", description: "쿠폰 이미지 생성에 실패했습니다.", variant: "destructive" });
      });
  }, [generatedCouponInfo, toast]);

  const handleDownloadSelected = async () => {
    if (selectedCodes.length === 0) {
      toast({ title: "오류", description: "다운로드할 코드를 선택해주세요.", variant: "destructive" });
      return;
    }
    setIsDownloading(true);

    try {
      // A4 Portrait: 210mm x 297mm. At 300 DPI: 2480 x 3508 pixels
      const a4Width = 2480; 
      const a4Height = 3508;

      const canvas = document.createElement('canvas');
      canvas.width = a4Width;
      canvas.height = a4Height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context not available");

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, a4Width, a4Height);
      
      const codesToRender = codes.filter(c => selectedCodes.includes(c.id));
      
      const couponWidth = 250; 
      const couponHeight = 400;
      
      const columns = 5;
      const rows = 6;
      const couponsPerPage = columns * rows;
      
      const cellWidth = a4Width / columns;
      const cellHeight = a4Height / rows;
      
      const scale = Math.min((cellWidth * 0.9) / couponWidth, (cellHeight * 0.9) / couponHeight);
      const scaledWidth = couponWidth * scale;
      const scaledHeight = couponHeight * scale;

      const imagePromises = codesToRender.slice(0, couponsPerPage).map(code => {
        const couponNode = document.getElementById(`coupon-render-${code.id}`);
        if (!couponNode) return Promise.resolve(null);
        return toPng(couponNode, { 
            pixelRatio: 2,
            width: couponWidth,
            height: couponHeight,
            cacheBust: true,
            fontEmbedCSS: '@font-face {}',
        });
      });

      const dataUrls = await Promise.all(imagePromises);

      for (let i = 0; i < dataUrls.length; i++) {
        const dataUrl = dataUrls[i];
        if (!dataUrl) continue;

        const img = new Image();
        
        await new Promise<void>((resolve, reject) => {
            img.onload = () => {
                const row = Math.floor(i / columns);
                const col = i % columns;
                const x = (col * cellWidth) + (cellWidth - scaledWidth) / 2;
                const y = (row * cellHeight) + (cellHeight - scaledHeight) / 2;
                ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
                resolve();
            };
            img.onerror = reject;
            img.src = dataUrl;
        });
      }
       
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([15, 15]);

      for (let i = 1; i < rows; i++) {
          const y = i * cellHeight;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(a4Width, y);
          ctx.stroke();
      }

      for (let i = 1; i < columns; i++) {
          const x = i * cellWidth;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, a4Height);
          ctx.stroke();
      }
      
      const finalImage = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `JDS_Coupons_A4_x${couponsPerPage}.png`;
      link.href = finalImage;
      link.click();
      
      setSelectedCodes([]);

    } catch (err: any) {
      console.error(err);
      toast({ title: "이미지 생성 오류", description: err.message || "쿠폰 이미지 생성에 실패했습니다.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };


  const renderStatus = (code: Code) => {
    if (code.type === '메이트코드') {
        const usedCount = Array.isArray(code.usedBy) ? code.usedBy.length : 0;
        return <Badge variant="secondary">{`${usedCount}회 사용됨`}</Badge>;
    }
    if (code.type === '선착순코드') {
        const usedCount = Array.isArray(code.usedBy) ? code.usedBy.length : 0;
        const limit = code.limit || 0;
        const isFull = usedCount >= limit;
        return <Badge variant={isFull ? 'outline' : 'default'}>{`${usedCount} / ${limit} 사용`}</Badge>;
    }
    return <Badge variant={code.used ? 'outline' : 'default'}>{code.used ? '사용됨' : '미사용'}</Badge>;
  };

  const renderUsedBy = (code: Code) => {
    if (code.type === '메이트코드') {
        return `소유자: ${code.ownerStudentId} | 팀: ${code.participants?.join(', ')}`;
    }
    if (code.type === '히든코드' && code.used && Array.isArray(code.usedBy)) {
        return code.usedBy.join(', ');
    }
    if (code.type === '선착순코드') {
        if (Array.isArray(code.usedBy) && code.usedBy.length > 0) {
            return code.usedBy.join(', ');
        }
        return 'N/A';
    }
    return Array.isArray(code.usedBy) ? code.usedBy.join(', ') : code.usedBy || 'N/A';
  }

  const handleSelectCode = (codeId: string, checked: boolean) => {
    setSelectedCodes(prev => 
      checked ? [...prev, codeId] : prev.filter(id => id !== codeId)
    );
  };
  
  const handleSelectAll = (checked: boolean) => {
    setSelectedCodes(checked ? filteredCodes.map(c => c.id) : []);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight font-headline">코드 관리</h1>
          <p className="text-muted-foreground">발급된 모든 코드를 관리합니다.</p>
        </div>
        <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={handleDownloadSelected} disabled={isDownloading || selectedCodes.length === 0}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    선택 다운로드
                </span>
            </Button>
             <Dialog open={isBulkCreateDialogOpen} onOpenChange={setIsBulkCreateDialogOpen}>
                <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1"><Sparkles className="h-3.5 w-3.5" /><span className="sr-only sm:not-sr-only sm:whitespace-nowrap">대량 생성</span></Button>
                </DialogTrigger>
                    <DialogContent>
                    <DialogHeader>
                    <DialogTitle>코드 대량 생성</DialogTitle>
                    <DialogDescription>지정한 유형과 값으로 여러 개의 코드를 자동으로 생성합니다.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="bulk-code-type" className="text-right">유형</Label>
                        <Select onValueChange={(value) => setBulkCodeType(value as any)} value={bulkCodeType} disabled={isCreating}>
                        <SelectTrigger className="col-span-3"><SelectValue placeholder="코드 유형 선택" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="종달코드">종달코드</SelectItem>
                            <SelectItem value="히든코드">히든코드 (파트너)</SelectItem>
                        </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="bulk-quantity" className="text-right">수량</Label>
                        <Input id="bulk-quantity" type="number" placeholder="예: 50" className="col-span-3" value={bulkCodeQuantity} onChange={(e) => setBulkCodeQuantity(e.target.value)} disabled={isCreating} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="bulk-lak-value" className="text-right">포인트 값</Label>
                        <Input id="bulk-lak-value" type="number" placeholder="예: 5" className="col-span-3" value={bulkCodeValue} onChange={(e) => setBulkCodeValue(e.target.value)} disabled={isCreating} />
                    </div>
                    </div>
                    <DialogFooter>
                    <DialogClose asChild><Button variant="outline" disabled={isCreating}>취소</Button></DialogClose>
                    <Button type="submit" onClick={handleBulkCreateCodes} disabled={isCreating}>{isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}생성하기</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-1"><PlusCircle className="h-3.5 w-3.5" /><span className="sr-only sm:not-sr-only sm:whitespace-nowrap">수동 생성</span></Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>새 코드 생성</DialogTitle>
                <DialogDescription>새로운 코드를 수동으로 생성합니다. 유형과 값을 지정하세요.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="code-value" className="text-right">코드</Label>
                        <Input id="code-value" placeholder="예: NEWCODE24" className="col-span-3 font-mono" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} disabled={isCreating} />
                    </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="code-type" className="text-right">유형</Label>
                    <Select onValueChange={(value) => setNewCodeType(value as any)} value={newCodeType} disabled={isCreating}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="코드 유형 선택" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="종달코드">종달코드</SelectItem>
                        <SelectItem value="메이트코드">메이트코드</SelectItem>
                        <SelectItem value="히든코드">히든코드 (파트너)</SelectItem>
                        <SelectItem value="선착순코드">선착순코드 (다회용)</SelectItem>
                        <SelectItem value="온라인 특수코드">온라인 특수코드</SelectItem>
                    </SelectContent>
                    </Select>
                </div>
                {newCodeType === '메이트코드' && (
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="owner-student-id" className="text-right">소유자 학번</Label>
                        <Input id="owner-student-id" placeholder="연동할 학생의 학번" className="col-span-3" value={newCodeOwnerStudentId} onChange={(e) => setNewCodeOwnerStudentId(e.target.value)} disabled={isCreating}/>
                    </div>
                )}
                {newCodeType === '선착순코드' && (
                    <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="limit" className="text-right">사용 제한 인원</Label>
                    <Input id="limit" type="number" placeholder="예: 10 (10명까지 사용 가능)" className="col-span-3" value={newCodeLimit} onChange={(e) => setNewCodeLimit(e.target.value)} disabled={isCreating}/>
                    </div>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="lak-value" className="text-right">포인트 값</Label>
                    <Input id="lak-value" type="number" placeholder="예: 5" className="col-span-3" value={newCodeValue} onChange={(e) => setNewCodeValue(e.target.value)} disabled={isCreating} />
                </div>
                </div>
                <DialogFooter>
                <DialogClose asChild><Button variant="outline" disabled={isCreating}>취소</Button></DialogClose>
                <Button type="submit" onClick={handleCreateCode} disabled={isCreating}>{isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}생성하기</Button>
                </DialogFooter>
            </DialogContent>
            </Dialog>
        </div>
      </div>
      
       <Card className="mb-4">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
                <Filter className="h-4 w-4 text-muted-foreground"/>
                <Label htmlFor="grade-filter" className="shrink-0">학년</Label>
                <Input 
                    id="grade-filter"
                    placeholder="예: 1" 
                    className="w-20"
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                />
                <Label htmlFor="class-filter" className="shrink-0">반</Label>
                <Input 
                    id="class-filter"
                    placeholder="예: 03" 
                    className="w-20"
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                />
            </div>
             <Button variant="outline" onClick={() => { setGradeFilter(''); setClassFilter(''); }}>필터 초기화</Button>
        </CardContent>
       </Card>

       <Card>
          <CardContent className="p-0">
          <Table>
              <TableHeader>
              <TableRow>
                  <TableHead className="w-[50px]">
                  <Checkbox 
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                      checked={selectedCodes.length === filteredCodes.length && filteredCodes.length > 0}
                      aria-label="Select all"
                  />
                  </TableHead>
                  <TableHead>코드</TableHead>
                  <TableHead className="hidden sm:table-cell">쿠폰</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>포인트 값</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="hidden sm:table-cell">사용자/대상</TableHead>
                  <TableHead className="hidden md:table-cell">생성일</TableHead>
                  <TableHead className="text-right">작업</TableHead>
              </TableRow>
              </TableHeader>
              <TableBody>
              {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                      <TableCell colSpan={9}><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                  ))
              ) : filteredCodes.length === 0 ? (
                  <TableRow>
                  <TableCell colSpan={9} className="text-center h-24">조건에 맞는 코드가 없습니다.</TableCell>
                  </TableRow>
              ) : (
                  filteredCodes.map((c) => (
                  <TableRow key={c.id} data-state={selectedCodes.includes(c.id) && "selected"}>
                      <TableCell>
                      <Checkbox
                          onCheckedChange={(checked) => handleSelectCode(c.id, checked as boolean)}
                          checked={selectedCodes.includes(c.id)}
                          aria-label={`Select code ${c.code}`}
                      />
                      </TableCell>
                      <TableCell className="font-mono font-medium">{c.code}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                      <Button variant="ghost" size="icon" onClick={() => handleShowCoupon(c)}>
                          <Ticket className="h-5 w-5" />
                      </Button>
                      </TableCell>
                      <TableCell>{c.type}</TableCell>
                      <TableCell>{c.value} 포인트</TableCell>
                      <TableCell>{renderStatus(c)}</TableCell>
                      <TableCell className="hidden sm:table-cell">{renderUsedBy(c)}</TableCell>
                      <TableCell className="hidden md:table-cell">{c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                      <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteCode(c.id)}
                          disabled={isDeleting === c.id}
                      >
                          {isDeleting === c.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                          <Trash2 className="h-4 w-4 text-red-500" />
                          )}
                          <span className="sr-only">Delete Code</span>
                      </Button>
                      </TableCell>
                  </TableRow>
                  ))
              )}
              </TableBody>
          </Table>
          </CardContent>
      </Card>
      
      {/* Coupon Display Dialog */}
      <Dialog open={!!generatedCouponInfo} onOpenChange={(isOpen) => !isOpen && setGeneratedCouponInfo(null)}>
        <DialogContent className="sm:max-w-md bg-transparent border-none shadow-none flex items-center justify-center p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>쿠폰 생성 완료</DialogTitle>
            <DialogDescription>
              아래 쿠폰 이미지를 다운로드하여 사용하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
             {generatedCouponInfo && (
              <CouponTicket
                ref={couponRef}
                code={generatedCouponInfo.code}
                value={generatedCouponInfo.value}
                type={generatedCouponInfo.type}
              />
            )}
             <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 w-full flex justify-center gap-2">
                 <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      닫기
                    </Button>
                  </DialogClose>
                <Button type="button" onClick={handleDownloadCoupon}>
                  <Download className="mr-2 h-4 w-4" />
                  이미지 다운로드
                </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Hidden container for rendering coupons for A4 download */}
      <div ref={a4ContainerRef} className="absolute -left-[9999px] top-0">
          {codes
            .filter(c => selectedCodes.includes(c.id))
            .slice(0, 30) // 5x6 grid
            .map(c => (
              <div key={`render-${c.id}`} id={`coupon-render-${c.id}`} style={{ width: 250, height: 400 }}>
                <CouponTicket code={c.code} value={c.value} type={c.type} />
              </div>
          ))}
      </div>
    </>
  );
}

    

    
