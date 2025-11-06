
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Gamepad2, Loader2, Play } from 'lucide-react';
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

const BRICK_ROW_COUNT = 7;
const BRICK_COLUMN_COUNT = 10;
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 12;
const BALL_RADIUS = 8;

export default function BreakoutPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'over'>('start');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const router = useRouter();

  const gameLoopRef = useRef<number>();
  const ballRef = useRef<{ x: number, y: number, dx: number, dy: number }>({ x: 0, y: 0, dx: 4, dy: -4 });
  const paddleRef = useRef<{ x: number }>({ x: 0 });
  const bricksRef = useRef<{ x: number, y: number, status: number }[][]>([]);
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  };

  const drawBall = useCallback((ctx: CanvasRenderingContext2D) => {
    const ball = ballRef.current;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = "#FF5500";
    ctx.fill();
    ctx.closePath();
  }, []);

  const drawPaddle = useCallback((ctx: CanvasRenderingContext2D) => {
    const paddle = paddleRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    ctx.fillStyle = "#FF5500";
    drawRoundedRect(ctx, paddle.x, canvas.height - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, 5);
  }, []);

  const drawBricks = useCallback((ctx: CanvasRenderingContext2D) => {
    const bricks = bricksRef.current;
    const brickWidth = (canvasRef.current?.width || 0) / BRICK_COLUMN_COUNT - 5;
    const brickHeight = 20;

    bricks.forEach(column => {
        column.forEach(brick => {
            if (brick.status === 1) {
                ctx.fillStyle = "#FF5500";
                drawRoundedRect(ctx, brick.x, brick.y, brickWidth, brickHeight, 5);
            }
        });
    });
  }, []);

  const resetGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setScore(0);
    setGameState('playing');

    ballRef.current = {
      x: canvas.width / 2,
      y: canvas.height - 30,
      dx: 4,
      dy: -4,
    };
    paddleRef.current = { x: (canvas.width - PADDLE_WIDTH) / 2 };

    const newBricks = [];
    const brickWidth = canvas.width / BRICK_COLUMN_COUNT - 5;
    const brickHeight = 20;
    const brickPadding = 5;
    const brickOffsetTop = 30;
    const brickOffsetLeft = (canvas.width - (BRICK_COLUMN_COUNT * (brickWidth + brickPadding))) / 2 + brickPadding/2;


    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
      newBricks[c] = [];
      for (let r = 0; r < BRICK_ROW_COUNT; r++) {
        const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
        const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
        newBricks[c][r] = { x: brickX, y: brickY, status: 1 };
      }
    }
    bricksRef.current = newBricks;
  }, []);

  const collisionDetection = useCallback(() => {
    const ball = ballRef.current;
    const bricks = bricksRef.current;
    const brickWidth = (canvasRef.current?.width || 0) / BRICK_COLUMN_COUNT - 5;
    const brickHeight = 20;

    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
      for (let r = 0; r < BRICK_ROW_COUNT; r++) {
        const b = bricks[c][r];
        if (b.status === 1) {
          if (
            ball.x > b.x &&
            ball.x < b.x + brickWidth &&
            ball.y > b.y &&
            ball.y < b.y + brickHeight
          ) {
            ball.dy = -ball.dy;
            b.status = 0;
            setScore((prevScore) => prevScore + 1);
          }
        }
      }
    }
  }, []);
  
  const gameOverHandler = useCallback(async (finalScore: number) => {
    setGameState('over');
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
      } catch (e) {
        toast({ title: '오류', description: '점수 기록에 실패했습니다.', variant: 'destructive' });
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [user, toast, router]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBricks(ctx);
    drawBall(ctx);
    drawPaddle(ctx);
  }, [drawBall, drawPaddle, drawBricks]);


  const gameLoop = useCallback(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    const ball = ballRef.current;
    const paddle = paddleRef.current;

    if (!canvas) return;

    if (keysPressed.current.ArrowRight) {
        paddle.x = Math.min(paddle.x + 7, canvas.width - PADDLE_WIDTH);
    } else if (keysPressed.current.ArrowLeft) {
        paddle.x = Math.max(paddle.x - 7, 0);
    }

    if (ball.x + ball.dx > canvas.width - BALL_RADIUS || ball.x + ball.dx < BALL_RADIUS) {
        ball.dx = -ball.dx;
    }
    if (ball.y + ball.dy < BALL_RADIUS) {
        ball.dy = -ball.dy;
    } else if (ball.y + ball.dy > canvas.height - BALL_RADIUS) {
        if (ball.x > paddle.x && ball.x < paddle.x + PADDLE_WIDTH) {
            ball.dy = -ball.dy;
        } else {
            gameOverHandler(score);
            return;
        }
    }

    ball.x += ball.dx;
    ball.y += ball.dy;

    collisionDetection();
    draw();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, score, draw, collisionDetection, gameOverHandler]);
  
  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, gameLoop]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.key] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key] = false; };
    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const relativeX = e.clientX - canvas.getBoundingClientRect().left;
        if (relativeX > 0 && relativeX < canvas.width) {
            paddleRef.current.x = Math.max(0, Math.min(relativeX - PADDLE_WIDTH / 2, canvas.width - PADDLE_WIDTH));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    canvasRef.current?.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvasRef.current?.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
        <Gamepad2 className="mr-2 h-6 w-6" />
        벽돌깨기
      </h1>
      <div className="w-full max-w-4xl mx-auto">
        <Card className="w-full">
          <CardContent className="p-0">
            <div className="relative rounded-lg overflow-hidden aspect-[4/3]">
              <canvas ref={canvasRef} width="800" height="600" className="bg-background w-full h-full" />
              <div className="absolute top-4 left-4 bg-black/50 text-white font-bold text-xl px-4 py-2 rounded-lg">
                SCORE: {score}
              </div>
              {gameState !== 'playing' && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                  {gameState === 'start' && (
                    <>
                      <h2 className="text-4xl font-bold font-headline mb-4">벽돌깨기</h2>
                      <Button size="lg" onClick={resetGame}>
                        <Play className="mr-2"/>
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
    </div>
  );
}
