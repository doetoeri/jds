
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, TrendingUp, Zap, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, awardUpgradeWin } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

const levels = [
  { level: 1, chance: 90, cost: 0, reward: 1 },
  { level: 2, chance: 80, cost: 1, reward: 2 },
  { level: 3, chance: 70, cost: 2, reward: 3 },
  { level: 4, chance: 60, cost: 3, reward: 4 },
  { level: 5, chance: 50, cost: 4, reward: 5 },
  { level: 6, chance: 40, cost: 5, reward: 6 },
  { level: 7, chance: 30, cost: 6, reward: 8 },
  { level: 8, chance: 20, cost: 8, reward: 10 },
  { level: 9, chance: 10, cost: 10, reward: 15 },
  { level: 10, chance: 5, cost: 15, reward: 20 },
];

export default function UpgradeGamePage() {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeResult, setUpgradeResult] = useState<'success' | 'failure' | null>(null);
  
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const router = useRouter();

  const handleUpgrade = async () => {
    if (!user) {
      toast({ title: "로그인 필요", description: "게임을 플레이하려면 로그인이 필요합니다.", variant: "destructive" });
      return;
    }
    const currentUpgradeInfo = levels[currentLevel];
    if (!currentUpgradeInfo) return; // Max level

    setIsUpgrading(true);
    setUpgradeResult(null);

    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate upgrade time

    const isSuccess = Math.random() * 100 < currentUpgradeInfo.chance;

    if (isSuccess) {
      setUpgradeResult('success');
      const nextLevel = currentLevel + 1;
      setCurrentLevel(nextLevel);
      try {
        const result = await awardUpgradeWin(user.uid, nextLevel);
        if (result.success) {
            toast({
                title: `강화 성공! (+${result.pointsToPiggy > 0 ? `${currentUpgradeInfo.reward}P 저금통` : `${currentUpgradeInfo.reward}P`})`,
                description: `${nextLevel}단계 종달새가 되었습니다!`,
            });
        }
      } catch (e: any) {
        toast({ title: '오류', description: e.message, variant: 'destructive'});
      }
    } else {
      setUpgradeResult('failure');
      setCurrentLevel(0);
      toast({ title: '강화 실패...', description: '종달새가 0단계로 초기화되었습니다.', variant: 'destructive'});
    }
    
    setIsUpgrading(false);
  };
  
  const canUpgrade = currentLevel < levels.length;
  const upgradeInfo = canUpgrade ? levels[currentLevel] : null;

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
        <TrendingUp className="mr-2 h-7 w-7" />
        종달새 강화하기
      </h1>
      <p className="text-muted-foreground max-w-prose">
        운에 모든 것을 맡겨보세요! 강화에 성공하여 종달새의 등급을 올리고, 더 많은 포인트를 획득하세요. 실패 시 0단계로 돌아갑니다.
      </p>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>현재 등급</CardTitle>
          <CardDescription>
            <span className="text-4xl font-bold text-primary">{currentLevel}</span> 단계
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentLevel}
                    initial={{ y: 20, opacity: 0, scale: 0.5 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -20, opacity: 0, scale: 0.5 }}
                >
                    <span className="text-8xl">
                      {currentLevel === 0 ? '🥚' : currentLevel < 3 ? '🐣' : currentLevel < 7 ? '🐤' : currentLevel < 10 ? '🕊️' : '🦅'}
                    </span>
                </motion.div>
            </AnimatePresence>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          {upgradeInfo && (
            <div className="text-sm w-full">
              <div className="flex justify-between">
                <span>성공 확률: <strong className="text-primary">{upgradeInfo.chance}%</strong></span>
                <span>성공 보상: <strong className="text-primary">{upgradeInfo.reward}P</strong></span>
              </div>
            </div>
          )}
          {canUpgrade ? (
            <Button className="w-full font-bold" onClick={handleUpgrade} disabled={isUpgrading}>
              {isUpgrading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              {currentLevel + 1}단계 강화 시도
            </Button>
          ) : (
            <div className="text-center font-bold text-amber-500 flex flex-col items-center">
                <Sparkles className="h-8 w-8 mb-2"/>
                최고 레벨에 도달했습니다!
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
