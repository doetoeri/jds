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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const codes = [
  { code: 'A4B8', type: '종달코드', value: 1, used: true, usedBy: '10203' },
  { code: 'C7D1-E9F2', type: '메이트코드', value: 3, used: true, usedBy: '10101' },
  { code: 'SPECIAL24', type: '온라인 특수코드', value: 10, used: false, usedBy: null },
  { code: 'G3H5', type: '종달코드', value: 1, used: false, usedBy: null },
  { code: 'WELCOME5', type: '온라인 특수코드', value: 5, used: true, usedBy: '20305' },
];

export default function AdminCodesPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline">코드 관리</CardTitle>
          <CardDescription>발급된 모든 코드를 관리합니다.</CardDescription>
        </div>
        <Dialog>
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
                <Input id="code-value" placeholder="예: NEWCODE24" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code-type" className="text-right">
                  유형
                </Label>
                <Select>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="코드 유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jongdal">종달코드</SelectItem>
                    <SelectItem value="mate">메이트코드</SelectItem>
                    <SelectItem value="special">온라인 특수코드</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lak-value" className="text-right">
                  Lak 값
                </Label>
                <Input id="lak-value" type="number" placeholder="예: 5" className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">생성하기</Button>
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
            {codes.map((c) => (
              <TableRow key={c.code}>
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
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
