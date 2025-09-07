
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
import { HelpCircle, Award, Gift, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function TeacherGuidePage() {
  return (
     <div>
        <div className="space-y-1 mb-6">
            <Button asChild variant="outline" className="mb-4 bg-white text-black hover:bg-gray-100">
                <Link href="/teacher/rewards">
                    <ArrowLeft className="mr-2 h-4 w-4"/>
                    대시보드로 돌아가기
                </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
                <HelpCircle className="mr-2 h-6 w-6" />
                교직원용 사용 가이드
            </h1>
            <p className="text-muted-foreground">
                학생들에게 포인트를 지급하는 방법을 안내합니다.
            </p>
        </div>
        <Card>
            <CardContent className="p-6">
            <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                <AccordionItem value="item-1">
                <AccordionTrigger className="text-lg font-semibold">
                    <Award className="mr-2 text-primary" />
                    학생에게 포인트 보상하기
                </AccordionTrigger>
                <AccordionContent className="text-base pl-8 space-y-4">
                    <p>
                    '학생 보상' 페이지에서는 특정 활동에 대한 보상으로 학생에게 포인트를 지급할 수 있는 <strong>일회용 코드</strong>를 생성할 수 있습니다.
                    </p>
                    <ul className="space-y-3 list-decimal pl-6">
                      <li>
                        <h4 className="font-semibold text-md">정보 입력</h4>
                        <p className="text-sm text-muted-foreground">
                            보상을 받을 학생의 <strong>5자리 학번</strong>, 지급할 <strong>포인트의 양</strong>, 그리고 <strong>지급 사유</strong>(예: 수업 태도 우수, 봉사 활동 참여)를 정확히 입력합니다.
                        </p>
                      </li>
                       <li>
                        <h4 className="font-semibold text-md">코드 생성</h4>
                        <p className="text-sm text-muted-foreground">
                            '보상 코드 생성' 버튼을 누르면, 해당 학생만을 위한 고유한 일회용 코드가 생성됩니다.
                        </p>
                      </li>
                       <li>
                        <h4 className="font-semibold text-md">코드 전달</h4>
                        <p className="text-sm text-muted-foreground">
                           생성된 코드를 학생에게 직접 전달해주세요. 학생은 '코드 사용' 메뉴에서 이 코드를 입력하여 포인트를 적립할 수 있습니다.
                        </p>
                      </li>
                    </ul>
                     <p className="mt-3 text-xs text-destructive">
                        ※ 생성된 코드는 다른 학생이 사용할 수 없으며, 한 번 사용되면 무효화됩니다.
                    </p>
                </AccordionContent>
                </AccordionItem>
            </Accordion>
            </CardContent>
        </Card>
    </div>
  );
}
