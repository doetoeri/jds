
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Gamepad2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, awardTetrisScore } from '@/lib/firebase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';


const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

const COLORS = [
    null,
    '#FFD700', // I (Gold)
    '#00BFFF', // J (DeepSkyBlue)
    '#FF4500', // L (OrangeRed)
    '#FFFF00', // O (Yellow)
    '#00FF00', // S (Lime)
    '#800080', // T (Purple)
    '#FF0000', // Z (Red)
];

const SHAPES = [
    [], // 0
    [[1, 1, 1, 1]], // I
    [[2, 0, 0], [2, 2, 2]], // J
    [[0, 0, 3], [3, 3, 3]], // L
    [[4, 4], [4, 4]], // O
    [[0, 5, 5], [5, 5, 0]], // S
    [[0, 6, 0], [6, 6, 6]], // T
    [[7, 7, 0], [0, 7, 7]], // Z
];

export default function TetrisPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  const [gameState, setGameState] = useState<'start' | 'playing' | 'over'>('start');
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(0);
  const [nextPiece, setNextPiece] = useState<number[][] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  
  const createEmptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));

  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setLines(0);
    setLevel(0);

    const board = createEmptyBoard();
    let piece: { x: number, y: number, shape: number[][], value: number } | null = null;
    let dropCounter = 0;
    let dropInterval = 1000;
    let lastTime = 0;

    const randomPiece = () => {
        const rand = Math.floor(Math.random() * (SHAPES.length - 1)) + 1;
        return SHAPES[rand];
    };
    
    let nextShape = randomPiece();

    const spawnPiece = () => {
        const shape = nextShape;
        setNextPiece(shape);
        nextShape = randomPiece();
        
        piece = {
            shape,
            value: SHAPES.findIndex(s => s === shape),
            x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
            y: 0,
        };

        if (checkCollision(board, piece)) {
            endGame();
        }
    };
    
    const draw = (context: CanvasRenderingContext2D) => {
        context.fillStyle = '#111827';
        context.fillRect(0, 0, context.canvas.width, context.canvas.height);

        drawMatrix(context, board, { x: 0, y: 0 });
        if (piece) {
            drawMatrix(context, piece.shape, { x: piece.x, y: piece.y }, piece.value);
        }
    };
    
    const drawMatrix = (context: CanvasRenderingContext2D, matrix: number[][], offset: { x: number, y: number }, value?: number) => {
        matrix.forEach((row, y) => {
            row.forEach((cellValue, x) => {
                if (cellValue !== 0) {
                    context.fillStyle = COLORS[value || cellValue]!;
                    context.fillRect((offset.x + x) * BLOCK_SIZE, (offset.y + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                     context.strokeStyle = 'rgba(0,0,0,0.5)';
                     context.lineWidth = 2;
                     context.strokeRect((offset.x + x) * BLOCK_SIZE, (offset.y + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });
    };

    const solidifyPiece = () => {
        if (!piece) return;
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board[piece!.y + y][piece!.x + x] = piece!.value;
                }
            });
        });
    };
    
    const clearLines = () => {
        let linesCleared = 0;
        outer: for (let y = board.length - 1; y > 0; --y) {
            for (let x = 0; x < board[y].length; ++x) {
                if (board[y][x] === 0) {
                    continue outer;
                }
            }
            const row = board.splice(y, 1)[0].fill(0);
            board.unshift(row);
            ++y;
            linesCleared++;
        }
        if (linesCleared > 0) {
            setLines(l => l + linesCleared);
            setScore(s => s + [0, 100, 300, 500, 800][linesCleared] * (level + 1));
            
            const newTotalLines = lines + linesCleared;
            const newLevel = Math.floor(newTotalLines / 10);
            if (newLevel > level) {
                setLevel(newLevel);
                dropInterval = 1000 * Math.pow(0.8, newLevel);
            }
        }
    };
    
     const checkCollision = (board: number[][], piece: { x: number, y: number, shape: number[][] }) => {
        for (let y = 0; y < piece.shape.length; ++y) {
            for (let x = 0; x < piece.shape[y].length; ++x) {
                if (piece.shape[y][x] !== 0 &&
                   (board[piece.y + y] && board[piece.y + y][piece.x + x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    };
    
    const movePiece = (dir: number) => {
        if (!piece) return;
        piece.x += dir;
        if (checkCollision(board, piece)) {
            piece.x -= dir;
        }
    };
    
    const rotate = (matrix: number[][]) => {
        const N = matrix.length - 1;
        const result = matrix.map((row, i) =>
            row.map((val, j) => matrix[N - j][i])
        );
        return result;
    };

    const rotatePiece = () => {
        if (!piece) return;
        const originalShape = piece.shape;
        piece.shape = rotate(piece.shape);
        let offset = 1;
        while (checkCollision(board, piece)) {
            piece.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > piece.shape[0].length) {
                piece.shape = originalShape; // revert
                return;
            }
        }
    };
    
    const dropPiece = () => {
        if (!piece) return;
        piece.y++;
        if (checkCollision(board, piece)) {
            piece.y--;
            solidifyPiece();
            clearLines();
            spawnPiece();
        }
        dropCounter = 0;
    };
    
    const hardDrop = () => {
        if (!piece) return;
        while (!checkCollision(board, piece)) {
            piece.y++;
        }
        piece.y--;
        dropPiece();
    };

    const gameLoop = (time = 0) => {
      if (gameState === 'over') return;
      
      const deltaTime = time - lastTime;
      lastTime = time;

      dropCounter += deltaTime;
      if (dropCounter > dropInterval) {
        dropPiece();
      }
      
      const context = canvasRef.current?.getContext('2d');
      if (context) {
        draw(context);
      }
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (e.key === 'ArrowLeft') movePiece(-1);
      else if (e.key === 'ArrowRight') movePiece(1);
      else if (e.key === 'ArrowDown') dropPiece();
      else if (e.key === 'ArrowUp') rotatePiece();
      else if (e.key === ' ') hardDrop();
    };

    const endGame = async () => {
        if (gameLoopRef.current) {
            cancelAnimationFrame(gameLoopRef.current);
        }
        setGameState('over');

        if (user && score > 0) {
            setIsSubmitting(true);
            try {
                await awardTetrisScore(user.uid, score);
                toast({ title: "게임 종료!", description: `최종 점수 ${score}점이 기록되었습니다.` });
            } catch (error: any) {
                toast({ title: "오류", description: error.message || '점수 기록 중 오류 발생', variant: 'destructive' });
            } finally {
                setIsSubmitting(false);
            }
        }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    spawnPiece();
    gameLoop();

    return () => {
        if(gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        window.removeEventListener('keydown', handleKeyDown);
    }
  }, [user, toast, score, gameState, level, lines]);

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
    <>
    <div className="flex flex-col lg:flex-row items-center justify-center gap-6">
      <div className="relative border-4 border-primary rounded-lg overflow-hidden shadow-lg">
        <canvas ref={canvasRef} width={COLS * BLOCK_SIZE} height={ROWS * BLOCK_SIZE} />
        
        {gameState !== 'playing' && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
            {gameState === 'start' && (
              <>
                <h2 className="text-4xl font-bold font-headline mb-4">테트리스</h2>
                 <Button size="lg" onClick={() => setGameState('playing')}>
                    게임 시작
                </Button>
              </>
            )}
          </div>
        )}
      </div>

       <div className="w-full lg:w-48 space-y-4">
         <Card>
            <CardHeader className="p-4">
                <CardTitle className="text-sm">점수</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-2xl font-bold font-mono">
                {score}
            </CardContent>
         </Card>
          <Card>
            <CardHeader className="p-4">
                <CardTitle className="text-sm">줄</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-2xl font-bold font-mono">
                {lines}
            </CardContent>
         </Card>
          <Card>
            <CardHeader className="p-4">
                <CardTitle className="text-sm">레벨</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-2xl font-bold font-mono">
                {level}
            </CardContent>
         </Card>
          <Card>
            <CardHeader className="p-4">
                <CardTitle className="text-sm">다음</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex justify-center items-center">
                {nextPiece && (
                    <div className="bg-background p-1 rounded-md">
                        {nextPiece.map((row, y) => (
                            <div key={y} className="flex">
                                {row.map((value, x) => (
                                    <div key={x} style={{
                                        width: BLOCK_SIZE / 2,
                                        height: BLOCK_SIZE / 2,
                                        backgroundColor: value ? COLORS[SHAPES.findIndex(s => s === nextPiece)] : 'transparent',
                                        border: value ? '1px solid rgba(0,0,0,0.5)' : 'none'
                                    }}/>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
         </Card>
       </div>

    </div>
     <p className="text-sm text-muted-foreground text-center mt-4">↑: 회전, ←/→: 이동, ↓: 소프트 드롭, Space: 하드 드롭</p>
      
       <AlertDialog open={gameState === 'over' && !isSubmitting}>
          <AlertDialogContent>
             <AlertDialogHeader>
               <AlertDialogTitle>게임 종료!</AlertDialogTitle>
                <AlertDialogDescription>
                    최종 점수: <strong>{score}점</strong> / 완성한 줄: <strong>{lines}줄</strong>
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
    </>
  );
}
