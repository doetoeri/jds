

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, TrendingUp, Zap, Sparkles, HandCoins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, awardUpgradeWin, attemptUpgrade } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

const levels = [
  // level 0 (initial)
  { level: 0, chance: 90, reward: 0.4 }, 
  // level 1
  { level: 1, chance: 80, reward: 1.13 },
  // level 2
  { level: 2, chance: 70, reward: 2.08 },
  // level 3
  { level: 3, chance: 60, reward: 3.2 },
  // level 4
  { level: 4, chance: 50, reward: 4.47 },
  // level 5
  { level: 5, chance: 40, reward: 5.88 },
  // level 6
  { level: 6, chance: 30, reward: 7.4 },
  // level 7
  { level: 7, chance: 20, reward: 9.02 },
  // level 8
  { level: 8, chance: 10, reward: 10.73 },
  // level 9
  { level: 9, chance: 5, reward: 12.65 },
  // level 10 (max)
  { level: 10, chance: 0, reward: 15.0 }, 
];


export default function UpgradeGamePage() {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAction, setLastAction] = useState<'upgrade' | 'harvest' | null>(null);
  
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const router = useRouter();
  
  const resetGame = () => {
      setCurrentLevel(0);
  }

  const handleUpgrade = async () => {
    if (!user) {
      toast({ title: "로그인 필요", description: "게임을 플레이하려면 로그인이 필요합니다.", variant: "destructive" });
      return;
    }
    const currentUpgradeInfo = levels[currentLevel];
    if (!currentUpgradeInfo) return; // Max level

    setIsProcessing(true);
    setLastAction('upgrade');

    try {
        // The attemptUpgrade function will throw an error if points are insufficient, which will be caught.
        const result = await attemptUpgrade(user.uid, currentLevel);
        
        // Add a delay to create suspense
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (result.success) {
            setCurrentLevel(result.newLevel!);
            toast({
                title: `강화 성공!`,
                description: `${result.newLevel!}단계 종달새가 되었습니다!`,
            });
        } else {
            resetGame();
            toast({ title: '강화 실패...', description: '종달새가 0단계로 초기화되었습니다.', variant: 'destructive'});
        }

    } catch (error: any) {
        toast({ title: "강화 시도 실패", description: error.message, variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };
  
  const handleHarvest = async () => {
      if (!user || currentLevel === 0) return;
      setIsProcessing(true);
      setLastAction('harvest');

      try {
        const result = await awardUpgradeWin(user.uid, currentLevel);
        if (result.success) {
            toast({
                title: `수확 완료! (+${result.pointsToPiggy > 0 ? `${levels[currentLevel -1].reward.toFixed(2)}P 저금통` : `${levels[currentLevel - 1].reward.toFixed(2)}P`})`,
                description: `${currentLevel}단계 보상을 획득했습니다.`,
            });
            if (result.pointsToPiggy > 0) {
              router.push(`/dashboard/piggy-bank?amount=${result.pointsToPiggy}`);
            }
        }
      } catch (e: any) {
        toast({ title: '오류', description: e.message, variant: 'destructive'});
      } finally {
        resetGame();
        setIsProcessing(false);
      }
  };
  
  const canUpgrade = currentLevel < levels.length - 1; // Corrected to prevent upgrading at max level
  const upgradeInfo = canUpgrade ? levels[currentLevel] : null;
  const upgradeCost = upgradeInfo ? Math.floor(upgradeInfo.reward / 2) : 0;

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
        <TrendingUp className="mr-2 h-7 w-7" />
        종달새 강화하기
      </h1>
      <p className="text-muted-foreground max-w-prose">
        운에 모든 것을 맡겨보세요! 강화에 성공하여 종달새의 등급을 올리고, '수확'하여 더 많은 포인트를 획득하세요. 실패 시 0단계로 돌아갑니다.
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
            <div className="text-sm w-full space-y-1">
                <div className="flex justify-between">
                    <span>성공 확률: <strong className="text-primary">{upgradeInfo.chance}%</strong></span>
                    <span>성공 시 보상: <strong className="text-primary">{upgradeInfo.reward.toFixed(2)} P</strong></span>
                </div>
                 <div className="flex justify-between">
                    <span>강화 비용: <strong className="text-destructive">{upgradeCost} P</strong></span>
                </div>
            </div>
          )}
          {canUpgrade ? (
            <div className="w-full grid grid-cols-2 gap-2">
                <Button className="w-full font-bold" onClick={handleHarvest} disabled={isProcessing || currentLevel === 0} variant="secondary">
                  {isProcessing && lastAction === 'harvest' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <HandCoins className="mr-2 h-4 w-4" />
                  )}
                  수확하고 끝내기
                </Button>
                <Button className="w-full font-bold" onClick={handleUpgrade} disabled={isProcessing}>
                  {isProcessing && lastAction === 'upgrade' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  {currentLevel + 1}단계 강화 시도
                </Button>
            </div>
          ) : (
            <div className="text-center font-bold text-amber-500 flex flex-col items-center">
                <Sparkles className="h-8 w-8 mb-2"/>
                최고 레벨에 도달했습니다!
                <Button className="mt-4" onClick={handleHarvest}>수확하기</Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
