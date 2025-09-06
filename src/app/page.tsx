'use client';

import { ChevronRight, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="relative flex flex-col items-center justify-end min-h-screen p-4 text-center overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button asChild size="lg" className="font-bold w-full sm:w-auto">
                <Link href="/login">
                    로그인하여 시작하기 <ChevronRight className="ml-2"/>
                </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="w-full sm:w-auto text-muted-foreground">
                <Link href="/guide">
                    <HelpCircle className="mr-2"/> 사용 가이드
                </Link>
            </Button>
        </div>
        
        <div className="w-full select-none" aria-hidden="true">
           <svg viewBox="0 0 1100 220" preserveAspectRatio="xMidYMid meet" className="w-full">
                <text 
                    x="50%" 
                    y="50%" 
                    dy=".35em"
                    textAnchor="middle" 
                    className="font-batang font-black fill-current text-primary" 
                    style={{ fontSize: '180px' }}
                >
                    JongDalSam
                </text>
            </svg>
        </div>
    </div>
  );
}
