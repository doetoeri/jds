import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline text-primary">로그인</CardTitle>
        <CardDescription>
          종달샘 허브 계정으로 로그인하세요.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="studentId">학번 (5자리)</Label>
          <Input id="studentId" placeholder="예: 10203" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">비밀번호</Label>
          <Input id="password" type="password" required />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button className="w-full font-bold" asChild>
          <Link href="/dashboard">로그인</Link>
        </Button>
        <div className="text-center text-sm">
          계정이 없으신가요?{' '}
          <Link href="/signup" className="font-semibold text-primary underline">
            회원가입
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
