
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle, QrCode, Mail, ShoppingCart, Coins } from 'lucide-react';

export default function GuidePage() {
  return (
     <div className="container mx-auto max-w-4xl p-0 sm:p-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <HelpCircle className="mr-2 h-6 w-6" />
            종달샘 허브 사용 방법
          </CardTitle>
          <CardDescription>
            종달샘 허브의 다양한 기능을 알아보고 포인트를 활용해보세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-lg font-semibold">
                <Coins className="mr-2 text-primary" />
                Lak이란 무엇인가요?
              </AccordionTrigger>
              <AccordionContent className="text-base pl-8">
                <p>
                  <strong>Lak(라크)</strong>은 종달샘 허브에서 사용하는 공식 포인트 단위입니다.
                  학교 행사 참여, 코드 등록, 편지 보내기 등 다양한 활동을 통해 Lak을 적립할 수 있으며, 적립한 Lak은 '종달 상점'에서 원하는 상품으로 교환할 수 있습니다.
                  <br />
                  <strong className="text-primary">(1 Lak = 500원)</strong>의 가치를 가집니다.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg font-semibold">
                <QrCode className="mr-2 text-primary" />
                코드는 어떻게 사용하나요?
              </AccordionTrigger>
              <AccordionContent className="text-base pl-8">
                <p>
                  오프라인 행사나 이벤트를 통해 배부된 코드를 등록하여 Lak을 적립할 수 있습니다.
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-2">
                  <li>
                    <strong>QR/바코드 스캔:</strong> '코드 사용' 메뉴에서 'QR/바코드 스캔하기' 버튼을 눌러 카메라로 코드를 스캔하면 자동으로 Lak이 적립됩니다. 가장 빠르고 편리한 방법입니다.
                  </li>
                  <li>
                    <strong>직접 입력:</strong> 코드 번호를 직접 입력하고 '사용하기' 버튼을 눌러도 Lak을 적립할 수 있습니다.
                  </li>
                </ul>
                <p className="mt-3 text-sm text-destructive">
                  ※ 모든 코드는 한 번만 사용할 수 있습니다.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg font-semibold">
                <Mail className="mr-2 text-primary" />
                편지 쓰기는 어떤 기능인가요?
              </AccordionTrigger>
              <AccordionContent className="text-base pl-8">
                <p>
                  '종달 우체국' 기능을 통해 다른 학생에게 따뜻한 마음을 담은 편지를 보낼 수 있습니다.
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-2">
                  <li>
                    보낸 편지는 관리자의 승인 후 상대방의 '받은 편지함'으로 전달됩니다.
                  </li>
                  <li>
                    편지가 성공적으로 승인되면, <strong className="text-primary">편지를 보낸 사람과 받은 사람 모두에게 각각 2 Lak이 지급됩니다.</strong>
                  </li>
                  <li>
                    자기 자신에게는 편지를 보낼 수 없습니다.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-lg font-semibold">
                <ShoppingCart className="mr-2 text-primary" />
                종달 상점은 어떻게 이용하나요?
              </AccordionTrigger>
              <AccordionContent className="text-base pl-8">
                <p>
                  '쇼핑' 메뉴에서 내가 보유한 Lak으로 다양한 간식과 상품을 구매할 수 있습니다.
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-2">
                  <li>
                    원하는 상품의 수량을 조절하여 장바구니에 담습니다.
                  </li>
                  <li>
                    화면 하단의 '구매하기' 버튼을 누르고, 구매 내역을 최종 확인하면 Lak이 차감되고 주문이 완료됩니다.
                  </li>
                  <li>
                    주문이 완료되면 관리자에게 알림이 가고, 상품을 수령할 수 있습니다.
                  </li>
                  <li className="text-sm text-destructive">
                    ※ Lak 잔액이 부족하면 구매할 수 없으며, 구매 후에는 취소가 불가능하니 신중하게 선택해주세요.
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
