
'use client';

import { useEffect, useRef, useReducer, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Gamepad2, Loader2, Trophy } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';

const ROWS = 20;
const COLS = 20;
const BLOCK_SIZE = 20;
const TICK_SPEED = 150;

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

type GameState = {
  snake: { x: number; y: number }[];
  food: { x: number; y: number };
  direction: Direction;
  status: 'start' | 'playing' | 'over';
  score: number;
  isSubmitting: boolean;
};

type Action =
  | { type: 'START_GAME' }
  | { type: 'CHANGE_DIRECTION'; payload: Direction }
  | { type: 'GAME_TICK' }
  | { type: 'SET_SUBMITTING', payload: boolean };

const initialState: GameState = {
  snake: [{ x: 10, y: 10 }],
  food: { x: 15, y: 15 },
  direction: 'RIGHT',
  status: 'start',
  score: 0,
  isSubmitting: false
};

const generateFood = (snake: {x:number, y:number}[]) => {
    let newFood;
    do {
        newFood = {
            x: Math.floor(Math.random() * COLS),
            y: Math.floor(Math.random() * ROWS),
        };
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
};


function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START_GAME':
      const startSnake = [{ x: 10, y: 10 }];
      return {
        ...initialState,
        snake: startSnake,
        food: generateFood(startSnake),
        status: 'playing',
      };

    case 'CHANGE_DIRECTION':
      const { direction } = state;
      const newDirection = action.payload;
      // Prevent reversing direction
      if (
        (direction === 'UP' && newDirection === 'DOWN') ||
        (direction === 'DOWN' && newDirection === 'UP') ||
        (direction === 'LEFT' && newDirection === 'RIGHT') ||
        (direction === 'RIGHT' && newDirection === 'LEFT')
      ) {
        return state;
      }
      return { ...state, direction: newDirection };

    case 'GAME_TICK':
      if (state.status !== 'playing') return state;

      const newSnake = [...state.snake];
      const head = { ...newSnake[0] };

      switch (state.direction) {
        case 'UP': head.y -= 1; break;
        case 'DOWN': head.y += 1; break;
        case 'LEFT': head.x -= 1; break;
        case 'RIGHT': head.x += 1; break;
      }

      // Wall collision
      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
        return { ...state, status: 'over' };
      }

      // Self collision
      for (let i = 1; i < newSnake.length; i++) {
        if (head.x === newSnake[i].x && head.y === newSnake[i].y) {
          return { ...state, status: 'over' };
        }
      }

      newSnake.unshift(head);

      let newFood = state.food;
      let newScore = state.score;
      if (head.x === state.food.x && head.y === state.food.y) {
        newScore += 1;
        newFood = generateFood(newSnake);
      } else {
        newSnake.pop();
      }

      return {
        ...state,
        snake: newSnake,
        food: newFood,
        score: newScore,
      };
    
    case 'SET_SUBMITTING':
        return { ...state, isSubmitting: action.payload };

    default:
      return state;
  }
}

export default function SnakePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { status, score, snake, food, isSubmitting } = state;

  const { toast } = useToast();
  const [user] = useAuthState(auth);
  
  const submitScore = useCallback(async () => {
    if (user && score > 0) {
      dispatch({ type: 'SET_SUBMITTING', payload: true });
      try {
        const result = await awardSnakeScore(user.uid, score);
        if (result.success) {
            toast({ title: "게임 종료!", description: result.message });
        } else {
             toast({ title: "포인트 미지급", description: result.message, variant: "default" });
        }
      } catch (error: any) {
        toast({ title: "오류", description: error.message || '점수 기록 중 오류 발생', variant: 'destructive' });
      } finally {
        dispatch({ type: 'SET_SUBMITTING', payload: false });
      }
    }
  }, [user, score, toast]);

  useEffect(() => {
    if (status === 'over') {
        submitScore();
    }
  }, [status, submitScore]);


  useEffect(() => {
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    context.fillStyle = 'hsl(var(--background))';
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    
    // Draw snake
    context.fillStyle = 'hsl(var(--primary))';
    snake.forEach(segment => {
      context.fillRect(segment.x * BLOCK_SIZE, segment.y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    });

    // Draw food
    context.fillStyle = 'hsl(var(--destructive))';
    context.fillRect(food.x * BLOCK_SIZE, food.y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

  }, [snake, food]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        let direction: Direction | null = null;
        switch (e.key) {
            case 'ArrowUp': direction = 'UP'; break;
            case 'ArrowDown': direction = 'DOWN'; break;
            case 'ArrowLeft': direction = 'LEFT'; break;
            case 'ArrowRight': direction = 'RIGHT'; break;
        }
        if (direction) {
            e.preventDefault();
            dispatch({ type: 'CHANGE_DIRECTION', payload: direction });
        }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (status !== 'playing') return;
    const gameInterval = setInterval(() => {
      dispatch({ type: 'GAME_TICK' });
    }, TICK_SPEED);
    return () => clearInterval(gameInterval);
  }, [status]);


  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
        <Gamepad2 className="mr-2 h-6 w-6" />
        스네이크
      </h1>
      <Card>
        <CardContent className="p-2">
            <div className="relative border-4 border-primary rounded-lg overflow-hidden">
                <canvas 
                    ref={canvasRef} 
                    width={COLS * BLOCK_SIZE} 
                    height={ROWS * BLOCK_SIZE} 
                />
                 <div className="absolute top-2 right-2 bg-black/50 text-white font-bold text-xl px-3 py-1 rounded-lg">
                   SCORE: {score}
                </div>

                {status !== 'playing' && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                        <h2 className="text-4xl font-bold font-headline mb-4">스네이크</h2>
                        <Button size="lg" onClick={() => dispatch({ type: 'START_GAME' })}>
                           게임 시작
                        </Button>
                    </div>
                )}
            </div>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">키보드 방향키로 뱀을 조종하세요.</p>

        <AlertDialog open={status === 'over' && !isSubmitting}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2"><Trophy/>게임 종료!</AlertDialogTitle>
                    <AlertDialogDescription>
                        최종 점수: <strong>{score}점</strong>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => dispatch({ type: 'START_GAME' })}>다시하기</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={isSubmitting}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2"><Loader2 className="animate-spin" />점수 기록 중...</AlertDialogTitle>
                    <AlertDialogDescription>잠시만 기다려주세요.</AlertDialogDescription>
                </AlertDialogHeader>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
