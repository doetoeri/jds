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

const transactions = [
  {
    date: '2024-05-20',
    description: '4자리 종달코드 사용 (친구: B7C1)',
    amount: 1,
    type: 'credit',
  },
  {
    date: '2024-05-18',
    description: '5자리 메이트 코드 사용',
    amount: 3,
    type: 'credit',
  },
  {
    date: '2024-05-15',
    description: '온라인 특수 코드 "JONGDAL-SPECIAL" 사용',
    amount: 5,
    type: 'credit',
  },
  {
    date: '2024-05-12',
    description: '상품 구매: 떡볶이',
    amount: -4,
    type: 'debit',
  },
  {
    date: '2024-05-10',
    description: '4자리 종달코드 사용 (친구: D9E3)',
    amount: 1,
    type: 'credit',
  },
];

export default function HistoryPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">사용 내역</CardTitle>
        <CardDescription>나의 Lak 사용 및 적립 내역입니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>날짜</TableHead>
              <TableHead>내용</TableHead>
              <TableHead className="text-right">금액</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{transaction.date}</TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={transaction.type === 'credit' ? 'default' : 'destructive'}
                    className={transaction.type === 'credit' ? 'bg-blue-500' : 'bg-red-500'}
                  >
                    {transaction.type === 'credit' ? '+' : ''}
                    {transaction.amount} Lak
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
