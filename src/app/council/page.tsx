'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Users, Coins, ShoppingCart, ListOrdered } from 'lucide-react';


export default function CouncilDashboardPage() {
  const totalUsers = 152;
  const totalLakIssued = 5820;
  const pendingOrders = 12;
  const productsInStock = 25;

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight font-headline">학생회 대시보드</h1>
      <p className="text-muted-foreground mt-1">상점과 주문 내역을 관리하고 사용자 정보를 확인하세요.</p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 사용자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers.toLocaleString()} 명</div>
            <p className="text-xs text-muted-foreground">
              현재 시스템에 등록된 총 사용자 수
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 발행된 Lak</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLakIssued.toLocaleString()} Lak</div>
            <p className="text-xs text-muted-foreground">
              현재까지 발행된 모든 Lak
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">처리 대기중인 주문</CardTitle>
            <ListOrdered className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders.toLocaleString()} 건</div>
            <p className="text-xs text-muted-foreground">
              학생들이 주문하고 기다리는 내역
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">판매중인 상품</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productsInStock.toLocaleString()} 개</div>
            <p className="text-xs text-muted-foreground">
              현재 상점에서 판매중인 상품 종류
            </p>
          </CardContent>
        </Card>
      </div>

       <Card className="mt-8">
        <CardHeader>
            <CardTitle>빠른 시작 가이드</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
                <h3 className="font-semibold flex items-center gap-2"><ShoppingCart className="h-5 w-5"/> 상점 관리</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    '상점 관리' 탭에서 새로운 상품을 추가하거나 기존 상품의 재고, 가격 등을 수정할 수 있습니다.
                </p>
            </div>
             <div className="p-4 border rounded-lg">
                <h3 className="font-semibold flex items-center gap-2"><ListOrdered className="h-5 w-5"/> 주문 처리</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    '주문 내역' 탭에서 학생들이 구매한 내역을 확인하고, 상품 전달 후 '처리 완료' 버튼을 눌러주세요.
                </p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
