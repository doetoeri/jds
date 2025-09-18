
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Puzzle, Loader2 } from 'lucide-react';
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

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const NEXT_COLS = 4;
const NEXT_ROWS = 4;

const SHAPES = {
  I: [[1, 1, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  T: [[0, 1, 0], [1, 1, 1]],
  Z: [[1, 1, 0], [0, 1, 1]],
};
const COLORS: Record<keyof typeof SHAPES, string> = {
  I: 'cyan',
  J: 'blue',
  L: 'orange',
  O: 'yellow',
  S: 'green',
  T: 'purple',
  Z: 'red',
};

type Board = (keyof typeof SHAPES | null)[][];
type Piece = {
  shape: (keyof typeof SHAPES);
  matrix: number[][];
  x: number;
  y: number;
};

const createEmptyBoard = (): Board => Array.from({ length: ROWS }, () => Array(COLS).fill(null));

const TetrisPage: React.FC = () => {
  const [board, setBoard] = useState<Board>(createEmptyBoard);
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [nextPiece, setNextPiece] = useState<Piece | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [linesCleared, setLinesCleared] = useState(0);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'paused' | 'over'>('start');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  const dropCounterRef = useRef(0);
  const dropIntervalRef = useRef(1000);

  const { toast } = useToast();
  const [user] = useAuthState(auth);

  const createPiece = (): Piece => {
    const shapes = Object.keys(SHAPES) as (keyof typeof SHAPES)[];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const matrix = SHAPES[shape];
    return {
      shape,
      matrix,
      x: Math.floor(COLS / 2) - Math.floor(matrix[0].length / 2),
      y: 0,
    };
  };
  
  const isValidMove = useCallback((piece: Piece, newX: number, newY: number, newMatrix: number[][], boardState: Board): boolean => {
    for (let y = 0; y < newMatrix.length; y++) {
      for (let x = 0; x < newMatrix[y].length; x++) {
        if (newMatrix[y][x] !== 0) {
          const boardX = newX + x;
          const boardY = newY + y;
          if (
            boardX < 0 ||
            boardX >= COLS ||
            boardY >= ROWS ||
            (boardY >= 0 && boardState[boardY]?.[boardX] !== null)
          ) {
            return false;
          }
        }
      }
    }
    return true;
  }, []);
  
  const rotatePiece = (matrix: number[][]): number[][] => {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const newMatrix = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        newMatrix[x][rows - 1 - y] = matrix[y][x];
      }
    }
    return newMatrix;
  };

  const handleRotate = useCallback(() => {
    if (!currentPiece) return;
    const rotatedMatrix = rotatePiece(currentPiece.matrix);
    if (isValidMove(currentPiece, currentPiece.x, currentPiece.y, rotatedMatrix, board)) {
      setCurrentPiece(prev => prev ? { ...prev, matrix: rotatedMatrix } : null);
    }
  }, [currentPiece, isValidMove, board]);

  const handleMove = useCallback((dx: number) => {
    if (!currentPiece) return;
    if (isValidMove(currentPiece, currentPiece.x + dx, currentPiece.y, currentPiece.matrix, board)) {
      setCurrentPiece(prev => prev ? { ...prev, x: prev.x + dx } : null);
    }
  }, [currentPiece, isValidMove, board]);

  const drop = useCallback(() => {
    if (!currentPiece) return;
    if (isValidMove(currentPiece, currentPiece.x, currentPiece.y + 1, currentPiece.matrix, board)) {
      setCurrentPiece(prev => prev ? { ...prev, y: prev.y + 1 } : null);
    } else {
      // Lock piece
      const newBoard = board.map(row => [...row]);
      currentPiece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            const boardX = currentPiece.x + x;
            const boardY = currentPiece.y + y;
            if (boardY >= 0) {
              newBoard[boardY][boardX] = currentPiece.shape;
            }
          }
        });
      });
      
      // Check for line clears
      let lines = 0;
      for (let y = newBoard.length - 1; y >= 0; y--) {
        if (newBoard[y].every(cell => cell !== null)) {
          lines++;
          newBoard.splice(y, 1);
          newBoard.unshift(Array(COLS).fill(null));
          y++; // Re-check the same row index as it's now a new row
        }
      }

      if (lines > 0) {
        setLinesCleared(prev => prev + lines);
        setScore(prev => prev + lines * 10 * level);
      }
      
      setBoard(newBoard);
      
      // Next piece
      if (nextPiece) {
        setCurrentPiece(nextPiece);
        setNextPiece(createPiece());
      }
      
      // Game over check
      if (!isValidMove(nextPiece!, nextPiece!.x, nextPiece!.y, nextPiece!.matrix, newBoard)) {
        endGame();
      }
    }
  }, [currentPiece, isValidMove, board, nextPiece, level]);

  const hardDrop = useCallback(() => {
    if (!currentPiece) return;
    let newY = currentPiece.y;
    while(isValidMove(currentPiece, currentPiece.x, newY + 1, currentPiece.matrix, board)) {
        newY++;
    }
    setCurrentPiece(prev => prev ? {...prev, y: newY} : null);
    drop(); // Instantly lock
  }, [currentPiece, board, isValidMove, drop]);

  const draw = useCallback(() => {
    const drawOnCanvas = (canvas: HTMLCanvasElement, boardState: (string|null)[][], piece: Piece | null, cols: number, rows: number) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw board
        boardState.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell) {
                    ctx.fillStyle = COLORS[cell as keyof typeof SHAPES] || '#333';
                    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                }
            });
        });

        // Draw piece
        if (piece) {
            ctx.fillStyle = COLORS[piece.shape];
            piece.matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        ctx.fillRect((piece.x + x) * BLOCK_SIZE, (piece.y + y) * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                    }
                });
            });
        }
    };
    
    if (mainCanvasRef.current) {
        const mainBoard = board.map(row => [...row]);
        drawOnCanvas(mainCanvasRef.current, mainBoard as any, currentPiece, COLS, ROWS);
    }
    
    if (nextCanvasRef.current) {
        const nextBoard = Array.from({ length: NEXT_ROWS }, () => Array(NEXT_COLS).fill(null));
        const centeredPiece = nextPiece ? {
            ...nextPiece,
            x: Math.floor(NEXT_COLS / 2) - Math.floor(nextPiece.matrix[0].length / 2),
            y: Math.floor(NEXT_ROWS / 2) - Math.floor(nextPiece.matrix.length / 2),
        } : null;
        drawOnCanvas(nextCanvasRef.current, nextBoard, centeredPiece, NEXT_COLS, NEXT_ROWS);
    }
}, [board, currentPiece, nextPiece]);


  const gameLoop = useCallback((time: number) => {
    dropCounterRef.current += time;
    if (dropCounterRef.current > dropIntervalRef.current) {
      drop();
      dropCounterRef.current = 0;
    }
    draw();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [draw, drop]);

  const startGame = () => {
    setBoard(createEmptyBoard());
    const firstPiece = createPiece();
    setCurrentPiece(firstPiece);
    setNextPiece(createPiece());
    setScore(0);
    setLinesCleared(0);
    setLevel(1);
    dropIntervalRef.current = 1000;
    setGameState('playing');
    dropCounterRef.current = 0;
    
    let lastTime = 0;
    const loop = (time: number) => {
      if (lastTime === 0) lastTime = time;
      const deltaTime = time - lastTime;
      lastTime = time;
      
      dropCounterRef.current += deltaTime;
      if (dropCounterRef.current > dropIntervalRef.current) {
        drop();
        dropCounterRef.current = 0;
      }
      
      draw();
      gameLoopRef.current = requestAnimationFrame(loop);
    }
    gameLoopRef.current = requestAnimationFrame(loop);
  };
  
  const endGame = async () => {
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    setGameState('over');
    if (user && score > 0) {
        setIsSubmitting(true);
        try {
            const result = await awardTetrisScore(user.uid, score);
            if(result.success) toast({ title: "점수 기록!", description: result.message });
        } catch (e: any) {
            toast({ title: "기록 실패", description: e.message, variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      switch (e.key) {
        case 'ArrowLeft': handleMove(-1); break;
        case 'ArrowRight': handleMove(1); break;
        case 'ArrowDown': drop(); dropCounterRef.current = 0; break;
        case 'ArrowUp': handleRotate(); break;
        case ' ': hardDrop(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleMove, drop, handleRotate, hardDrop]);

  useEffect(() => {
    if (linesCleared >= level * 10) {
      setLevel(prev => prev + 1);
      dropIntervalRef.current = Math.max(100, 1000 - (level * 50));
    }
  }, [linesCleared, level]);
  
  useEffect(draw, [draw]);


  return (
    <>
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
        <Puzzle className="mr-2 h-6 w-6" />
        테트리스
      </h1>
      <div className="flex flex-col md:flex-row gap-4 items-start">
        <Card className="order-2 md:order-1">
          <CardContent className="p-2">
            <div className="relative">
                <canvas
                    ref={mainCanvasRef}
                    width={COLS * BLOCK_SIZE}
                    height={ROWS * BLOCK_SIZE}
                />
                {gameState !== 'playing' && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white">
                        <h2 className="text-4xl font-bold font-headline mb-4">TETRIS</h2>
                        <Button size="lg" onClick={startGame}>게임 시작</Button>
                    </div>
                )}
            </div>
          </CardContent>
        </Card>
        <div className="order-1 md:order-2 space-y-4 w-full md:w-48">
            <Card>
                <CardHeader className="p-3">
                    <CardTitle className="text-sm">NEXT</CardTitle>
                </CardHeader>
                <CardContent className="p-3 flex items-center justify-center">
                    <canvas ref={nextCanvasRef} width={NEXT_COLS * BLOCK_SIZE} height={NEXT_ROWS * BLOCK_SIZE}/>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="p-3"><CardTitle className="text-sm">SCORE</CardTitle></CardHeader>
                <CardContent className="p-3"><p className="text-2xl font-bold">{score}</p></CardContent>
            </Card>
             <Card>
                <CardHeader className="p-3"><CardTitle className="text-sm">LEVEL</CardTitle></CardHeader>
                <CardContent className="p-3"><p className="text-2xl font-bold">{level}</p></CardContent>
            </Card>
             <Card>
                <CardHeader className="p-3"><CardTitle className="text-sm">LINES</CardTitle></CardHeader>
                <CardContent className="p-3"><p className="text-2xl font-bold">{linesCleared}</p></CardContent>
            </Card>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">방향키로 조종, 스페이스 바로 하드 드롭</p>
    </div>
    
     <AlertDialog open={gameState === 'over'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>게임 오버!</AlertDialogTitle>
            <AlertDialogDescription>
              최종 점수: <strong>{score}점</strong>
              {isSubmitting && <div className="flex items-center gap-2 mt-2"><Loader2 className="animate-spin h-4 w-4"/> 점수 기록 중...</div>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={startGame} disabled={isSubmitting}>
                다시하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TetrisPage;
