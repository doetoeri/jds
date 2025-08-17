import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Bird } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-transparent p-8">
      <div className="text-center">
        <div className="mb-8 inline-flex items-center justify-center rounded-full bg-primary/10 p-4">
          <Bird className="h-12 w-12 text-primary" />
        </div>
        <h1 className="font-headline text-5xl font-bold text-primary">
          종달샘 허브
        </h1>
        <p className="mt-4 max-w-md text-lg text-muted-foreground">
          고촌중학교 학생자치회 종달샘에 오신 것을 환영합니다.
          포인트를 관리하고 다양한 활동에 참여해보세요.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button asChild size="lg" className="font-bold">
            <Link href="/login">로그인</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="font-bold">
            <Link href="/signup">회원가입</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
