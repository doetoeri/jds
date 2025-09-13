
'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bird, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, awardFlappyBirdScore } from '@/lib/firebase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const birdWidth = 60;
const birdHeight = 45;
const gravity = 0.5;

export default function FlappyBirdPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  const birdRef = useRef<HTMLImageElement>(null);

  const [gameState, setGameState] = useState<'start' | 'playing' | 'over'>('start');
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [user] = useAuthState(auth);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    let birdY: number, birdVelocity: number;
    let pipes: { x: number; y: number }[];
    let frame: number;
    const pipeWidth = 80;
    const pipeGap = 200;
    const pipeInterval = 300;

    const resetGame = () => {
      birdY = canvas.height / 2;
      birdVelocity = 0;
      pipes = [];
      frame = 0;
      setScore(0);
    };

    const spawnPipe = () => {
      const topPipeHeight = Math.random() * (canvas.height - pipeGap - 100) + 50;
      pipes.push({ x: canvas.width, y: topPipeHeight });
    };

    const draw = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Draw pipes
      context.fillStyle = 'hsl(var(--primary))';
      pipes.forEach(pipe => {
        context.fillRect(pipe.x, 0, pipeWidth, pipe.y);
        context.fillRect(pipe.x, pipe.y + pipeGap, pipeWidth, canvas.height - pipe.y - pipeGap);
      });

      // Draw bird
      if (birdRef.current) {
        context.drawImage(birdRef.current, canvas.width / 4, birdY, birdWidth, birdHeight);
      }
    };

    const update = () => {
      birdVelocity += gravity;
      birdY += birdVelocity;

      // Pipe logic
      if (frame % pipeInterval === 0) {
        spawnPipe();
      }
      frame++;

      let newScore = 0;
      pipes = pipes.filter(pipe => {
        pipe.x -= 2;
        if (pipe.x + pipeWidth < 0) {
          return false;
        }
        if (!pipe.passed && pipe.x + pipeWidth < canvas.width / 4) {
          newScore++;
          pipe.passed = true;
        }
        return true;
      });

      if (newScore > 0) {
        setScore(s => s + newScore);
      }

      // Collision detection
      const birdLeft = canvas.width / 4;
      const birdRight = birdLeft + birdWidth;
      const birdTop = birdY;
      const birdBottom = birdY + birdHeight;

      if (birdBottom > canvas.height || birdTop < 0) {
        endGame();
      }

      for (const pipe of pipes) {
        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + pipeWidth;
        const pipeTopEnd = pipe.y;
        const pipeBottomStart = pipe.y + pipeGap;

        if (
          birdRight > pipeLeft &&
          birdLeft < pipeRight &&
          (birdTop < pipeTopEnd || birdBottom > pipeBottomStart)
        ) {
          endGame();
          return;
        }
      }
    };

    const gameLoop = () => {
      if (gameState !== 'playing') return;
      update();
      draw();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };
    
    const endGame = async () => {
      if (gameState === 'over') return;
      setGameState('over');
      cancelAnimationFrame(gameLoopRef.current!);
      
      if (user && score > 0) {
          setIsSubmitting(true);
          const result = await awardFlappyBirdScore(user.uid, score);
           if (result.success) {
            toast({
                title: "게임 종료!",
                description: result.message
            });
           } else {
               toast({
                title: "오류",
                description: result.message,
                variant: 'destructive'
            });
           }
          setIsSubmitting(false);
      }
    };
    
    const startGame = () => {
      if (gameState === 'playing') return;
      resetGame();
      setGameState('playing');
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    const handleClick = () => {
      if (gameState === 'playing') {
        birdVelocity = -8;
      } else if (gameState === 'start' || gameState === 'over') {
        startGame();
      }
    };
    
    canvas.addEventListener('click', handleClick);
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            handleClick();
        }
    });

    if (gameState === 'playing') {
        resetGame();
        gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else {
        context.clearRect(0, 0, canvas.width, canvas.height);
    }

    return () => {
      cancelAnimationFrame(gameLoopRef.current!);
      canvas.removeEventListener('click', handleClick);
      // Clean up keydown listener might be more complex in React, handle with care
    };
  }, [gameState, user, score, toast]);

  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
        <Bird className="mr-2 h-6 w-6" />
        플래피 종달
      </h1>

      <div className="relative border-4 border-primary rounded-lg overflow-hidden">
        <canvas ref={canvasRef} width="600" height="400" className="bg-cyan-200" />
        <img ref={birdRef} src="/bird.png" alt="bird" className="hidden"/>

        <div className="absolute top-4 right-4 bg-black/50 text-white font-bold text-2xl px-4 py-2 rounded-lg">
          SCORE: {score}
        </div>

        {gameState !== 'playing' && (
          <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white">
            {gameState === 'start' && (
              <>
                <h2 className="text-4xl font-bold font-headline mb-4">플래피 종달</h2>
                <Button size="lg" onClick={() => setGameState('playing')}>게임 시작</Button>
              </>
            )}
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">화면을 클릭하거나 스페이스바를 눌러 점프하세요.</p>
       <AlertDialog open={gameState === 'over' && !isSubmitting}>
          <AlertDialogContent>
             <AlertDialogHeader>
               <AlertDialogTitle>게임 종료!</AlertDialogTitle>
                <AlertDialogDescription>
                    최종 점수: <strong>{score}점</strong>
                    <br/>
                    획득 포인트: <strong>{Math.floor(score/2)} 포인트</strong> (포인트 한도에 따라 지급되지 않을 수 있음)
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
