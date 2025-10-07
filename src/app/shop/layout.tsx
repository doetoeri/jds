import type { ReactNode } from "react";
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full isolate flex flex-col items-center justify-center p-4">
        <Button asChild variant="ghost" className="absolute top-4 left-4">
            <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4"/>
                홈으로 돌아가기
            </Link>
        </Button>
      <div className="relative z-10 w-full max-w-5xl my-8">
        {children}
      </div>
    </div>
  );
}
