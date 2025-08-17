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
import { MoreHorizontal, PlusCircle, Trash2 } from 'lucide-react';
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
import { useEffect, useState } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface Code {
  id: string;
  code: string;
  type: '종달코드' | '메이트코드' | '온라인 특수코드';
  value: number;
  used: boolean;
  usedBy: string | null;
  createdAt: any;
}

export default function AdminCodesPage() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [newCode, setNewCode] = useState('');
  const [newCodeType, setNewCodeType] = useState<'종달코드' | '메이트코드' | '온라인 특수코드' | ''>('');
  const [newCodeValue, setNewCodeValue] = useState('');
  
  const { toast } = useToast();

  const fetchCodes = async () => {
    setIsLoading(true);
    const codesCollection = collection(db, 'codes');
    const codeSnapshot = await getDocs(codesCollection);
    const codeList = codeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Code)).sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    setCodes(codeList);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const handleCreateCode = async () => {
    if (!newCode || !newCodeType || !newCodeValue) {
      toast({ title: "입력 오류", description: "모든 필드를 채워주세요.", variant: "destructive" });
      return;
    }
    try {
      await addDoc(collection(db, 'codes'), {
        code: newCode,
        type: newCodeType,
        value: Number(newCodeValue),
        used: false,
        usedBy: null,
        createdAt: serverTimestamp(),
      });
      toast({ title: "성공", description: "새 코드를 생성했습니다." });
      setNewCode('');
      setNewCodeType('');
      setNewCodeValue('');
      setIsDialogOpen(false);
      fetchCodes();
    } catch (error) {
      toast({ title: "오류", description: "코드 생성에 실패했습니다.", variant: "destructive" });
    }
  };
  
  const handleDeleteCode = async (codeId: string) => {
    if (!confirm('정말로 이 코드를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    try {
      await deleteDoc(doc(db, 'codes', codeId));
      toast({ title: "성공", description: "코드를 삭제했습니다." });
      fetchCodes();
    } catch (error) {
       toast({ title: "오류", description: "코드 삭제에 실패했습니다.", variant: "destructive" });
    }
  };


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline">코드 관리</CardTitle>
          <CardDescription>발급된 모든 코드를 관리합니다.</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                새 코드 생성
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 코드 생성</DialogTitle>
              <DialogDescription>
                새로운 코드를 생성합니다. 유형과 값을 지정하세요.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code-value" className="text-right">
                  코드
                </Label>
                <Input id="code-value" placeholder="예: NEWCODE24" className="col-span-3" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code-type" className="text-right">
                  유형
                </Label>
                <Select onValueChange={(value) => setNewCodeType(value as any)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="코드 유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="종달코드">종달코드</SelectItem>
                    <SelectItem value="메이트코드">메이트코드</SelectItem>
                    <SelectItem value="온라인 특수코드">온라인 특수코드</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lak-value" className="text-right">
                  Lak 값
                </Label>
                <Input id="lak-value" type="number" placeholder="예: 5" className="col-span-3" value={newCodeValue} onChange={(e) => setNewCodeValue(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
               <DialogClose asChild>
                <Button variant="outline">취소</Button>
              </DialogClose>
              <Button type="submit" onClick={handleCreateCode}>생성하기</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>코드</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>Lak 값</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>사용한 학생</TableHead>
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))
            ) : (
              codes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-medium">{c.code}</TableCell>
                  <TableCell>{c.type}</TableCell>
                  <TableCell>{c.value} Lak</TableCell>
                  <TableCell>
                    <Badge variant={c.used ? 'outline' : 'default'}>
                      {c.used ? '사용됨' : '미사용'}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.usedBy || 'N/A'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDeleteCode(c.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          삭제
                        </DropdownMenuItem>
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
  );
}
