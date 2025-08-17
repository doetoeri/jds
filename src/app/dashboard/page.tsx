import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Coins } from 'lucide-react';

export default function DashboardPage() {
  const lakBalance = 15;

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight font-headline">대시보드</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">나의 Lak</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lakBalance.toLocaleString()} Lak</div>
            <p className="text-xs text-muted-foreground">
              (1 라크 = 500원)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
