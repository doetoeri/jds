
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

export default function BreakoutPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  const keysPressed = useRef<{[key: string]: boolean}>({});
  
  const [gameState, setGameState] = useState<'start' | 'playing' | 'over'>('start');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [primaryColor, setPrimaryColor] = useState('18, 100%, 50%');
  const [primaryHue, setPrimaryHue] = useState('18');

  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const router = useRouter();
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const style = getComputedStyle(document.documentElement);
      const colorValue = style.getPropertyValue('--primary').trim().replace(/ /g, ', ');
      setPrimaryColor(colorValue);
      setPrimaryHue(style.getPropertyValue('--primary-h')?.trim() || '18');
    }
  }, [gameState]);


  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    setGameState('playing');
    let currentScore = 0;
    setScore(currentScore);
    let currentLives = 3;
    setLives(currentLives);

    const initialBallX = canvas.width / 2 + (Math.random() - 0.5) * 80;
    let ball = { x: initialBallX, y: canvas.height - 30, dx: 4, dy: -4, radius: 8 };
    let paddle = { x: canvas.width / 2 - 50, width: 100, height: 10, radius: 5 };
    const paddleSpeed = 7;
    
    const brickRowCount = 5;
    const brickColumnCount = 8;
    const brickWidth = 70;
    const brickHeight = 20;
    const brickPadding = 10;
    const brickOffsetTop = 30;
    const brickOffsetLeft = (canvas.width - (brickColumnCount * (brickWidth + brickPadding) - brickPadding)) / 2;
    const brickRadius = 4;
    
    let bricks: { x: number, y: number, status: number }[][] = [];
    for (let c = 0; c < brickColumnCount; c++) {
      bricks[c] = [];
      for (let r = 0; r < brickRowCount; r++) {
        const status = Math.random() > 0.2 ? 1 : 0; // 80% chance of a brick appearing
        bricks[c][r] = { x: 0, y: 0, status: status };
      }
    }

    const drawBall = () => {
        const gradient = context.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, ball.radius);
        gradient.addColorStop(0, `hsla(${primaryColor}, 0.8)`);
        gradient.addColorStop(1, `hsl(${primaryColor})`);

        context.beginPath();
        context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        context.fillStyle = gradient;
        context.fill();
        context.closePath();
    };
    
    function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
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
    }


    const drawPaddle = () => {
        context.fillStyle = `hsl(${primaryColor})`;
        roundRect(context, paddle.x, canvas.height - paddle.height, paddle.width, paddle.height, paddle.radius);
        context.fill();
    };
    
    const drawBricks = () => {
        for (let c = 0; c < brickColumnCount; c++) {
            for (let r = 0; r < brickRowCount; r++) {
                if (bricks[c][r].status === 1) {
                    const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
                    const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
                    bricks[c][r].x = brickX;
                    bricks[c][r].y = brickY;
                    
                    const saturation = 100 - (r * 10);
                    const lightness = 60 + (r * 5);
                    context.fillStyle = `hsl(${primaryHue}, ${saturation}%, ${lightness}%)`;
                    
                    roundRect(context, brickX, brickY, brickWidth, brickHeight, brickRadius);
                    context.fill();
                }
            }
        }
    };

    const resetAfterLifeLost = () => {
        const newBallX = canvas.width / 2 + (Math.random() - 0.5) * 80;
        ball = { x: newBallX, y: canvas.height - 30, dx: 4 * (Math.random() > 0.5 ? 1 : -1), dy: -4, radius: 8 };
        paddle = { x: canvas.width / 2 - 50, width: 100, height: 10, radius: 5 };
    };
    
    const collisionDetection = () => {
        let allBricksBroken = true;
        for (let c = 0; c < brickColumnCount; c++) {
            for (let r = 0; r < brickRowCount; r++) {
                const b = bricks[c][r];
                if (b.status === 1) {
                    allBricksBroken = false;
                    if (ball.x > b.x && ball.x < b.x + brickWidth && ball.y > b.y && ball.y < b.y + brickHeight) {
                        ball.dy = -ball.dy;
                        b.status = 0;
                        currentScore += 1;
                        setScore(currentScore);
                    }
                }
            }
        }
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

        if (user && currentScore > 0) {
            setIsSubmitting(true);
            const result = await awardBreakoutScore(user.uid, currentScore);
            if (result.success) {
                toast({ title: "점수 기록!", description: result.message });
                 if (result.pointsToPiggy > 0) {
                  router.push(`/dashboard/piggy-bank?amount=${result.pointsToPiggy}`);
                }
            } else {
                toast({ title: "오류", description: result.message, variant: 'destructive' });
            }
            setIsSubmitting(false);
        }
    };

    const draw = () => {
        if (!canvasRef.current) return;
        context.clearRect(0, 0, canvas.width, canvas.height);
        drawBricks();
        drawBall();
        drawPaddle();
        collisionDetection();

        if (keysPressed.current.ArrowRight) {
            paddle.x = Math.min(paddle.x + paddleSpeed, canvas.width - paddle.width);
        } else if (keysPressed.current.ArrowLeft) {
            paddle.x = Math.max(paddle.x - paddleSpeed, 0);
        }

        if (ball.x + ball.dx > canvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
            ball.dx = -ball.dx;
        }
        if (ball.y + ball.dy < ball.radius) {
            ball.dy = -ball.dy;
        } else if (ball.y + ball.dy > canvas.height - ball.radius) {
            if (ball.x > paddle.x && ball.x < paddle.x + paddle.width) {
                ball.dy = -ball.dy;
            } else {
                currentLives--;
                setLives(currentLives);
                if (currentLives <= 0) {
                    endGame(false);
                    return;
                } else {
                    resetAfterLifeLost();
                }
            }
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
            paddle.x = relativeX - paddle.width / 2;
        }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
        keysPressed.current[e.key] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        keysPressed.current[e.key] = false;
    };

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

  }, [user, toast, primaryColor, primaryHue, router]);
  
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
      <Card>
        <CardContent className="p-2">
            <div className="relative rounded-lg overflow-hidden">
                <canvas ref={canvasRef} width="800" height="500" className="bg-background" />
                
                <div className="absolute top-4 left-4 bg-black/50 text-white font-bold text-xl px-4 py-2 rounded-lg">
                SCORE: {score}
                </div>

                <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 text-white font-bold text-xl px-4 py-2 rounded-lg">
                    {Array.from({ length: lives }).map((_, i) => (
                        <Heart key={i} className="h-6 w-6 text-red-500 fill-current" />
                    ))}
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
