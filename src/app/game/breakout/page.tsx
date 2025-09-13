
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Gamepad2, Loader2, Award } from 'lucide-react';
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

export default function BreakoutPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  
  const [gameState, setGameState] = useState<'start' | 'playing' | 'over'>('start');
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bricksBroken, setBricksBroken] = useState(0);

  const { toast } = useToast();
  const [user] = useAuthState(auth);

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    setGameState('playing');
    setScore(0);
    setBricksBroken(0);

    let ball = { x: canvas.width / 2, y: canvas.height - 30, dx: 3, dy: -3, radius: 8 };
    let paddle = { x: canvas.width / 2 - 50, width: 100, height: 10 };
    
    const brickRowCount = 5;
    const brickColumnCount = 8;
    const brickWidth = 70;
    const brickHeight = 20;
    const brickPadding = 10;
    const brickOffsetTop = 30;
    const brickOffsetLeft = (canvas.width - (brickColumnCount * (brickWidth + brickPadding) - brickPadding)) / 2;
    
    let bricks: { x: number, y: number, status: number }[][] = [];
    for (let c = 0; c < brickColumnCount; c++) {
      bricks[c] = [];
      for (let r = 0; r < brickRowCount; r++) {
        bricks[c][r] = { x: 0, y: 0, status: 1 };
      }
    }
    
    const drawBall = () => {
        context.beginPath();
        context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        context.fillStyle = 'hsl(var(--primary))';
        context.fill();
        context.closePath();
    };

    const drawPaddle = () => {
        context.beginPath();
        context.rect(paddle.x, canvas.height - paddle.height, paddle.width, paddle.height);
        context.fillStyle = 'hsl(var(--primary-foreground))';
        context.fill();
        context.closePath();
    };
    
    const drawBricks = () => {
        for (let c = 0; c < brickColumnCount; c++) {
            for (let r = 0; r < brickRowCount; r++) {
                if (bricks[c][r].status === 1) {
                    const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
                    const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
                    bricks[c][r].x = brickX;
                    bricks[c][r].y = brickY;
                    context.beginPath();
                    context.rect(brickX, brickY, brickWidth, brickHeight);
                    const hue = (r / brickRowCount) * 120 + 200;
                    context.fillStyle = `hsl(${hue}, 70%, 60%)`;
                    context.fill();
                    context.closePath();
                }
            }
        }
    };
    
    const collisionDetection = () => {
        let broken = 0;
        let allBricksBroken = true;
        for (let c = 0; c < brickColumnCount; c++) {
            for (let r = 0; r < brickRowCount; r++) {
                const b = bricks[c][r];
                if (b.status === 1) {
                    allBricksBroken = false;
                    if (ball.x > b.x && ball.x < b.x + brickWidth && ball.y > b.y && ball.y < b.y + brickHeight) {
                        ball.dy = -ball.dy;
                        b.status = 0;
                        setScore(s => s + 1);
                        broken++;
                    }
                }
            }
        }
        setBricksBroken(b => b + broken);
        if(allBricksBroken) {
            endGame(true);
        }
    };

    const endGame = async (won: boolean) => {
        if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        setGameState('over');

        if(won) {
            toast({ title: "승리!", description: "모든 벽돌을 부쉈습니다!" });
        } else {
             toast({ title: "게임 오버", description: "다시 시도해보세요." });
        }

        if (user && bricksBroken + (won ? brickColumnCount * brickRowCount : 0) > 0) {
            setIsSubmitting(true);
            const totalBroken = bricksBroken + (won ? brickColumnCount * brickRowCount - bricksBroken : 0);
            const result = await awardBreakoutScore(user.uid, totalBroken);
            if (result.success) {
                toast({ title: "점수 기록!", description: result.message });
            } else {
                toast({ title: "오류", description: result.message, variant: 'destructive' });
            }
            setIsSubmitting(false);
        }
    };

    const draw = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        drawBricks();
        drawBall();
        drawPaddle();
        collisionDetection();

        if (ball.x + ball.dx > canvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
            ball.dx = -ball.dx;
        }
        if (ball.y + ball.dy < ball.radius) {
            ball.dy = -ball.dy;
        } else if (ball.y + ball.dy > canvas.height - ball.radius) {
            if (ball.x > paddle.x && ball.x < paddle.x + paddle.width) {
                ball.dy = -ball.dy;
            } else {
                endGame(false);
                return;
            }
        }

        ball.x += ball.dx;
        ball.y += ball.dy;

        gameLoopRef.current = requestAnimationFrame(draw);
    };

    const handleMouseMove = (e: MouseEvent) => {
        const relativeX = e.clientX - canvas.offsetLeft;
        if (relativeX > 0 && relativeX < canvas.width) {
            paddle.x = relativeX - paddle.width / 2;
        }
    };

    document.addEventListener("mousemove", handleMouseMove);

    draw();

    return () => {
        if(gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        document.removeEventListener("mousemove", handleMouseMove);
    };

  }, [user, toast, bricksBroken]);
  
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
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
        <Gamepad2 className="mr-2 h-6 w-6" />
        벽돌깨기
      </h1>
      <div className="relative border-4 border-primary rounded-lg overflow-hidden">
        <canvas ref={canvasRef} width="800" height="500" className="bg-slate-800" />
        
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
      <p className="text-sm text-muted-foreground">마우스를 움직여 패들을 조종하세요.</p>
      
       <AlertDialog open={gameState === 'over' && !isSubmitting}>
          <AlertDialogContent>
             <AlertDialogHeader>
               <AlertDialogTitle>게임 종료!</AlertDialogTitle>
                <AlertDialogDescription>
                    최종 점수: <strong>{score}점</strong>
                    <br/>
                    획득 포인트: <strong>{Math.floor(bricksBroken / 5)} 포인트</strong> (포인트 한도에 따라 지급되지 않을 수 있음)
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
