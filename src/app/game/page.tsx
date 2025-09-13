
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Swords, MessageCircle, ArrowRight, Gamepad2, Bomb } from 'lucide-react';
import Link from 'next/link';

const games = [
  {
    title: "실시간 끝말잇기",
    description: "모두와 함께 끝말잇기를 이어가고 순위에 도전하세요!",
    href: "/game/word-chain",
    icon: MessageCircle,
    status: "active"
  },
  {
    title: "지뢰찾기",
    description: "지뢰를 피해 모든 칸을 여는 클래식 게임입니다.",
    href: "/game/minesweeper",
    icon: Bomb,
    status: "active"
  },
   {
    title: "벽돌깨기",
    description: "공을 튕겨 모든 벽돌을 부수는 클래식 게임입니다.",
    href: "/game/breakout",
    icon: Gamepad2,
    status: "active"
  },
   {
    title: "테트리스",
    description: "내려오는 블록을 쌓아 줄을 완성하여 없애는 게임입니다.",
    href: "/game/tetris",
    icon: Gamepad2,
    status: "active"
  },
]

export default function GamePage() {
  return (
    <div>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
            <Swords className="mr-2 h-6 w-6" />
            미니게임
        </h1>
        <p className="text-muted-foreground">
          다양한 게임을 즐기고 리더보드 순위에 도전해보세요! 이틀마다 순위표 상위 10명에게 보상이 지급됩니다.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <Card key={game.title} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-3">
                <game.icon className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>{game.title}</CardTitle>
                  <CardDescription>{game.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-grow" />
            <div className="p-6 pt-0">
               <Button asChild disabled={game.status === 'disabled'} className="w-full">
                  <Link href={game.href}>
                    {game.status === 'disabled' ? '준비중' : '플레이하기'} 
                    {game.status === 'active' && <ArrowRight className="ml-2 h-4 w-4"/>}
                  </Link>
                </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
