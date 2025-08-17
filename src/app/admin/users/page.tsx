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

const users = [
  { studentId: '10101', phone: '010-1111-1111', jongdalCode: 'A4B8', lak: 15 },
  { studentId: '10203', phone: '010-2222-2222', jongdalCode: 'C7D1', lak: 5 },
  { studentId: '20305', phone: '010-3333-3333', jongdalCode: 'E9F2', lak: 32 },
  { studentId: '30408', phone: '010-4444-4444', jongdalCode: 'G3H5', lak: 0 },
  { studentId: '10512', phone: '010-5555-5555', jongdalCode: 'I7J9', lak: 100 },
];

export default function AdminUsersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">사용자 관리</CardTitle>
        <CardDescription>시스템에 등록된 모든 사용자 목록입니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>학번</TableHead>
              <TableHead>전화번호</TableHead>
              <TableHead>종달 코드</TableHead>
              <TableHead className="text-right">보유 Lak</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.studentId}>
                <TableCell className="font-medium">{user.studentId}</TableCell>
                <TableCell>{user.phone}</TableCell>
                <TableCell className="font-mono">{user.jongdalCode}</TableCell>
                <TableCell className="text-right">{user.lak.toLocaleString()} Lak</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
