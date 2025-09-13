
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Swords, MessageCircle, Bird, Bomb, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const games = [
  {
    title: "실시간 끝말잇기",
    description: "모두와 함께 끝말잇기를 이어가고 포인트를 획득하세요!",
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
    title: "플래피 종달",
    description: "장애물을 피하며 종달새를 날려보내세요.",
    href: "/game/flappy-bird",
    icon: Bird,
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
          다양한 게임을 즐기고 포인트를 획득해보세요! (포인트는 25점까지만 적립 가능)
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
