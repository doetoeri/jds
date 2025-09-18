
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Gamepad2, Loader2, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

const GRID_SIZE = 20;
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;
const BOARD_WIDTH = CANVAS_WIDTH / GRID_SIZE;
const BOARD_HEIGHT = CANVAS_HEIGHT / GRID_SIZE;

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export default function SnakePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'over'>('start');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [primaryColor, setPrimaryColor] = useState('hsl(18, 100%, 50%)');

  const { toast } = useToast();
  const [user] = useAuthState(auth);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const style = getComputedStyle(document.documentElement);
      const colorValue = style.getPropertyValue('--primary').trim();
      setPrimaryColor(`hsl(${colorValue.replace(/ /g, ', ')})`);
    }
  }, [gameState]);

  const generateFood = useCallback((currentSnake: {x:number, y:number}[]) => {
    while (true) {
      const newFood = {
        x: Math.floor(Math.random() * BOARD_WIDTH),
        y: Math.floor(Math.random() * BOARD_HEIGHT),
      };
      if (!currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
        return newFood;
      }
    }
  }, []);

  const resetGame = useCallback(() => {
    setSnake([{ x: 10, y: 10 }]);
    setFood(generateFood([{ x: 10, y: 10 }]));
    setDirection('RIGHT');
    setScore(0);
    setGameState('start');
  }, [generateFood]);

  const endGame = useCallback(async () => {
    setGameState('over');
    if (user && score > 0) {
        setIsSubmitting(true);
        try {
            const result = await awardSnakeScore(user.uid, score);
            if(result.success) {
                toast({ title: '점수 기록!', description: result.message });
            }
        } catch (e: any) {
            toast({ title: '기록 실패', description: e.message, variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    }
  }, [score, user, toast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': if (direction !== 'DOWN') setDirection('UP'); break;
        case 'ArrowDown': if (direction !== 'UP') setDirection('DOWN'); break;
        case 'ArrowLeft': if (direction !== 'RIGHT') setDirection('LEFT'); break;
        case 'ArrowRight': if (direction !== 'LEFT') setDirection('RIGHT'); break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [direction]);

  const gameTick = useCallback(() => {
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

      // Wall collision
      if (head.x < 0 || head.x >= BOARD_WIDTH || head.y < 0 || head.y >= BOARD_HEIGHT) {
        endGame();
        return prevSnake;
      }

      // Self collision
      for (let i = 1; i < newSnake.length; i++) {
        if (head.x === newSnake[i].x && head.y === newSnake[i].y) {
          endGame();
          return prevSnake;
        }
      }

      newSnake.unshift(head);

      // Food collision
      if (head.x === food.x && head.y === food.y) {
        setScore(s => s + 1);
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop();
      }
      
      return newSnake;
    });
  }, [direction, food.x, food.y, gameState, endGame, generateFood]);
  
  useEffect(() => {
      if (gameState === 'playing') {
          const interval = setInterval(gameTick, 100);
          return () => clearInterval(interval);
      }
  }, [gameState, gameTick]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw snake
    snake.forEach((segment, index) => {
      context.fillStyle = index === 0 ? primaryColor : `color-mix(in srgb, ${primaryColor} 70%, white)`;
      context.fillRect(segment.x * GRID_SIZE, segment.y * GRID_SIZE, GRID_SIZE - 1, GRID_SIZE - 1);
    });

    // Draw food
    context.fillStyle = 'red';
    context.fillRect(food.x * GRID_SIZE, food.y * GRID_SIZE, GRID_SIZE, GRID_SIZE);

  }, [snake, food, primaryColor, gameState]);

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
          <Gamepad2 className="mr-2 h-6 w-6" />
          스네이크
        </h1>
        <Card>
          <CardContent className="p-2">
            <div className="relative rounded-lg overflow-hidden">
              <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="bg-background max-w-full h-auto" />
              
              <div className="absolute top-4 left-4 bg-black/50 text-white font-bold text-xl px-4 py-2 rounded-lg">
                SCORE: {score}
              </div>

              {gameState !== 'playing' && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                    <h2 className="text-4xl font-bold font-headline mb-4">SNAKE</h2>
                    <Button size="lg" onClick={() => setGameState('playing')}>
                        게임 시작
                    </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <p className="text-sm text-muted-foreground">키보드 방향키로 뱀을 조종하세요.</p>
      </div>

      <AlertDialog open={gameState === 'over'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>게임 오버!</AlertDialogTitle>
            <AlertDialogDescription>
              최종 점수: <strong>{score}점</strong>
              {isSubmitting && <div className="flex items-center gap-2 mt-2"><Loader2 className="animate-spin h-4 w-4"/> 점수 기록 중...</div>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={resetGame} disabled={isSubmitting}>
                다시하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
