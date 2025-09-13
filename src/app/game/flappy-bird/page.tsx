
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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
  const birdImageRef = useRef<HTMLImageElement | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const [gameState, setGameState] = useState<'start' | 'playing' | 'over'>('start');
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  
  useEffect(() => {
    const image = new Image();
    image.src = '/bird.png';
    image.onload = () => {
        birdImageRef.current = image;
        setIsImageLoaded(true);
    };
    image.onerror = () => {
        toast({
            title: "오류",
            description: "게임 리소스를 불러오는 데 실패했습니다.",
            variant: "destructive"
        })
    }
  }, [toast]);


  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !birdImageRef.current) return;
    
    setGameState('playing');
    setScore(0);

    let birdY = canvas.height / 2;
    let birdVelocity = 0;
    let pipes: { x: number; y: number, passed?: boolean }[] = [];
    let frame = 0;
    const pipeWidth = 80;
    const pipeGap = 200;
    const pipeInterval = 150;

    const spawnPipe = () => {
        const topPipeHeight = Math.random() * (canvas.height - pipeGap - 100) + 50;
        pipes.push({ x: canvas.width, y: topPipeHeight });
    };

    const draw = () => {
      const context = canvas.getContext('2d');
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);

      context.fillStyle = 'hsl(var(--primary))';
      pipes.forEach(pipe => {
        context.fillRect(pipe.x, 0, pipeWidth, pipe.y);
        context.fillRect(pipe.x, pipe.y + pipeGap, pipeWidth, canvas.height - pipe.y - pipeGap);
      });

      if (birdImageRef.current) {
        context.drawImage(birdImageRef.current, canvas.width / 4, birdY, birdWidth, birdHeight);
      }
    };
    
    const endGame = async () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      setGameState('over');
      
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


    const update = () => {
      birdVelocity += gravity;
      birdY += birdVelocity;

      if (frame % pipeInterval === 0) {
        spawnPipe();
      }
      frame++;

      let scoreIncrement = 0;
      pipes = pipes.filter(pipe => {
        pipe.x -= 2;
        if (pipe.x + pipeWidth < 0) return false;
        if (!pipe.passed && pipe.x + pipeWidth < canvas.width / 4) {
          scoreIncrement++;
          pipe.passed = true;
        }
        return true;
      });
      
      if (scoreIncrement > 0) {
          setScore(s => s + scoreIncrement);
      }

      const birdLeft = canvas.width / 4;
      const birdRight = birdLeft + birdWidth;
      const birdTop = birdY;
      const birdBottom = birdY + birdHeight;

      if (birdBottom > canvas.height || birdTop < 0) {
        endGame();
        return;
      }
      
      for (const pipe of pipes) {
        if (birdRight > pipe.x && birdLeft < pipe.x + pipeWidth && (birdTop < pipe.y || birdBottom > pipe.y + pipeGap)) {
          endGame();
          return;
        }
      }

      gameLoopRef.current = requestAnimationFrame(update);
      draw();
    };

    const handleClick = () => {
        birdVelocity = -8;
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
            e.preventDefault();
            handleClick();
        }
    }
    
    canvas.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);

    update();
    draw();

    return () => {
        if(gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        canvas.removeEventListener('click', handleClick);
        window.removeEventListener('keydown', handleKeyDown);
    }
  }, [score, user, toast]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (gameState === 'playing' && isImageLoaded) {
      cleanup = startGame();
    }
    return () => {
      if (cleanup) cleanup();
    };
  }, [gameState, isImageLoaded, startGame]);

  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
        <Bird className="mr-2 h-6 w-6" />
        플래피 종달
      </h1>

      <div className="relative border-4 border-primary rounded-lg overflow-hidden">
        <canvas ref={canvasRef} width="600" height="400" className="bg-cyan-200" />
        
        <div className="absolute top-4 right-4 bg-black/50 text-white font-bold text-2xl px-4 py-2 rounded-lg">
          SCORE: {score}
        </div>

        {gameState !== 'playing' && (
          <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white">
            {gameState === 'start' && (
              <>
                <h2 className="text-4xl font-bold font-headline mb-4">플래피 종달</h2>
                 <Button size="lg" onClick={() => { if(isImageLoaded) setGameState('playing')}} disabled={!isImageLoaded}>
                    {!isImageLoaded ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 리소스 로딩중</> : '게임 시작'}
                </Button>
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
