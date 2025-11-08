
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Croissant, Loader2, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, awardSnakeScore } from '@/lib/firebase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const GRID_SIZE = 20;
const CANVAS_SIZE = 600;
const BLOCK_SIZE = CANVAS_SIZE / GRID_SIZE;

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const SnakePage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<{ x: number; y: number }[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<{ x: number; y: number }>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'over'>('start');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const router = useRouter();

  const generateFood = (currentSnake: { x: number; y: number }[]) => {
    let newFood;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    setFood(newFood);
  };

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDirection('RIGHT');
    setScore(0);
    setGameState('playing');
    generateFood([{ x: 10, y: 10 }]);
  };

  const handleGameOver = useCallback(async (finalScore: number) => {
    setGameState('over');
    if (user && finalScore > 0) {
      setIsSubmitting(true);
      try {
        const result = await awardSnakeScore(user.uid, finalScore);
        if (result.success) {
          toast({ title: '점수 기록!', description: result.message });
           if (result.pointsToPiggy > 0) {
              router.push(`/dashboard/piggy-bank?amount=${result.pointsToPiggy}`);
            }
        }
      } catch (e: any) {
        toast({ title: '기록 실패', description: e.message, variant: 'destructive' });
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [user, toast, router]);

  const gameLoop = useCallback(() => {
    if (gameState !== 'playing') return;

    setSnake(prevSnake => {
      const newSnake = [...prevSnake];
      const head = { ...newSnake[0] };

      switch (direction) {
        case 'UP': head.y -= 1; break;
        case 'DOWN': head.y += 1; break;
        case 'LEFT': head.x -= 1; break;
        case 'RIGHT': head.x += 1; break;
      }

      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        handleGameOver(score);
        return prevSnake;
      }

      for (let i = 1; i < newSnake.length; i++) {
        if (head.x === newSnake[i].x && head.y === newSnake[i].y) {
          handleGameOver(score);
          return prevSnake;
        }
      }

      newSnake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        setScore(s => s + 1);
        generateFood(newSnake);
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food.x, food.y, gameState, score, handleGameOver]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      switch (e.key) {
        case 'ArrowUp': if (direction !== 'DOWN') setDirection('UP'); break;
        case 'ArrowDown': if (direction !== 'UP') setDirection('DOWN'); break;
        case 'ArrowLeft': if (direction !== 'RIGHT') setDirection('LEFT'); break;
        case 'ArrowRight': if (direction !== 'LEFT') setDirection('RIGHT'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction]);

  useEffect(() => {
    if (gameState === 'playing') {
      const interval = setInterval(gameLoop, 150);
      return () => clearInterval(interval);
    }
  }, [gameLoop, gameState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    ctx.fillStyle = 'hsl(var(--card))';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.fillStyle = 'hsl(var(--primary))';
    ctx.beginPath();
    ctx.roundRect(food.x * BLOCK_SIZE, food.y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE, [8]);
    ctx.fill();
    
    snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--primary))';
      ctx.strokeStyle = 'hsl(var(--background))';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.roundRect(segment.x * BLOCK_SIZE, segment.y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE, [8]);
      ctx.fill();
      ctx.stroke();
    });

  }, [snake, food]);

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
          <Croissant className="mr-2 h-6 w-6" /> 스네이크
        </h1>
        <Card className="w-full max-w-xl shadow-lg">
          <CardContent className="p-2">
            <div className="relative rounded-lg overflow-hidden aspect-square">
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="bg-muted w-full h-full"
              />
              <div className="absolute top-4 left-4 bg-black/50 text-white font-bold text-xl px-4 py-2 rounded-lg">
                SCORE: {score}
              </div>
              {gameState !== 'playing' && (
                <motion.div 
                  className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.h2 
                    className="text-5xl font-bold font-headline mb-4"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                  >
                    스네이크
                  </motion.h2>
                  {gameState === 'over' && <p className="mb-2 text-lg">GAME OVER</p>}
                  <Button size="lg" onClick={resetGame}>
                    <Play className="mr-2"/>
                    {gameState === 'start' ? '게임 시작' : '다시 시작'}
                  </Button>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>
         <p className="text-sm text-muted-foreground">키보드 방향키로 뱀을 조종하세요.</p>
      </div>

       <AlertDialog open={gameState === 'over' && !isSubmitting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>게임 오버!</AlertDialogTitle>
            <AlertDialogDescription>
              최종 점수: <strong>{score}점</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={resetGame}>다시하기</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
       <AlertDialog open={isSubmitting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Loader2 className="animate-spin"/>점수 기록 중...</AlertDialogTitle>
            <AlertDialogDescription>
              잠시만 기다려주세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SnakePage;
