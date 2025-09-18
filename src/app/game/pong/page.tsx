
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Gamepad2, Loader2, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, awardPongScore } from '@/lib/firebase';
import { Card, CardContent } from '@/components/ui/card';

const PADDLE_HEIGHT = 100;
const PADDLE_WIDTH = 10;
const BALL_RADIUS = 8;
const WINNING_SCORE = 5;

export default function PongPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  
  const [gameState, setGameState] = useState<'start' | 'playing' | 'over'>('start');
  const [scores, setScores] = useState({ player: 0, ai: 0 });
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const [user] = useAuthState(auth);

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    setGameState('playing');
    setScores({ player: 0, ai: 0 });
    setWinner(null);

    let ball = { 
        x: canvas.width / 2, 
        y: canvas.height / 2, 
        dx: 5, 
        dy: Math.random() > 0.5 ? 5 : -5,
    };
    let player = { y: canvas.height / 2 - PADDLE_HEIGHT / 2 };
    let ai = { y: canvas.height / 2 - PADDLE_HEIGHT / 2 };
    
    const resetBall = (direction: number) => {
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        ball.dx = 5 * direction;
        ball.dy = Math.random() > 0.5 ? 5 : -5;
    }
    
    const awardPoint = async () => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            await awardPongScore(user.uid);
        } catch (e: any) {
            toast({ title: "포인트 지급 실패", description: e.message, variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    }

    const draw = () => {
      context.fillStyle = 'hsl(var(--background))';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      context.fillStyle = 'hsl(var(--primary))';
      context.fillRect(0, player.y, PADDLE_WIDTH, PADDLE_HEIGHT); // Player paddle
      context.fillRect(canvas.width - PADDLE_WIDTH, ai.y, PADDLE_WIDTH, PADDLE_HEIGHT); // AI paddle

      context.beginPath();
      context.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      context.fill();
    };

    const update = () => {
      // Move AI paddle
      const aiCenter = ai.y + PADDLE_HEIGHT / 2;
      if (aiCenter < ball.y - 20) {
        ai.y += 4;
      } else if (aiCenter > ball.y + 20) {
        ai.y -= 4;
      }
      ai.y = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, ai.y));


      ball.x += ball.dx;
      ball.y += ball.dy;

      // Ball collision with top/bottom walls
      if (ball.y - BALL_RADIUS < 0 || ball.y + BALL_RADIUS > canvas.height) {
        ball.dy = -ball.dy;
      }

      // Ball collision with paddles
      if (ball.dx < 0) { // Moving left (towards player)
        if (ball.x - BALL_RADIUS < PADDLE_WIDTH && ball.y > player.y && ball.y < player.y + PADDLE_HEIGHT) {
            ball.dx = -ball.dx;
            ball.dx *= 1.05; // Increase speed
        }
      } else { // Moving right (towards AI)
         if (ball.x + BALL_RADIUS > canvas.width - PADDLE_WIDTH && ball.y > ai.y && ball.y < ai.y + PADDLE_HEIGHT) {
            ball.dx = -ball.dx;
            ball.dx *= 1.05; // Increase speed
        }
      }

      // Score points
      if (ball.x < 0) {
        setScores(s => ({ ...s, ai: s.ai + 1 }));
        resetBall(1);
      } else if (ball.x > canvas.width) {
        setScores(s => ({ ...s, player: s.player + 1 }));
        awardPoint();
        resetBall(-1);
      }

      draw();
      gameLoopRef.current = requestAnimationFrame(update);
    };

    const handleMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        player.y = e.clientY - rect.top - PADDLE_HEIGHT / 2;
        player.y = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, player.y));
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    update();

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [user, toast]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (gameState === 'playing') {
      cleanup = startGame();
    }
    return () => {
      if (cleanup) cleanup();
    };
  }, [gameState, startGame]);
  
  useEffect(() => {
      if(scores.player === WINNING_SCORE) {
          setWinner('player');
          setGameState('over');
      } else if (scores.ai === WINNING_SCORE) {
          setWinner('ai');
          setGameState('over');
      }
  }, [scores]);


  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
        <Gamepad2 className="mr-2 h-6 w-6" />
        퐁 (Pong)
      </h1>
      <Card>
        <CardContent className="p-2">
            <div className="relative border-4 border-primary rounded-lg overflow-hidden">
                <canvas ref={canvasRef} width={800} height={500} />
                <div className="absolute top-4 w-full flex justify-center items-center gap-8 text-white font-bold text-5xl font-mono">
                    <span className="bg-black/30 px-4 rounded-lg">{scores.player}</span>
                    <span className="bg-black/30 px-4 rounded-lg">{scores.ai}</span>
                </div>
                 {gameState !== 'playing' && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                         {gameState === 'start' && (
                            <>
                                <h2 className="text-4xl font-bold font-headline mb-4">퐁 (Pong)</h2>
                                <Button size="lg" onClick={() => setGameState('playing')}>
                                   게임 시작
                                </Button>
                            </>
                         )}
                         {gameState === 'over' && (
                             <>
                                <h2 className="text-4xl font-bold font-headline mb-4">
                                    {winner === 'player' ? '🎉 승리! 🎉' : 'GAME OVER'}
                                </h2>
                                <Button size="lg" onClick={() => setGameState('playing')}>
                                   다시하기
                                </Button>
                             </>
                         )}
                    </div>
                )}
            </div>
        </CardContent>
      </Card>
       <p className="text-sm text-muted-foreground">마우스로 패들을 위아래로 움직이세요. 먼저 5점을 내면 승리합니다.</p>
    </div>
  );
}
