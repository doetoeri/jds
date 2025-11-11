
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Blocks, Loader2, Play, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, awardBlockBlastScore } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const GRID_SIZE = 10;
const BLOCK_SIZE = 35; // Adjust block size for better fit
const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(120, 100%, 50%)',
  'hsl(60, 100%, 50%)',
  'hsl(280, 100%, 60%)',
];

type Grid = (number | null)[][];
type GameStatus = 'start' | 'playing' | 'over';

const BlockBlastPage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [grid, setGrid] = useState<Grid>(() => createEmptyGrid());
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<GameStatus>('start');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const router = useRouter();

  function createEmptyGrid(): Grid {
    return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  }

  const resetGame = () => {
    setGrid(createEmptyGrid());
    setScore(0);
    setGameState('playing');
  };
  
  const handleGameOver = useCallback(async (finalScore: number) => {
    setGameState('over');
    if (user && finalScore > 0) {
      setIsSubmitting(true);
      try {
        const result = await awardBlockBlastScore(user.uid, finalScore);
        toast({ title: '점수 기록!', description: result.message });
        if (result.pointsToPiggy > 0) {
          router.push(`/dashboard/piggy-bank?amount=${result.pointsToPiggy}`);
        }
      } catch (e: any) {
        toast({ title: '기록 실패', description: e.message, variant: 'destructive' });
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [user, toast, router]);

  const fallBlocks = (currentGrid: Grid): Grid => {
    const newGrid = createEmptyGrid();
    for (let c = 0; c < GRID_SIZE; c++) {
      let writeRow = GRID_SIZE - 1;
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        if (currentGrid[r][c] !== null) {
          newGrid[writeRow][c] = currentGrid[r][c];
          writeRow--;
        }
      }
    }
    return newGrid;
  };

  const refillBlocks = (currentGrid: Grid): Grid => {
    const newGrid = currentGrid.map(row => [...row]);
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (newGrid[r][c] === null) {
          newGrid[r][c] = Math.floor(Math.random() * COLORS.length);
        }
      }
    }
    return newGrid;
  };
  
  const checkGameOver = (currentGrid: Grid): boolean => {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (currentGrid[r][c] !== null) {
              if (c < GRID_SIZE - 1 && currentGrid[r][c] === currentGrid[r][c+1]) return false;
              if (r < GRID_SIZE - 1 && currentGrid[r][c] === currentGrid[r+1][c]) return false;
          }
        }
      }
      return true;
  }

  const findConnectedBlocks = (r: number, c: number, color: number, currentGrid: Grid): {r: number, c: number}[] => {
    const toVisit: {r: number, c: number}[] = [{r, c}];
    const visited = new Set<string>();
    const cluster: {r: number, c: number}[] = [];
    
    while(toVisit.length > 0) {
      const {r: row, c: col} = toVisit.pop()!;
      const key = `${row},${col}`;
      
      if(row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE || visited.has(key) || currentGrid[row][col] !== color) {
        continue;
      }
      
      visited.add(key);
      cluster.push({r: row, c: col});
      
      toVisit.push({r: row + 1, c: col});
      toVisit.push({r: row - 1, c: col});
      toVisit.push({r: row, c: col + 1});
      toVisit.push({r: row, c: col - 1});
    }
    
    return cluster;
  }

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const c = Math.floor(x / BLOCK_SIZE);
    const r = Math.floor(y / BLOCK_SIZE);
    
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return;

    const color = grid[r][c];
    if(color === null) return;
    
    const cluster = findConnectedBlocks(r, c, color, grid);
    
    if (cluster.length > 1) {
      let newGrid = grid.map(row => [...row]);
      cluster.forEach(({r: row, c: col}) => {
        newGrid[row][col] = null;
      });
      
      newGrid = fallBlocks(newGrid);
      newGrid = refillBlocks(newGrid);

      setGrid(newGrid);
      setScore(s => s + cluster.length * 10);
      
      if(checkGameOver(newGrid)) {
          handleGameOver(score + cluster.length * 10);
      }
    }
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const colorIndex = grid[r][c];
        if (colorIndex !== null) {
          ctx.fillStyle = COLORS[colorIndex];
          const x = c * BLOCK_SIZE;
          const y = r * BLOCK_SIZE;
          
          ctx.beginPath();
          ctx.roundRect(x + 2, y + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4, [6]);
          ctx.fill();
        }
      }
    }
  }, [grid]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
          <Blocks className="mr-2 h-7 w-7" />
          Block Blast
        </h1>
        <Card className="w-full max-w-sm shadow-lg">
          <CardContent className="p-2">
            <div className="relative rounded-lg overflow-hidden aspect-square">
              <canvas
                ref={canvasRef}
                width={GRID_SIZE * BLOCK_SIZE}
                height={GRID_SIZE * BLOCK_SIZE}
                className="bg-muted w-full h-full"
                onClick={handleCanvasClick}
              />
              <div className="absolute top-4 left-4 bg-black/50 text-white font-bold text-xl px-4 py-2 rounded-lg">
                SCORE: {score}
              </div>
              {gameState !== 'playing' && (
                <motion.div 
                  className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white p-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.h2 
                    className="text-4xl font-bold font-headline mb-4"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                  >
                    Block Blast
                  </motion.h2>
                  {gameState === 'over' && <p className="mb-2 text-lg">GAME OVER</p>}
                  <Button size="lg" onClick={resetGame}>
                    <Play className="mr-2"/>
                    {gameState === 'start' ? '게임 시작' : '다시 시작'}
                  </Button>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>
        <p className="text-sm text-muted-foreground text-center">같은 색의 블록이 2개 이상 붙어있으면 터치하여 없앨 수 있습니다.</p>
      </div>

       <AlertDialog open={gameState === 'over' && !isSubmitting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Trophy className="text-amber-500" />게임 오버!</AlertDialogTitle>
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
    </>
  );
};

export default BlockBlastPage;
