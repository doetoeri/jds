
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
import { PlusCircle, Trash2, Loader2, Download, Users, Sparkles, Ticket } from 'lucide-react';
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
import { useEffect, useState, useCallback, useRef } from 'react';
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
  type: '종달코드' | '메이트코드' | '온라인 특수코드' | '히든코드';
  value: number;
  used?: boolean;
  usedBy: string | string[] | null;
  createdAt: Timestamp;
  ownerStudentId?: string;
  participants?: string[];
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


  const [bulkCodeType, setBulkCodeType] = useState<Code['type'] | ''>('');
  const [bulkCodeValue, setBulkCodeValue] = useState('');
  const [bulkCodeQuantity, setBulkCodeQuantity] = useState('');

  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);


  const [generatedCouponInfo, setGeneratedCouponInfo] = useState<{code: string, value: number, type: Code['type']} | null>(null);
  const couponRef = useRef<HTMLDivElement>(null);
  const a4ContainerRef = useRef<HTMLDivElement>(null);


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
        toast({ title: "입력 오류", description: "코드, 유형, Lak 값을 모두 채워주세요.", variant: "destructive" });
        return;
    }
     if (newCodeType === '메이트코드' && !newCodeOwnerStudentId) {
      toast({ title: "입력 오류", description: "메이트코드는 소유자 학번이 필요합니다.", variant: "destructive" });
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
      }


      await addDoc(collection(db, 'codes'), codeData);

      toast({ title: "성공", description: "새 코드를 생성했습니다." });
      setGeneratedCouponInfo({ code: codeData.code, value: codeData.value, type: codeData.type });

      setNewCode('');
      setNewCodeType('');
      setNewCodeValue('');
      setNewCodeOwnerStudentId('');
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
      toast({ title: "입력 오류", description: "유효한 코드 유형, Lak 값, 수량을 입력해주세요.", variant: "destructive" });
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

    toPng(couponRef.current, { cacheBust: true, pixelRatio: 2 })
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
      // Standard A4 dimensions in pixels at 300 DPI (for high quality)
      const a4Width = 3508;
      const a4Height = 2480;

      const canvas = document.createElement('canvas');
      canvas.width = a4Width;
      canvas.height = a4Height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context not available");

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, a4Width, a4Height);
      
      const codesToRender = codes.filter(c => selectedCodes.includes(c.id));
      
      const couponWidth = 480; 
      const couponHeight = 300;
      
      const columns = 4;
      const rows = 2;
      const slotWidth = a4Width / columns;
      const slotHeight = a4Height / rows;

      const scale = Math.min(slotWidth / couponWidth, slotHeight / couponHeight) * 0.95; // Add some padding
      const scaledWidth = couponWidth * scale;
      const scaledHeight = couponHeight * scale;

      for (let i = 0; i < codesToRender.length; i++) {
        if (i >= 8) break; 

        const code = codesToRender[i];
        const couponNode = document.getElementById(`coupon-render-${code.id}`);
        if (!couponNode) continue;
        
        const dataUrl = await toPng(couponNode, { 
            pixelRatio: 2,
            width: couponWidth,
            height: couponHeight,
            cacheBust: true
        });

        const img = new Image();
        
        await new Promise<void>((resolve, reject) => {
            img.onload = () => {
                const row = Math.floor(i / columns);
                const col = i % columns;
                const x = (col * slotWidth) + (slotWidth - scaledWidth) / 2;
                const y = (row * slotHeight) + (slotHeight - scaledHeight) / 2;
                ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
                resolve();
            };
            img.onerror = reject;
            img.src = dataUrl;
        });
      }
      
      const finalImage = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = 'A4_Coupons.png';
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
        const participantsList = Array.isArray(code.participants) ? code.participants : [];
        const useCount = Math.max(0, participantsList.length -1); 
        return <Badge variant={useCount > 0 ? "secondary" : "outline"} className="gap-1"><Users className="h-3 w-3"/>{useCount > 0 ? `${useCount}회 사용` : '미사용'}</Badge>;
    }
    return <Badge variant={code.used ? 'outline' : 'default'}>{code.used ? '사용됨' : '미사용'}</Badge>;
  };

  const renderUsedBy = (code: Code) => {
    if (code.type === '메이트코드') {
        return `소유자: ${code.ownerStudentId}`;
    }
    if (code.type === '히든코드' && code.used && Array.isArray(code.usedBy)) {
        return code.usedBy.join(', ');
    }
    return Array.isArray(code.usedBy) ? code.usedBy.join(', ') : code.usedBy || 'N/A';
  }

  const handleSelectCode = (codeId: string, checked: boolean) => {
    setSelectedCodes(prev => 
      checked ? [...prev, codeId] : prev.filter(id => id !== codeId)
    );
  };
  
  const handleSelectAll = (checked: boolean) => {
    setSelectedCodes(checked ? codes.map(c => c.id) : []);
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline">코드 관리</CardTitle>
            <CardDescription>발급된 모든 코드를 관리합니다.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={handleDownloadSelected} disabled={isDownloading || selectedCodes.length === 0}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    선택 항목 다운로드
                </span>
            </Button>
            {/* Bulk Create Dialog */}
            <Dialog open={isBulkCreateDialogOpen} onOpenChange={setIsBulkCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    대량 생성
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>코드 대량 생성</DialogTitle>
                  <DialogDescription>
                    지정한 유형과 값으로 여러 개의 코드를 자동으로 생성합니다.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="bulk-code-type" className="text-right">
                      유형
                    </Label>
                    <Select onValueChange={(value) => setBulkCodeType(value as any)} value={bulkCodeType} disabled={isCreating}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="코드 유형 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="종달코드">종달코드</SelectItem>
                        <SelectItem value="히든코드">히든코드 (파트너)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="bulk-quantity" className="text-right">
                      수량
                    </Label>
                    <Input id="bulk-quantity" type="number" placeholder="예: 50" className="col-span-3" value={bulkCodeQuantity} onChange={(e) => setBulkCodeQuantity(e.target.value)} disabled={isCreating} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="bulk-lak-value" className="text-right">
                      Lak 값
                    </Label>
                    <Input id="bulk-lak-value" type="number" placeholder="예: 5" className="col-span-3" value={bulkCodeValue} onChange={(e) => setBulkCodeValue(e.target.value)} disabled={isCreating} />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" disabled={isCreating}>취소</Button>
                  </DialogClose>
                  <Button type="submit" onClick={handleBulkCreateCodes} disabled={isCreating}>
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    생성하기
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Single Create Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    수동 생성
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>새 코드 생성</DialogTitle>
                  <DialogDescription>
                    새로운 코드를 수동으로 생성합니다. 유형과 값을 지정하세요.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="code-value" className="text-right">
                        코드
                        </Label>
                        <Input id="code-value" placeholder="예: NEWCODE24" className="col-span-3 font-mono" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} disabled={isCreating} />
                    </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="code-type" className="text-right">
                      유형
                    </Label>
                    <Select onValueChange={(value) => setNewCodeType(value as any)} value={newCodeType} disabled={isCreating}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="코드 유형 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="종달코드">종달코드</SelectItem>
                        <SelectItem value="온라인 특수코드">온라인 특수코드</SelectItem>
                        <SelectItem value="메이트코드">메이트코드</SelectItem>
                        <SelectItem value="히든코드">히든코드 (파트너)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                   {newCodeType === '메이트코드' && (
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="owner-student-id" className="text-right">
                        소유자 학번
                        </Label>
                        <Input
                        id="owner-student-id"
                        placeholder="연동할 학생의 학번"
                        className="col-span-3"
                        value={newCodeOwnerStudentId}
                        onChange={(e) => setNewCodeOwnerStudentId(e.target.value)}
                        disabled={isCreating}
                        />
                    </div>
                  )}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="lak-value" className="text-right">
                      Lak 값
                    </Label>
                    <Input id="lak-value" type="number" placeholder="예: 5" className="col-span-3" value={newCodeValue} onChange={(e) => setNewCodeValue(e.target.value)} disabled={isCreating} />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" disabled={isCreating}>취소</Button>
                  </DialogClose>
                  <Button type="submit" onClick={handleCreateCode} disabled={isCreating}>
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    생성하기
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox 
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                    checked={selectedCodes.length === codes.length && codes.length > 0}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>코드</TableHead>
                <TableHead className="hidden sm:table-cell">쿠폰</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>Lak 값</TableHead>
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
              ) : codes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">생성된 코드가 없습니다.</TableCell>
                </TableRow>
              ) : (
                codes.map((c) => (
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
                    <TableCell>{c.value} Lak</TableCell>
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
        <DialogContent className="sm:max-w-md bg-transparent border-none shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>쿠폰 생성 완료</DialogTitle>
            <DialogDescription>
              아래 쿠폰 이미지를 다운로드하여 사용하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center my-4">
             {generatedCouponInfo && (
              <CouponTicket
                ref={couponRef}
                code={generatedCouponInfo.code}
                value={generatedCouponInfo.value}
                type={generatedCouponInfo.type}
              />
            )}
          </div>
          <DialogFooter className="sm:justify-between gap-2">
             <DialogClose asChild>
                <Button type="button" variant="secondary">
                  닫기
                </Button>
              </DialogClose>
            <Button type="button" onClick={handleDownloadCoupon}>
              <Download className="mr-2 h-4 w-4" />
              쿠폰 이미지 다운로드
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Hidden container for rendering coupons for A4 download */}
      <div ref={a4ContainerRef} className="absolute -left-[9999px] top-0">
          {codes
            .filter(c => selectedCodes.includes(c.id))
            .slice(0, 8)
            .map(c => (
              <div key={`render-${c.id}`} id={`coupon-render-${c.id}`} style={{ width: 480, height: 300 }}>
                <CouponTicket code={c.code} value={c.value} type={c.type} />
              </div>
          ))}
      </div>
    </>
  );
}
