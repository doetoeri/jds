import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Users, QrCode, Coins } from 'lucide-react';

export default function AdminDashboardPage() {
  const totalUsers = 152;
  const totalCodes = 521;
  const totalLakRedeemed = 1230;

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight font-headline">관리자 대시보드</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 사용자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers.toLocaleString()} 명</div>
            <p className="text-xs text-muted-foreground">
              현재 시스템에 등록된 총 사용자 수
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 코드 수</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCodes.toLocaleString()} 개</div>
            <p className="text-xs text-muted-foreground">
              발급된 모든 코드의 수
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 사용된 Lak</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLakRedeemed.toLocaleString()} Lak</div>
            <p className="text-xs text-muted-foreground">
              코드를 통해 적립된 총 Lak
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
