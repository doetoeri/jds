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
import { MoreHorizontal, PlusCircle, Trash2, Loader2, QrCode as QrCodeIcon, Download, Users, Sparkles } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import QRCode from 'qrcode';
import Image from 'next/image';

interface Code {
  id: string;
  code: string;
  type: '종달코드' | '메이트코드' | '온라인 특수코드';
  value: number;
  used?: boolean;
  usedBy: string | string[] | null;
  createdAt: Timestamp;
  ownerStudentId?: string;
}

export default function AdminCodesPage() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isBulkCreateDialogOpen, setIsBulkCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  const [newCode, setNewCode] = useState('');
  const [newCodeType, setNewCodeType] = useState<'종달코드' | '메이트코드' | '온라인 특수코드' | ''>('');
  const [newCodeValue, setNewCodeValue] = useState('');

  const [bulkCodeValue, setBulkCodeValue] = useState('');
  const [bulkCodeQuantity, setBulkCodeQuantity] = useState('');


  const [generatedCode, setGeneratedCode] = useState<Code | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const qrCodeLinkRef = useRef<HTMLAnchorElement>(null);

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
  
  const generateQrCode = useCallback(async (text: string) => {
    try {
      const url = await QRCode.toDataURL(text, { width: 300, margin: 2 });
      setQrCodeUrl(url);
      return url;
    } catch (err) {
      console.error(err);
      toast({ title: "QR 코드 생성 오류", description: "QR 코드 생성에 실패했습니다.", variant: "destructive" });
      return '';
    }
  }, [toast]);

  const handleShowQrCode = (code: Code) => {
    setGeneratedCode(code);
    generateQrCode(code.code);
  }

  const handleCreateCode = async () => {
    if (!newCode || !newCodeType || !newCodeValue) {
      toast({ title: "입력 오류", description: "모든 필드를 채워주세요.", variant: "destructive" });
      return;
    }
    setIsCreating(true);
    try {
      const docRef = await addDoc(collection(db, 'codes'), {
        code: newCode.toUpperCase(),
        type: newCodeType,
        value: Number(newCodeValue),
        used: false,
        usedBy: null,
        createdAt: Timestamp.now(),
      });
      
      const createdCode: Code = {
        id: docRef.id,
        code: newCode.toUpperCase(),
        type: newCodeType as any,
        value: Number(newCodeValue),
        used: false,
        usedBy: null,
        createdAt: Timestamp.now(),
      };
      
      toast({ title: "성공", description: "새 코드를 생성했습니다." });
      setGeneratedCode(createdCode);
      await generateQrCode(createdCode.code);
      
      setNewCode('');
      setNewCodeType('');
      setNewCodeValue('');
      setIsCreateDialogOpen(false);
      fetchCodes();
    } catch (error) {
      toast({ title: "오류", description: "코드 생성에 실패했습니다.", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const generateRandomCode = (length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleBulkCreateCodes = async () => {
    const value = Number(bulkCodeValue);
    const quantity = Number(bulkCodeQuantity);

    if (!value || !quantity || value <= 0 || quantity <= 0) {
      toast({ title: "입력 오류", description: "유효한 Lak 값과 수량을 입력해주세요.", variant: "destructive" });
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
      
      for (let i = 0; i < quantity; i++) {
        const newCodeRef = doc(codesCollection);
        batch.set(newCodeRef, {
          code: generateRandomCode(5),
          type: '종달코드',
          value: value,
          used: false,
          usedBy: null,
          createdAt: Timestamp.now(),
        });
      }

      await batch.commit();

      toast({ title: "성공!", description: `${quantity}개의 코드를 성공적으로 생성했습니다.` });
      setBulkCodeValue('');
      setBulkCodeQuantity('');
      setIsBulkCreateDialogOpen(false);
      fetchCodes();

    } catch (error) {
      console.error("Bulk code creation error: ", error);
      toast({ title: "오류", description: "코드 대량 생성 중 오류가 발생했습니다.", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleDeleteCode = async (codeId: string) => {
    if (!window.confirm('정말로 이 코드를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    setIsDeleting(codeId);
    try {
      await deleteDoc(doc(db, 'codes', codeId));
      toast({ title: "성공", description: "코드를 삭제했습니다." });
      fetchCodes();
    } catch (error) {
       toast({ title: "오류", description: "코드 삭제에 실패했습니다.", variant: "destructive" });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDownloadQr = () => {
    if (qrCodeLinkRef.current && generatedCode) {
      qrCodeLinkRef.current.href = qrCodeUrl;
      qrCodeLinkRef.current.download = `JDS_QR_${generatedCode.code}.png`;
      qrCodeLinkRef.current.click();
    }
  };
  
  const renderStatus = (code: Code) => {
    if (code.type === '메이트코드') {
      const count = Array.isArray(code.usedBy) ? code.usedBy.length : 0;
      return <Badge variant={count > 0 ? "secondary" : "outline"} className="gap-1"><Users className="h-3 w-3"/>{count}회 사용</Badge>;
    }
    return <Badge variant={code.used ? 'outline' : 'default'}>{code.used ? '사용됨' : '미사용'}</Badge>;
  };
  
  const renderUsedBy = (code: Code) => {
    if (code.type === '메이트코드') {
      return `소유자: ${code.ownerStudentId}`;
    }
    return code.usedBy || 'N/A';
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
                    지정한 Lak 값과 수량만큼 5자리 코드를 자동으로 생성합니다.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="bulk-lak-value" className="text-right">
                      Lak 값
                    </Label>
                    <Input id="bulk-lak-value" type="number" placeholder="예: 5" className="col-span-3" value={bulkCodeValue} onChange={(e) => setBulkCodeValue(e.target.value)} disabled={isCreating} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="bulk-quantity" className="text-right">
                      수량
                    </Label>
                    <Input id="bulk-quantity" type="number" placeholder="예: 100" className="col-span-3" value={bulkCodeQuantity} onChange={(e) => setBulkCodeQuantity(e.target.value)} disabled={isCreating} />
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
                  <span className="sr-only sm:not-sr-only sm:whitespace-rap">
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
                    <Select onValueChange={(value) => setNewCodeType(value as any)} disabled={isCreating}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="코드 유형 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="종달코드">종달코드</SelectItem>
                        <SelectItem value="온라인 특수코드">온라인 특수코드</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                <TableHead>코드</TableHead>
                <TableHead>QR</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>Lak 값</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>사용자/소유자</TableHead>
                <TableHead>생성일</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
               {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : codes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">생성된 코드가 없습니다.</TableCell>
                </TableRow>
              ) : (
                codes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-medium">{c.code}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleShowQrCode(c)}>
                        <QrCodeIcon className="h-5 w-5" />
                      </Button>
                    </TableCell>
                    <TableCell>{c.type}</TableCell>
                    <TableCell>{c.value} Lak</TableCell>
                    <TableCell>{renderStatus(c)}</TableCell>
                    <TableCell>{renderUsedBy(c)}</TableCell>
                     <TableCell>{c.createdAt ? c.createdAt.toDate().toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button aria-haspopup="true" size="icon" variant="ghost" disabled={isDeleting === c.id || c.type === '메이트코드'}>
                            {isDeleting === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {c.type !== '메이트코드' && (
                            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => handleDeleteCode(c.id)} disabled={isDeleting !== null}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              삭제
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* QR Code Display Dialog */}
      <Dialog open={!!generatedCode} onOpenChange={(isOpen) => !isOpen && setGeneratedCode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>코드 생성 완료</DialogTitle>
            <DialogDescription>
              아래 QR코드를 다운로드하거나 코드를 직접 사용하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center gap-4 py-4">
            {qrCodeUrl ? (
              <Image src={qrCodeUrl} alt="Generated QR Code" width={250} height={250} />
            ) : (
              <Skeleton className="h-[250px] w-[250px]" />
            )}
            <div className="text-center">
              <p className="font-mono text-2xl font-bold">{generatedCode?.code}</p>
              <p className="text-lg">{generatedCode?.value} Lak</p>
            </div>
          </div>
          <DialogFooter className="sm:justify-between gap-2">
             <DialogClose asChild>
                <Button type="button" variant="secondary">
                  닫기
                </Button>
              </DialogClose>
            <Button type="button" onClick={handleDownloadQr} disabled={!qrCodeUrl}>
              <Download className="mr-2 h-4 w-4" />
              QR코드 다운로드
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <a ref={qrCodeLinkRef} style={{ display: 'none' }}></a>
    </>
  );
}

    