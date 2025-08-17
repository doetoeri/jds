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
  { studentId: '10101', email: 'user1@example.com', jongdalCode: 'A4B8', lak: 15 },
  { studentId: '10203', email: 'user2@example.com', jongdalCode: 'C7D1', lak: 5 },
  { studentId: '20305', email: 'user3@example.com', jongdalCode: 'E9F2', lak: 32 },
  { studentId: '30408', email: 'user4@example.com', jongdalCode: 'G3H5', lak: 0 },
  { studentId: '10512', email: 'user5@example.com', jongdalCode: 'I7J9', lak: 100 },
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
              <TableHead>이메일</TableHead>
              <TableHead>종달 코드</TableHead>
              <TableHead className="text-right">보유 Lak</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.studentId}>
                <TableCell className="font-medium">{user.studentId}</TableCell>
                <TableCell>{user.email}</TableCell>
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
