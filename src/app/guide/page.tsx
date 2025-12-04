'use client';

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle, QrCode, Coins, UserPlus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function GuidePage() {
  return (
     <div>
        <div className="space-y-1 mb-6">
            <Button asChild variant="outline" className="mb-4 bg-white text-black hover:bg-gray-100">
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4"/>
                    홈으로 돌아가기
                </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
                <HelpCircle className="mr-2 h-6 w-6" />
                종달샘 허브 사용 방법
            </h1>
            <p className="text-muted-foreground">
                종달샘 허브의 다양한 기능을 알아보고 포인트를 활용해보세요.
            </p>
        </div>
        <Card>
            <CardContent className="p-6">
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                <AccordionTrigger className="text-lg font-semibold">
                    <Coins className="mr-2 text-primary" />
                    포인트란 무엇인가요?
                </AccordionTrigger>
                <AccordionContent className="text-base pl-8 space-y-2">
                    <p>
                    <strong>포인트</strong>은 종달샘 허브에서 사용하는 공식 포인트 단위입니다.
                    학교 행사 참여, 코드 등록, 친구 초대 등 다양한 활동을 통해 포인트를 적립할 수 있습니다.
                    </p>
                </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                <AccordionTrigger className="text-lg font-semibold">
                    <QrCode className="mr-2 text-primary" />
                    코드는 어떻게 사용하고, 종류는 무엇이 있나요?
                </AccordionTrigger>
                <AccordionContent className="text-base pl-8 space-y-4">
                    <p>
                    '코드 사용' 메뉴에서 오프라인 행사나 이벤트를 통해 배부된 코드를 등록하여 포인트를 적립할 수 있습니다. 스캔 또는 직접 입력으로 사용할 수 있습니다.
                    </p>
                    <ul className="space-y-3">
                      <li className="pl-4 border-l-2 border-primary">
                        <h4 className="font-semibold text-md">일반 종달코드</h4>
                        <p className="text-sm text-muted-foreground">가장 기본적인 코드로, 주로 오프라인 행사에서 배부됩니다. 등록 시 지정된 포인트를 즉시 받습니다.</p>
                      </li>
                       <li className="pl-4 border-l-2 border-primary">
                        <h4 className="font-semibold text-md">친구 초대 (학번)</h4>
                        <p className="text-sm text-muted-foreground">친구의 5자리 학번을 코드처럼 입력하면, 나와 친구 모두 포인트를 받습니다!</p>
                      </li>
                    </ul>
                </AccordionContent>
                </AccordionItem>
            </Accordion>
            </CardContent>
        </Card>
    </div>
  );
}
