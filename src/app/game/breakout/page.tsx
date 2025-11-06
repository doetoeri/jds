
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Gamepad2, Loader2, Award, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, awardBreakoutScore } from '@/lib/firebase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

const BRICK_COLUMNS = 10;
const BRICK_ROW_COUNT = 5;

export default function BreakoutPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const [gameState, setGameState] = useState<'start' | 'playing' | 'over'>('start');
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [primaryColor, setPrimaryColor] = useState('18, 100%, 50%');

  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const style = getComputedStyle(document.documentElement);
      setPrimaryColor(style.getPropertyValue('--primary').trim().replace(/ /g, ', '));

      const handleResize = () => {
        if (containerRef.current) {
          const { clientWidth } = containerRef.current;
          const width = Math.min(clientWidth, 1000); 
          setCanvasSize({ width, height: width * 0.75 });
        }
      };
      
      window.addEventListener('resize', handleResize);
      handleResize(); // Initial size set

      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    setGameState('playing');
    setScore(0);
    
    let ball = {
      x: canvas.width / 2,
      y: canvas.height - 30,
      dx: (canvas.width / 150),
      dy: -(canvas.height / 120),
      radius: canvas.width / 100,
    };

    let paddle = {
      height: canvas.height / 60,
      width: canvas.width / 8,
      x: (canvas.width - (canvas.width / 8)) / 2
    };

    const paddleSpeed = canvas.width / 100;

    let bricks: { x: number; y: number; width: number; height: number; status: number, color: string }[] = [];
    const BRICK_HEIGHT = canvas.height / 25;
    const BRICK_PADDING = canvas.width / 100;
    const BRICK_WIDTH = (canvas.width - BRICK_PADDING * (BRICK_COLUMNS + 1)) / BRICK_COLUMNS;
    
    for (let c = 0; c < BRICK_COLUMNS; c++) {
      for (let r = 0; r < BRICK_ROW_COUNT; r++) {
        const brickX = BRICK_PADDING + c * (BRICK_WIDTH + BRICK_PADDING);
        const brickY = BRICK_PADDING + r * (BRICK_HEIGHT + BRICK_PADDING);
        const hue = (c / BRICK_COLUMNS) * 360;
        const color = `hsl(${hue}, 70%, 60%)`;
        bricks.push({ x: brickX, y: brickY, width: BRICK_WIDTH, height: BRICK_HEIGHT, status: 1, color });
      }
    }

    const endGame = async (finalScore: number) => {
      if (gameState === 'over') return;
      setGameState('over');
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);

      if (user && finalScore > 0) {
        setIsSubmitting(true);
        try {
          const result = await awardBreakoutScore(user.uid, finalScore);
          if (result.success) {
            toast({ title: '점수 기록!', description: result.message });
            if (result.pointsToPiggy > 0) {
              router.push(`/dashboard/piggy-bank?amount=${result.pointsToPiggy}`);
            }
          }
        } catch(e) {
             toast({ title: '오류', description: '점수 기록에 실패했습니다.', variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
      }
    };

    const draw = () => {
      if (!canvasRef.current) return;
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Draw bricks
      bricks.forEach(brick => {
        if (brick.status === 1) {
          context.fillStyle = brick.color;
          context.fillRect(brick.x, brick.y, brick.width, brick.height);
        }
      });

      // Draw ball
      context.beginPath();
      context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      context.fillStyle = `hsl(${primaryColor})`;
      context.fill();
      context.closePath();

      // Draw paddle
      context.fillStyle = `hsl(${primaryColor})`;
      context.fillRect(paddle.x, canvas.height - paddle.height, paddle.width, paddle.height);
      
      // Collision detection - Bricks
      bricks.forEach(brick => {
        if (brick.status === 1) {
          if (
            ball.x > brick.x &&
            ball.x < brick.x + brick.width &&
            ball.y > brick.y &&
            ball.y < brick.y + brick.height
          ) {
            ball.dy = -ball.dy;
            brick.status = 0;
            setScore(prev => prev + 1);
          }
        }
      });

      // Collision detection - Walls
      if (ball.x + ball.dx > canvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
        ball.dx = -ball.dx;
      }
      if (ball.y + ball.dy < ball.radius) {
        ball.dy = -ball.dy;
      } else if (ball.y + ball.dy > canvas.height - ball.radius) {
        if (ball.x > paddle.x && ball.x < paddle.x + paddle.width) {
          ball.dy = -ball.dy;
        } else {
          endGame(score);
          return;
        }
      }
      
      const allBricksCleared = bricks.every(b => b.status === 0);
      if(allBricksCleared) {
          endGame(score);
          return;
      }

      // Movement
      if (keysPressed.current.ArrowRight) {
        paddle.x = Math.min(paddle.x + paddleSpeed, canvas.width - paddle.width);
      } else if (keysPressed.current.ArrowLeft) {
        paddle.x = Math.max(paddle.x - paddleSpeed, 0);
      }

      ball.x += ball.dx;
      ball.y += ball.dy;

      gameLoopRef.current = requestAnimationFrame(draw);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      if (relativeX > 0 && relativeX < canvas.width) {
        paddle.x = Math.max(0, Math.min(relativeX - paddle.width / 2, canvas.width - paddle.width));
      }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.key] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key] = false; };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    draw();

    return () => {
      if(gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [user, toast, primaryColor, router, canvasSize, score, gameState]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (gameState === 'playing') {
      cleanup = startGame();
    }
    return () => {
      if (cleanup) cleanup();
    };
  }, [gameState, startGame]);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
        <Gamepad2 className="mr-2 h-6 w-6" />
        벽돌깨기
      </h1>
      <div ref={containerRef} className="w-full">
        <Card className="w-full aspect-[4/3] max-w-[1000px] mx-auto">
          <CardContent className="p-0 h-full">
            <div className="relative rounded-lg overflow-hidden h-full">
              <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} className="bg-background w-full h-full" />
              <div className="absolute top-4 left-4 bg-black/50 text-white font-bold text-xl px-4 py-2 rounded-lg">
                SCORE: {score}
              </div>
              {gameState !== 'playing' && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                  {gameState === 'start' && (
                    <>
                      <h2 className="text-4xl font-bold font-headline mb-4">벽돌깨기</h2>
                      <Button size="lg" onClick={() => setGameState('playing')}>
                        게임 시작
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <p className="text-sm text-muted-foreground">마우스 또는 키보드 방향키로 패들을 조종하세요.</p>
      
       <AlertDialog open={gameState === 'over' && !isSubmitting}>
          <AlertDialogContent>
             <AlertDialogHeader>
               <AlertDialogTitle>게임 종료!</AlertDialogTitle>
                <AlertDialogDescription>
                    최종 점수: <strong>{score}점</strong>
                </AlertDialogDescription>
             </AlertDialogHeader>
             <AlertDialogFooter>
                <AlertDialogAction onClick={() => setGameState('start')}>다시하기</AlertDialogAction>
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
    </div>
  );
}

    