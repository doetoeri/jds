
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Puzzle, Loader2, RotateCw, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
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
const BLOCK_SIZE = 25;
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

const COLORS: { [key in keyof typeof SHAPES]: string } = {
  I: '#00f0f0', // Cyan
  J: '#0000f0', // Blue
  L: '#f0a000', // Orange
  O: '#f0f000', // Yellow
  S: '#00f000', // Green
  T: '#a000f0', // Purple
  Z: '#f00000', // Red
};

type Shape = keyof typeof SHAPES;
type Board = (Shape | null)[][];
type Piece = {
  shape: Shape;
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
  const lastTimeRef = useRef(0);
  const dropCounterRef = useRef(0);
  const dropIntervalRef = useRef(1000);

  const { toast } = useToast();
  const [user] = useAuthState(auth);

  const createPiece = useCallback((): Piece => {
    const shapes = Object.keys(SHAPES) as Shape[];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const matrix = SHAPES[shape];
    return {
      shape,
      matrix,
      x: Math.floor(COLS / 2) - Math.floor(matrix[0].length / 2),
      y: 0,
    };
  }, []);

  const isValidMove = useCallback((pieceMatrix: number[][], offsetX: number, offsetY: number, currentBoard: Board): boolean => {
    for (let y = 0; y < pieceMatrix.length; y++) {
      for (let x = 0; x < pieceMatrix[y].length; x++) {
        if (pieceMatrix[y][x] !== 0) {
          const newX = offsetX + x;
          const newY = offsetY + y;
          if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && currentBoard[newY]?.[newX] !== null)) {
            return false;
          }
        }
      }
    }
    return true;
  }, []);

  const drawBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(x * BLOCK_SIZE, y * BLOCK_SIZE);
    ctx.lineTo((x + 1) * BLOCK_SIZE, y * BLOCK_SIZE);
    ctx.lineTo((x + 1) * BLOCK_SIZE - 2, y * BLOCK_SIZE + 2);
    ctx.lineTo(x * BLOCK_SIZE + 2, y * BLOCK_SIZE + 2);
    ctx.closePath();
    ctx.fill();
  };
  
  const draw = useCallback(() => {
    const mainCtx = mainCanvasRef.current?.getContext('2d');
    if (mainCtx) {
      mainCtx.fillStyle = '#111827';
      mainCtx.fillRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);
      board.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell) {
            drawBlock(mainCtx, x, y, COLORS[cell]);
          }
        });
      });
      if (currentPiece) {
        currentPiece.matrix.forEach((row, y) => {
          row.forEach((val, x) => {
            if (val !== 0) {
              drawBlock(mainCtx, currentPiece.x + x, currentPiece.y + y, COLORS[currentPiece.shape]);
            }
          });
        });
      }
    }

    const nextCtx = nextCanvasRef.current?.getContext('2d');
    if (nextCtx && nextPiece) {
      nextCtx.fillStyle = '#111827';
      nextCtx.fillRect(0, 0, nextCtx.canvas.width, nextCtx.canvas.height);
      const centeredX = Math.floor(NEXT_COLS / 2) - Math.floor(nextPiece.matrix[0].length / 2);
      const centeredY = Math.floor(NEXT_ROWS / 2) - Math.floor(nextPiece.matrix.length / 2);
      nextPiece.matrix.forEach((row, y) => {
        row.forEach((val, x) => {
          if (val !== 0) {
            drawBlock(nextCtx, centeredX + x, centeredY + y, COLORS[nextPiece.shape]);
          }
        });
      });
    }
  }, [board, currentPiece, nextPiece]);

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

  const pieceDrop = useCallback(() => {
    if (!currentPiece) return;

    if (isValidMove(currentPiece.matrix, currentPiece.x, currentPiece.y + 1, board)) {
      setCurrentPiece(prev => prev ? { ...prev, y: prev.y + 1 } : null);
    } else {
      // Lock the piece and create a new one
      const newBoard = board.map(row => [...row]);
      currentPiece.matrix.forEach((row, y) => {
        row.forEach((val, x) => {
          if (val !== 0) {
            const boardY = currentPiece.y + y;
            const boardX = currentPiece.x + x;
            if (boardY >= 0 && boardY < ROWS) {
              newBoard[boardY][boardX] = currentPiece.shape;
            }
          }
        });
      });

      // Check for cleared lines
      const clearedBoardWithoutFullLines = newBoard.filter(row => !row.every(cell => cell !== null));
      const linesClearedCount = ROWS - clearedBoardWithoutFullLines.length;
      
      const newEmptyRows = Array.from({ length: linesClearedCount }, () => Array(COLS).fill(null));
      const finalBoard = [...newEmptyRows, ...clearedBoardWithoutFullLines];


      if (linesClearedCount > 0) {
        const newLines = linesCleared + linesClearedCount;
        setLinesCleared(newLines);
        setScore(prev => prev + [0, 10, 30, 50, 100][linesClearedCount] * level);
        const newLevel = Math.floor(newLines / 10) + 1;
        if (newLevel > level) {
          setLevel(newLevel);
          dropIntervalRef.current = Math.max(100, 1000 - (newLevel - 1) * 50);
        }
      }
      
      setBoard(finalBoard);
      
      if (nextPiece) {
        const nextPieceWithStartPosition = {
            ...nextPiece,
            x: Math.floor(COLS / 2) - Math.floor(nextPiece.matrix[0].length / 2),
            y: 0,
        };
        
        if (!isValidMove(nextPieceWithStartPosition.matrix, nextPieceWithStartPosition.x, nextPieceWithStartPosition.y, finalBoard)) {
          endGame();
          return;
        }
        setCurrentPiece(nextPieceWithStartPosition);
        setNextPiece(createPiece());
      }
    }
    dropCounterRef.current = 0;
  }, [board, currentPiece, isValidMove, nextPiece, createPiece, endGame, level, linesCleared]);

  const gameLoop = useCallback((time: number) => {
    if (gameState !== 'playing') return;

    if (lastTimeRef.current === 0) lastTimeRef.current = time;
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    dropCounterRef.current += deltaTime;
    if (dropCounterRef.current > dropIntervalRef.current) {
      pieceDrop();
    }
    draw();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [draw, pieceDrop, gameState]);

  const startGame = useCallback(() => {
    setBoard(createEmptyBoard());
    const firstPiece = createPiece();
    setCurrentPiece(firstPiece);
    setNextPiece(createPiece());
    setScore(0);
    setLinesCleared(0);
    setLevel(1);
    dropIntervalRef.current = 1000;
    setGameState('playing');
  }, [createPiece]);

  useEffect(() => {
    if (gameState === 'playing') {
      lastTimeRef.current = 0;
      dropCounterRef.current = 0;
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    }
    // Cleanup on unmount
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, gameLoop]);

  const playerMove = (dx: number) => {
    if (!currentPiece || gameState !== 'playing') return;
    if (isValidMove(currentPiece.matrix, currentPiece.x + dx, currentPiece.y, board)) {
      setCurrentPiece(prev => prev ? { ...prev, x: prev.x + dx } : null);
    }
  };

  const playerRotate = () => {
    if (!currentPiece || gameState !== 'playing') return;
    const rotated = currentPiece.matrix[0].map((_, colIndex) => currentPiece.matrix.map(row => row[colIndex]).reverse());
    
    // Wall kick logic
    let offsetX = 0;
    if (!isValidMove(rotated, currentPiece.x, currentPiece.y, board)) {
        offsetX = 1;
        if (!isValidMove(rotated, currentPiece.x + offsetX, currentPiece.y, board)) {
            offsetX = -1;
             if (!isValidMove(rotated, currentPiece.x + offsetX, currentPiece.y, board)) {
                offsetX = 2;
                 if (!isValidMove(rotated, currentPiece.x + offsetX, currentPiece.y, board)) {
                    offsetX = -2;
                     if (!isValidMove(rotated, currentPiece.x + offsetX, currentPiece.y, board)) {
                        return; // Cannot rotate
                    }
                }
            }
        }
    }
    setCurrentPiece(prev => prev ? { ...prev, matrix: rotated, x: prev.x + offsetX } : null);
  };

  const playerDrop = (hard = false) => {
    if (!currentPiece || gameState !== 'playing') return;
    if (hard) {
      let newY = currentPiece.y;
      while(isValidMove(currentPiece.matrix, currentPiece.x, newY + 1, board)) {
        newY++;
      }
      setCurrentPiece(prev => prev ? {...prev, y: newY} : null);
      setTimeout(() => pieceDrop(), 50);
    } else {
      pieceDrop();
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameState !== 'playing') return;
    
    const keyMap: {[key: string]: Function} = {
      'ArrowLeft': () => playerMove(-1),
      'ArrowRight': () => playerMove(1),
      'ArrowDown': () => playerDrop(),
      'ArrowUp': () => playerRotate(),
      ' ': () => playerDrop(true),
    };
    if (keyMap[e.key]) {
      e.preventDefault();
      keyMap[e.key]();
    }
  }, [gameState]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleTouch = (e: React.TouchEvent, action: Function) => {
    e.preventDefault();
    action();
  };

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
          <Puzzle className="mr-2 h-6 w-6" />
          테트리스
        </h1>
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <Card className="order-2 md:order-1 bg-gray-900 shadow-lg rounded-lg">
            <CardContent className="p-1">
              <div className="relative">
                <canvas ref={mainCanvasRef} width={COLS * BLOCK_SIZE} height={ROWS * BLOCK_SIZE} className="rounded-md" />
                {gameState !== 'playing' && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white p-4 rounded-md">
                    <h2 className="text-4xl font-bold font-headline mb-4 text-center">TETRIS</h2>
                    <Button size="lg" onClick={startGame}>게임 시작</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <div className="order-1 md:order-2 space-y-4 w-full md:w-48">
            <Card>
              <CardHeader className="p-3"><CardTitle className="text-sm">NEXT</CardTitle></CardHeader>
              <CardContent className="p-3 flex items-center justify-center bg-gray-900 rounded-b-lg">
                <canvas ref={nextCanvasRef} width={NEXT_COLS * BLOCK_SIZE} height={NEXT_ROWS * BLOCK_SIZE} />
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
        <p className="text-sm text-muted-foreground hidden md:block">방향키로 조종, 스페이스 바로 하드 드롭</p>
        
        <div className="grid grid-cols-3 gap-2 w-full max-w-sm md:hidden mt-4">
          <Button onTouchStart={(e) => handleTouch(e, () => playerMove(-1))} className="py-6 h-auto"><ArrowLeft /></Button>
          <Button onTouchStart={(e) => handleTouch(e, () => playerRotate())} className="py-6 h-auto"><RotateCw /></Button>
          <Button onTouchStart={(e) => handleTouch(e, () => playerMove(1))} className="py-6 h-auto"><ArrowRight /></Button>
          <Button onTouchStart={(e) => handleTouch(e, () => playerDrop(true))} className="col-span-3 py-6 h-auto"><ArrowDown /></Button>
        </div>
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

    