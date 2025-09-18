
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Gamepad2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, awardPongScore } from '@/lib/firebase';
import { Card, CardContent } from '@/components/ui/card';

const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 100;
const BALL_RADIUS = 8;

export default function PongPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const [gameState, setGameState] = useState<'start' | 'playing' | 'over'>('start');
  const [scores, setScores] = useState({ player: 0, computer: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const [user] = useAuthState(auth);

  const [primaryColor, setPrimaryColor] = useState('hsl(18, 100%, 50%)');
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const style = getComputedStyle(document.documentElement);
      const colorValue = style.getPropertyValue('--primary').trim();
      const newPrimaryColor = `hsl(${colorValue.replace(/ /g, ', ')})`;
      setPrimaryColor(newPrimaryColor);
    }
  }, [gameState]);


  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    setGameState('playing');

    let ball = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      dx: 5,
      dy: 5,
      radius: BALL_RADIUS,
    };
    let player = {
      x: PADDLE_WIDTH,
      y: canvas.height / 2 - PADDLE_HEIGHT / 2,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      speed: 8,
    };
    let computer = {
      x: canvas.width - PADDLE_WIDTH * 2,
      y: canvas.height / 2 - PADDLE_HEIGHT / 2,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      speed: 4,
    };

    const handleKeyDown = (e: KeyboardEvent) => keysPressed.current[e.key] = true;
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current[e.key] = false;

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    const awardPoint = async (scorer: 'player' | 'computer') => {
        setScores(prev => ({
            ...prev,
            [scorer]: prev[scorer] + 1,
        }));
        if (scorer === 'player' && user) {
            setIsSubmitting(true);
            try {
                await awardPongScore(user.uid);
                toast({ description: "1 포인트를 획득했습니다!" });
            } catch (error: any) {
                toast({ variant: 'destructive', description: error.message });
            } finally {
                setIsSubmitting(false);
            }
        }
        
        // Reset ball
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        ball.dx = -ball.dx;
        ball.dy = (Math.random() > 0.5 ? 1 : -1) * 5;
    }


    const draw = () => {
      if (!canvasRef.current) return;
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Player movement
      if (keysPressed.current['w'] || keysPressed.current['ArrowUp']) {
        player.y = Math.max(0, player.y - player.speed);
      }
      if (keysPressed.current['s'] || keysPressed.current['ArrowDown']) {
        player.y = Math.min(canvas.height - player.height, player.y + player.speed);
      }
      
      // AI movement
      const computerCenter = computer.y + computer.height / 2;
      if (computerCenter < ball.y - 10) {
        computer.y = Math.min(canvas.height - computer.height, computer.y + computer.speed);
      } else if (computerCenter > ball.y + 10) {
        computer.y = Math.max(0, computer.y - computer.speed);
      }


      // Ball movement
      ball.x += ball.dx;
      ball.y += ball.dy;

      // Wall collision (top/bottom)
      if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
        ball.dy = -ball.dy;
      }
      
      // Paddle collision
      if ( (ball.dx < 0 && ball.x - ball.radius < player.x + player.width && ball.y > player.y && ball.y < player.y + player.height) ||
           (ball.dx > 0 && ball.x + ball.radius > computer.x && ball.y > computer.y && ball.y < computer.y + computer.height)
      ) {
          ball.dx = -ball.dx;
      }


      // Score
      if (ball.x - ball.radius < 0) {
        awardPoint('computer');
      } else if (ball.x + ball.radius > canvas.width) {
        awardPoint('player');
      }

      // Draw everything
      context.fillStyle = primaryColor;
      context.fillRect(player.x, player.y, player.width, player.height);
      context.fillRect(computer.x, computer.y, computer.width, computer.height);
      
      context.beginPath();
      context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      context.fill();
      
      context.setLineDash([10, 10]);
      context.beginPath();
      context.moveTo(canvas.width / 2, 0);
      context.lineTo(canvas.width / 2, canvas.height);
      context.strokeStyle = primaryColor;
      context.lineWidth = 2;
      context.stroke();
      context.setLineDash([]);


      gameLoopRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [user, toast, primaryColor]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (gameState === 'playing') {
      cleanup = startGame();
    }
    return () => {
      if (cleanup) cleanup();
    };
  }, [gameState, startGame]);
  
  const resetGame = () => {
      setScores({player: 0, computer: 0});
      setGameState('start');
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
        <Gamepad2 className="mr-2 h-6 w-6" />
        퐁 (Pong)
      </h1>
      <Card className="w-full max-w-4xl">
        <CardContent className="p-2">
            <div className="relative rounded-lg overflow-hidden">
                <canvas ref={canvasRef} width="800" height="500" className="w-full bg-background aspect-video" />
                
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center text-white font-bold text-4xl px-4 py-2">
                    <span className="text-primary">{scores.player}</span>
                     {isSubmitting && <Loader2 className="h-6 w-6 animate-spin text-primary"/>}
                    <span className="text-primary">{scores.computer}</span>
                </div>
                
                {gameState !== 'playing' && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                    {gameState === 'start' && (
                    <>
                        <h2 className="text-4xl font-bold font-headline mb-4">PONG</h2>
                        <Button size="lg" onClick={() => setGameState('playing')}>
                            게임 시작
                        </Button>
                    </>
                    )}
                    {gameState === 'over' && (
                         <>
                            <h2 className="text-4xl font-bold font-headline mb-4">GAME OVER</h2>
                            <Button size="lg" onClick={resetGame}>
                                다시하기
                            </Button>
                        </>
                    )}
                </div>
                )}
            </div>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">W, S 또는 위/아래 방향키로 패들을 조종하세요.</p>
    </div>
  );
}
