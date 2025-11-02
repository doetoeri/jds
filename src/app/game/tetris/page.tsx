'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Puzzle, Loader2, Play, Pause, RotateCw } from 'lucide-react';
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
import { cn } from '@/lib/utils';

// --- Game Constants ---
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30; // Increased for better visibility
const NEXT_COLS = 4;
const NEXT_ROWS = 4;

const SHAPES = {
  I: { shape: [[1, 1, 1, 1]], color: 'hsl(180, 100%, 50%)' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: 'hsl(240, 100%, 60%)' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: 'hsl(30, 100%, 50%)' },
  O: { shape: [[1, 1], [1, 1]], color: 'hsl(60, 100%, 50%)' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: 'hsl(120, 100%, 50%)' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: 'hsl(280, 100%, 60%)' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: 'hsl(0, 100%, 50%)' },
};

type ShapeName = keyof typeof SHAPES;
type Board = (ShapeName | null)[][];
type Piece = {
  shapeName: ShapeName;
  matrix: number[][];
  x: number;
  y: number;
};

// --- Helper Functions ---
const createEmptyBoard = (): Board => Array.from({ length: ROWS }, () => Array(COLS).fill(null));

const TetrisPage: React.FC = () => {
  // --- State Hooks ---
  const [board, setBoard] = useState<Board>(createEmptyBoard);
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [nextPiece, setNextPiece] = useState<Piece | null>(null);
  const [pieceBag, setPieceBag] = useState<ShapeName[]>([]);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [linesCleared, setLinesCleared] = useState(0);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'paused' | 'over'>('start');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- Refs ---
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  const lastTimeRef = useRef(0);
  const dropCounterRef = useRef(0);
  const dropInterval = useRef(1000);

  // --- Auth & Toast ---
  const { toast } = useToast();
  const [user] = useAuthState(auth);

  // --- Game Logic ---
  const getFromBag = useCallback((): [ShapeName, ShapeName[]] => {
    let newBag = [...pieceBag];
    if (newBag.length === 0) {
      newBag = (Object.keys(SHAPES) as ShapeName[]).sort(() => Math.random() - 0.5);
    }
    const shape = newBag.pop()!;
    return [shape, newBag];
  }, [pieceBag]);

  const createPiece = useCallback((shapeName: ShapeName): Piece => {
    const { shape } = SHAPES[shapeName];
    return {
      shapeName,
      matrix: shape,
      x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
      y: 0,
    };
  }, []);

  const isValidMove = useCallback((pieceMatrix: number[][], offsetX: number, offsetY: number): boolean => {
    for (let y = 0; y < pieceMatrix.length; y++) {
      for (let x = 0; x < pieceMatrix[y].length; x++) {
        if (pieceMatrix[y][x] !== 0) {
          const newX = offsetX + x;
          const newY = offsetY + y;
          if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && board[newY]?.[newX] !== null)) {
            return false;
          }
        }
      }
    }
    return true;
  }, [board]);
  
  const startGame = useCallback(() => {
    setBoard(createEmptyBoard());
    
    const [shape1, bag1] = getFromBag();
    const [shape2, bag2] = getFromBag();

    setCurrentPiece(createPiece(shape1));
    setNextPiece(createPiece(shape2));
    setPieceBag(bag2);
    
    setScore(0);
    setLinesCleared(0);
    setLevel(1);
    dropInterval.current = 1000;
    setGameState('playing');
  }, [createPiece, getFromBag]);

  const drawBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, ghost = false) => {
    ctx.fillStyle = color;
    if (ghost) {
      ctx.globalAlpha = 0.3;
      ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      ctx.globalAlpha = 1.0;
    } else {
      ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      // Add a subtle 3D effect
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(x * BLOCK_SIZE + 2, y * BLOCK_SIZE + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
    }
  };

  const draw = useCallback(() => {
    // --- Draw Main Board ---
    const mainCtx = mainCanvasRef.current?.getContext('2d');
    if (mainCtx) {
      mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);
      // Draw grid
      mainCtx.strokeStyle = 'rgba(128, 128, 128, 0.1)';
      for (let i = 1; i < COLS; i++) {
        mainCtx.beginPath(); mainCtx.moveTo(i * BLOCK_SIZE, 0); mainCtx.lineTo(i * BLOCK_SIZE, ROWS * BLOCK_SIZE); mainCtx.stroke();
      }
      for (let i = 1; i < ROWS; i++) {
        mainCtx.beginPath(); mainCtx.moveTo(0, i * BLOCK_SIZE); mainCtx.lineTo(COLS * BLOCK_SIZE, i * BLOCK_SIZE); mainCtx.stroke();
      }

      board.forEach((row, y) => row.forEach((cell, x) => {
        if (cell) drawBlock(mainCtx, x, y, SHAPES[cell].color);
      }));
      
      if (currentPiece) {
        // Draw ghost piece
        let ghostY = currentPiece.y;
        while(isValidMove(currentPiece.matrix, currentPiece.x, ghostY + 1)) {
          ghostY++;
        }
        currentPiece.matrix.forEach((row, y) => row.forEach((val, x) => {
          if (val) drawBlock(mainCtx, currentPiece.x + x, ghostY + y, SHAPES[currentPiece.shapeName].color, true);
        }));

        // Draw current piece
        currentPiece.matrix.forEach((row, y) => row.forEach((val, x) => {
          if (val) drawBlock(mainCtx, currentPiece.x + x, currentPiece.y + y, SHAPES[currentPiece.shapeName].color);
        }));
      }
    }

    // --- Draw Next Piece ---
    const nextCtx = nextCanvasRef.current?.getContext('2d');
    if (nextCtx && nextPiece) {
      nextCtx.clearRect(0, 0, nextCtx.canvas.width, nextCtx.canvas.height);
      const { shape, color } = SHAPES[nextPiece.shapeName];
      const centeredX = (NEXT_COLS * BLOCK_SIZE - shape[0].length * BLOCK_SIZE) / 2 / BLOCK_SIZE;
      const centeredY = (NEXT_ROWS * BLOCK_SIZE - shape.length * BLOCK_SIZE) / 2 / BLOCK_SIZE;
      shape.forEach((row, y) => row.forEach((val, x) => {
        if (val) drawBlock(nextCtx, centeredX + x, centeredY + y, color);
      }));
    }
  }, [board, currentPiece, nextPiece, isValidMove]);
  
  const endGame = useCallback(async () => {
    if (gameState === 'over') return;
    setGameState('over');
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    
    if (user && score > 0) {
      setIsSubmitting(true);
      try {
        const result = await awardTetrisScore(user.uid, score);
        if (result.success) toast({ title: '점수 기록!', description: result.message });
      } catch (e: any) {
        toast({ title: '기록 실패', description: e.message, variant: 'destructive' });
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [score, user, toast, gameState]);

  const lockPieceAndContinue = useCallback(() => {
    if (!currentPiece) return;

    const newBoard = board.map(row => [...row]);
    currentPiece.matrix.forEach((row, y) => row.forEach((val, x) => {
      if (val) {
        newBoard[currentPiece.y + y][currentPiece.x + x] = currentPiece.shapeName;
      }
    }));
    
    let linesClearedCount = 0;
    const clearedBoard = newBoard.filter(row => {
      const isFull = row.every(cell => cell !== null);
      if (isFull) linesClearedCount++;
      return !isFull;
    });

    const newEmptyRows = Array.from({ length: linesClearedCount }, () => Array(COLS).fill(null));
    const finalBoard = [...newEmptyRows, ...clearedBoard];
    setBoard(finalBoard);

    if (linesClearedCount > 0) {
      const newLines = linesCleared + linesClearedCount;
      setLinesCleared(newLines);
      setScore(prev => prev + [0, 100, 300, 500, 800][linesClearedCount] * level);
      const newLevel = Math.floor(newLines / 10) + 1;
      if (newLevel > level) {
        setLevel(newLevel);
        dropInterval.current = Math.max(100, 1000 - (newLevel - 1) * 50);
      }
    }
    
    if (nextPiece) {
      if (!isValidMove(nextPiece.matrix, nextPiece.x, nextPiece.y, finalBoard)) {
        endGame();
        return;
      }
      setCurrentPiece(nextPiece);
      const [newShape, newBag] = getFromBag();
      setNextPiece(createPiece(newShape));
      setPieceBag(newBag);
    }
  }, [currentPiece, board, nextPiece, linesCleared, level, isValidMove, endGame, getFromBag, createPiece, pieceBag]);

  const pieceDrop = useCallback(() => {
    if (!currentPiece || gameState !== 'playing') return;
    if (isValidMove(currentPiece.matrix, currentPiece.x, currentPiece.y + 1)) {
      setCurrentPiece(prev => (prev ? { ...prev, y: prev.y + 1 } : null));
    } else {
      lockPieceAndContinue();
    }
    dropCounterRef.current = 0;
  }, [currentPiece, gameState, isValidMove, lockPieceAndContinue]);

  const playerMove = (dx: number) => {
    if (!currentPiece || gameState !== 'playing') return;
    if (isValidMove(currentPiece.matrix, currentPiece.x + dx, currentPiece.y)) {
      setCurrentPiece(prev => prev ? { ...prev, x: prev.x + dx } : null);
    }
  };

  const playerRotate = () => {
    if (!currentPiece || gameState !== 'playing') return;
    const transposed = currentPiece.matrix[0].map((_, colIndex) => currentPiece.matrix.map(row => row[colIndex]));
    const rotated = transposed.map(row => row.reverse());
    
    // Wall kick logic (basic)
    const kicks = [0, 1, -1, 2, -2];
    for (const kick of kicks) {
      if (isValidMove(rotated, currentPiece.x + kick, currentPiece.y)) {
        setCurrentPiece(prev => prev ? { ...prev, matrix: rotated, x: prev.x + kick } : null);
        return;
      }
    }
  };
  
  const playerDrop = (hard = false) => {
    if (!currentPiece || gameState !== 'playing') return;
    if (hard) {
      let ghostY = currentPiece.y;
      while(isValidMove(currentPiece.matrix, currentPiece.x, ghostY + 1)) {
        ghostY++;
      }
      setCurrentPiece(prev => (prev ? {...prev, y: ghostY} : null));
      lockPieceAndContinue();
    } else {
      pieceDrop();
    }
  };
  
  const gameLoop = useCallback((time: number) => {
    if (gameState !== 'playing') return;
    if (lastTimeRef.current === 0) lastTimeRef.current = time;
    
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;
    dropCounterRef.current += deltaTime;
    
    if (dropCounterRef.current > dropInterval.current) {
      pieceDrop();
    }
    
    draw();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [draw, pieceDrop, gameState]);
  
  // --- Effects ---
  useEffect(() => {
    if (gameState === 'playing') {
      lastTimeRef.current = 0;
      dropCounterRef.current = 0;
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    }
    draw(); // Draw once on state change
    return () => { if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current); };
  }, [gameState, gameLoop, draw]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameState !== 'playing') return;
    e.preventDefault();
    const keyMap: {[key: string]: Function} = {
      'ArrowLeft': () => playerMove(-1), 'a': () => playerMove(-1),
      'ArrowRight': () => playerMove(1), 'd': () => playerMove(1),
      'ArrowDown': () => playerDrop(), 's': () => playerDrop(),
      'ArrowUp': () => playerRotate(), 'w': () => playerRotate(), 'z': () => playerRotate(),
      ' ': () => playerDrop(true),
    };
    if (keyMap[e.key]) keyMap[e.key]();
  }, [gameState]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  return (
    <>
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
          <Puzzle className="mr-2 h-7 w-7" />
          테트리스
        </h1>
        <div className="flex flex-col md:flex-row-reverse gap-6 items-start">
          <Card className="order-1 md:order-2 bg-slate-900/50 shadow-2xl rounded-lg border-primary/20">
            <CardContent className="p-2">
              <div className="relative">
                <canvas ref={mainCanvasRef} width={COLS * BLOCK_SIZE} height={ROWS * BLOCK_SIZE} className="rounded-md" />
                {gameState !== 'playing' && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white p-4 rounded-md backdrop-blur-sm">
                    <h2 className="text-5xl font-bold font-headline mb-2 text-primary">TETRIS</h2>
                    {gameState === 'over' && <p className="mb-4 text-xl">GAME OVER</p>}
                    <Button size="lg" onClick={startGame} className="font-bold text-lg">
                      <Play className="mr-2"/>{gameState === 'start' ? '게임 시작' : '다시 시작'}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <div className="order-2 md:order-1 space-y-4 w-full md:w-48">
            <Card>
              <CardHeader className="p-3"><CardTitle className="text-sm tracking-widest">NEXT</CardTitle></CardHeader>
              <CardContent className="p-1 flex items-center justify-center bg-gray-900/80 rounded-b-lg h-[124px]">
                <canvas ref={nextCanvasRef} width={NEXT_COLS * BLOCK_SIZE} height={NEXT_ROWS * BLOCK_SIZE} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-3"><CardTitle className="text-sm tracking-widest">SCORE</CardTitle></CardHeader>
              <CardContent className="p-3"><p className="text-2xl font-bold font-mono">{score}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="p-3"><CardTitle className="text-sm tracking-widest">LEVEL</CardTitle></CardHeader>
              <CardContent className="p-3"><p className="text-2xl font-bold font-mono">{level}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="p-3"><CardTitle className="text-sm tracking-widest">LINES</CardTitle></CardHeader>
              <CardContent className="p-3"><p className="text-2xl font-bold font-mono">{linesCleared}</p></CardContent>
            </Card>
          </div>
        </div>
        <p className="text-sm text-muted-foreground hidden md:block">방향키 또는 W,A,S,D로 조종 | Z,W,위쪽키로 회전 | 스페이스로 하드 드롭</p>
      </div>
      
      <AlertDialog open={gameState === 'over'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>게임 오버!</AlertDialogTitle>
            <AlertDialogDescription>
              최종 점수: <strong>{score}점</strong>
              {isSubmitting && <div className="flex items-center gap-2 mt-2"><Loader2 className="animate-spin h-4 w-4" /> 점수 기록 중...</div>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={startGame} disabled={isSubmitting}>다시하기</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TetrisPage;
