
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
import { HelpCircle, QrCode, Mail, ShoppingCart, Coins, Gift, UserPlus, UserCog, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function GuidePage() {
  return (
     <div>
        <div className="space-y-1 mb-6">
            <Button asChild variant="ghost" className="mb-4">
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
                    Lak이란 무엇인가요?
                </AccordionTrigger>
                <AccordionContent className="text-base pl-8 space-y-2">
                    <p>
                    <strong>Lak(라크)</strong>은 종달샘 허브에서 사용하는 공식 포인트 단위입니다.
                    학교 행사 참여, 코드 등록, 편지 쓰기, 친구 초대 등 다양한 활동을 통해 Lak을 적립할 수 있으며, 적립한 Lak은 '종달 상점'에서 원하는 상품으로 교환할 수 있습니다.
                    </p>
                    <p className="font-bold text-primary">
                    (1 Lak = 약 500원)의 가치를 가집니다.
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
                    '코드 사용' 메뉴에서 오프라인 행사나 이벤트를 통해 배부된 코드를 등록하여 Lak을 적립할 수 있습니다. 스캔 또는 직접 입력으로 사용할 수 있습니다.
                    </p>
                    <ul className="space-y-3">
                      <li className="pl-4 border-l-2 border-primary">
                        <h4 className="font-semibold text-md">일반 종달코드</h4>
                        <p className="text-sm text-muted-foreground">가장 기본적인 코드로, 주로 오프라인 행사에서 배부됩니다. 등록 시 지정된 Lak을 즉시 받습니다.</p>
                      </li>
                       <li className="pl-4 border-l-2 border-primary">
                        <h4 className="font-semibold text-md">메이트코드</h4>
                        <p className="text-sm text-muted-foreground">친구와 함께 보상을 받는 특별한 코드입니다. 친구의 메이트코드를 입력하면, <strong className="text-primary">코드를 사용한 나와 코드 주인인 친구 모두에게 1 Lak씩 지급됩니다.</strong> 나의 메이트코드는 대시보드에서 확인할 수 있습니다. 자기 자신의 코드는 사용할 수 없습니다.</p>
                      </li>
                       <li className="pl-4 border-l-2 border-primary">
                        <h4 className="font-semibold text-md">히든코드 (파트너 코드)</h4>
                        <p className="text-sm text-muted-foreground">학교 곳곳에 숨겨진 보물 같은 코드입니다! 이 코드를 찾아서 등록할 때 <strong className="text-primary">다른 친구의 학번을 함께 입력하면, 두 사람 모두에게 지정된 Lak이 지급됩니다.</strong></p>
                      </li>
                       <li className="pl-4 border-l-2 border-primary">
                        <h4 className="font-semibold text-md">온라인 특수코드</h4>
                        <p className="text-sm text-muted-foreground">선생님이나 관리자가 특정 학생에게 보상을 지급하기 위해 생성하는 일회용 코드입니다. 해당 학생에게 코드를 전달받아 사용하면 됩니다.</p>
                      </li>
                    </ul>
                     <p className="mt-3 text-xs text-destructive">
                        ※ 메이트코드를 제외한 모든 코드는 한 번만 사용할 수 있습니다.
                    </p>
                </AccordionContent>
                </AccordionItem>

                 <AccordionItem value="item-5">
                  <AccordionTrigger className="text-lg font-semibold">
                      <UserPlus className="mr-2 text-primary" />
                      '내 친구'는 어떤 기능인가요?
                  </AccordionTrigger>
                  <AccordionContent className="text-base pl-8 space-y-2">
                      <p>
                      '내 친구' 메뉴에서는 나와 메이트코드를 주고받은 친구들의 목록을 볼 수 있습니다.
                      </p>
                      <ul className="list-disc pl-6 mt-2 space-y-2">
                        <li>
                          나의 메이트코드를 사용한 친구, 또는 내가 코드를 사용해준 친구가 목록에 자동으로 추가됩니다.
                        </li>
                        <li>
                          친구 목록에서 '편지 쓰기' 버튼을 누르면 해당 친구의 학번이 자동으로 입력되어 편리하게 편지를 보낼 수 있습니다.
                        </li>
                      </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                <AccordionTrigger className="text-lg font-semibold">
                    <Mail className="mr-2 text-primary" />
                    편지 쓰기는 어떤 기능인가요?
                </AccordionTrigger>
                <AccordionContent className="text-base pl-8 space-y-2">
                    <p>
                    '종달 우체국' 기능을 통해 다른 학생에게 따뜻한 마음을 담은 편지를 보낼 수 있습니다. ('편지 쓰기' 메뉴)
                    </p>
                    <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>
                        받는 사람의 5자리 학번과 내용을 입력하여 편지를 보낼 수 있습니다. 자기 자신에게는 보낼 수 없습니다.
                    </li>
                    <li>
                        보낸 편지는 관리자의 승인 후 상대방의 '받은 편지함'으로 전달됩니다.
                    </li>
                    <li>
                        편지가 성공적으로 승인되면, <strong className="text-primary">편지를 보낸 사람과 받은 사람 모두에게 각각 2 Lak이 지급됩니다.</strong>
                    </li>
                     <li>
                        '오프라인으로 전달하기'를 체크하면, 학생회에서 내용을 확인 후 직접 편지를 전달해드립니다. 이 경우 Lak 지급도 오프라인으로 이루어집니다.
                    </li>
                    </ul>
                </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4">
                <AccordionTrigger className="text-lg font-semibold">
                    <ShoppingCart className="mr-2 text-primary" />
                    종달 상점은 어떻게 이용하나요?
                </AccordionTrigger>
                <AccordionContent className="text-base pl-8 space-y-2">
                    <p>
                    '쇼핑' 메뉴에서 내가 보유한 Lak으로 다양한 간식과 상품을 구매할 수 있습니다.
                    </p>
                    <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>
                        원하는 상품의 '+' 버튼을 눌러 수량을 조절하여 장바구니에 담습니다.
                    </li>
                    <li>
                        구매할 상품을 모두 담았다면, 화면 하단에 나타나는 '구매하기' 버튼을 누릅니다.
                    </li>
                    <li>
                        구매 내역을 최종 확인하면 Lak이 차감되고 주문이 완료됩니다.
                    </li>
                     <li>
                        주문이 완료되면 학생회에 가서 상품을 직접 수령하면 됩니다.
                    </li>
                    <li className="text-sm text-destructive">
                        ※ Lak 잔액이 부족하면 구매할 수 없으며, 구매 후에는 취소가 불가능하니 신중하게 선택해주세요.
                    </li>
                    </ul>
                </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-6">
                  <AccordionTrigger className="text-lg font-semibold">
                      <UserCog className="mr-2 text-primary" />
                      프로필은 어떻게 설정하나요?
                  </AccordionTrigger>
                  <AccordionContent className="text-base pl-8 space-y-2">
                      <p>
                      '프로필 설정' 메뉴에서 나만의 프로필을 꾸밀 수 있습니다.
                      </p>
                       <ul className="list-disc pl-6 mt-2 space-y-2">
                        <li>
                          **프로필 스타일:** 제공되는 여러 그라데이션 색상 중 하나를 선택하여 프로필 아이콘의 배경을 바꿀 수 있습니다.
                        </li>
                        <li>
                          **닉네임:** 원하는 닉네임을 설정할 수 있습니다. 설정한 닉네임은 친구 목록 등에서 표시됩니다.
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
