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

export default function SignupPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline text-primary">회원가입</CardTitle>
        <CardDescription>
          새로운 종달샘 허브 계정을 만듭니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="studentId">학번 (5자리)</Label>
          <Input id="studentId" placeholder="예: 10203 (1학년 2반 3번)" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">전화번호</Label>
          <Input id="phone" type="tel" placeholder="010-1234-5678" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">비밀번호</Label>
          <Input id="password" type="password" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">비밀번호 확인</Label>
          <Input id="confirm-password" type="password" required />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button className="w-full font-bold" asChild>
          <Link href="/login">회원가입</Link>
        </Button>
        <div className="text-center text-sm">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-semibold text-primary underline">
            로그인
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
