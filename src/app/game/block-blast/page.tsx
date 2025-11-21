
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Blocks, Loader2, Play, Trophy, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, awardBlockBlastScore } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
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

// --- Game Constants & Types ---
const GRID_SIZE = 8;

const SHAPES = {
  '1x1': { shape: [[1]], color: 'hsl(0, 72%, 50%)' }, // red
  '2x1': { shape: [[1, 1]], color: 'hsl(25, 84%, 50%)' }, // orange
  '1x2': { shape: [[1], [1]], color: 'hsl(25, 84%, 50%)' },
  '3x1': { shape: [[1, 1, 1]], color: 'hsl(45, 93%, 47%)' }, // yellow
  '1x3': { shape: [[1], [1], [1]], color: 'hsl(45, 93%, 47%)' },
  '2x2': { shape: [[1, 1], [1, 1]], color: 'hsl(100, 78%, 45%)' }, // lime
  'L-1': { shape: [[1, 0], [1, 0], [1, 1]], color: 'hsl(210, 89%, 56%)' }, // blue
  'L-2': { shape: [[0, 1], [0, 1], [1, 1]], color: 'hsl(210, 89%, 56%)' },
  'L-3': { shape: [[1, 1, 1], [1, 0, 0]], color: 'hsl(210, 89%, 56%)' },
  'L-4': { shape: [[1, 1, 1], [0, 0, 1]], color: 'hsl(210, 89%, 56%)' },
  'T': { shape: [[1, 1, 1], [0, 1, 0]], color: 'hsl(260, 84%, 60%)' }, // purple
  'Z-1': { shape: [[1, 1, 0], [0, 1, 1]], color: 'hsl(330, 74%, 55%)' }, // pink
  'Z-2': { shape: [[0, 1], [1, 1], [1, 0]], color: 'hsl(330, 74%, 55%)' },
};


type ShapeKey = keyof typeof SHAPES;
type Grid = (string | null)[][];
type Piece = { key: ShapeKey; shape: number[][]; color: string };
type GameStatus = 'start' | 'playing' | 'over';

const BlockBlastGame: React.FC = () => {
    const [grid, setGrid] = useState<Grid>(createEmptyGrid());
    const [currentPieces, setCurrentPieces] = useState<(Piece | null)[]>([]);
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState<GameStatus>('start');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [draggedPiece, setDraggedPiece] = useState<{ index: number; piece: Piece, x: number, y: number } | null>(null);
    const [ghostGrid, setGhostGrid] = useState<Grid>(createEmptyGrid());
    const [clearingCells, setClearingCells] = useState<Set<string>>(new Set());

    const { toast } = useToast();
    const [user] = useAuthState(auth);
    const gridRef = useRef<HTMLDivElement>(null);

    function createEmptyGrid(): Grid {
        return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    }
    
    const drawBlock = (color: string, isGhost = false) => {
        const style: React.CSSProperties = isGhost 
            ? { backgroundColor: 'hsla(210, 100%, 80%, 0.2)', border: '1px dashed hsla(210, 100%, 80%, 0.5)' }
            : { backgroundColor: color, border: '2px solid rgba(0,0,0,0.2)' };
        
        return (
            <div className="aspect-square w-full h-full rounded-sm" style={style}>
                 {!isGhost && <div className="w-full h-full rounded-sm" style={{ background: 'linear-gradient(45deg, rgba(255,255,255,0.3), rgba(255,255,255,0.0))' }} />}
            </div>
        );
    };

    const getRandomPieces = useCallback((): Piece[] => {
        const keys = Object.keys(SHAPES) as ShapeKey[];
        return Array.from({ length: 3 }, () => {
            const randomKey = keys[Math.floor(Math.random() * keys.length)];
            return { key: randomKey, ...SHAPES[randomKey] };
        });
    }, []);

    const startGame = useCallback(() => {
        setGrid(createEmptyGrid());
        setCurrentPieces(getRandomPieces());
        setScore(0);
        setGameState('playing');
        setClearingCells(new Set());
    }, [getRandomPieces]);
    
    const canPlacePiece = useCallback((piece: Piece, row: number, col: number, currentGrid: Grid): boolean => {
        for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
                if (piece.shape[r][c]) {
                    const newRow = row + r;
                    const newCol = col + c;
                    if (newRow >= GRID_SIZE || newCol >= GRID_SIZE || newRow < 0 || newCol < 0 || currentGrid[newRow]?.[newCol]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }, []);
    
    const isGameOver = useCallback((pieces: (Piece | null)[], currentGrid: Grid): boolean => {
        for (const piece of pieces) {
            if (!piece) continue;
            for (let r = 0; r <= GRID_SIZE - piece.shape.length; r++) {
                for (let c = 0; c <= GRID_SIZE - piece.shape[0].length; c++) {
                    if (canPlacePiece(piece, r, c, currentGrid)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }, [canPlacePiece]);

    const handleGameOver = useCallback(async (finalScore: number) => {
        setGameState('over');
        if (user && finalScore > 0) {
            setIsSubmitting(true);
            try {
                const result = await awardBlockBlastScore(user.uid, finalScore);
                if (result.success) {
                    toast({ title: '점수 기록!', description: result.message });
                }
            } catch (e: any) {
                toast({ title: '기록 실패', description: e.message, variant: 'destructive' });
            } finally {
                setIsSubmitting(false);
            }
        }
    }, [user, toast]);
    
    const clearLines = useCallback((currentGrid: Grid) => {
        const rowsToClear = new Set<number>();
        const colsToClear = new Set<number>();
        for (let i = 0; i < GRID_SIZE; i++) {
            if (currentGrid[i].every(cell => cell !== null)) rowsToClear.add(i);
            if (currentGrid.every(row => row[i] !== null)) colsToClear.add(i);
        }

        if (rowsToClear.size === 0 && colsToClear.size === 0) {
            return { clearedGrid: currentGrid, clearedLinesCount: 0 };
        }
        
        const newClearingCells = new Set<string>();
        rowsToClear.forEach(r => { for (let c = 0; c < GRID_SIZE; c++) newClearingCells.add(`${r}-${c}`); });
        colsToClear.forEach(c => { for (let r = 0; r < GRID_SIZE; r++) newClearingCells.add(`${r}-${c}`); });

        setClearingCells(newClearingCells);

        const clearedGrid = createEmptyGrid();
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (!rowsToClear.has(r) && !colsToClear.has(c)) {
                    clearedGrid[r][c] = currentGrid[r][c];
                }
            }
        }
        return { clearedGrid, clearedLinesCount: rowsToClear.size + colsToClear.size };
    }, []);

    const handleDrop = (row: number, col: number) => {
        setGhostGrid(createEmptyGrid());
        if (!draggedPiece) return;

        const { piece, index } = draggedPiece;
        if (!canPlacePiece(piece, row, col, grid)) {
            return;
        }

        let pieceScore = 0;
        const newGrid = grid.map(r => [...r]);
        for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
                if (piece.shape[r][c]) {
                    newGrid[row + r][col + c] = piece.color;
                    pieceScore++;
                }
            }
        }
        
        setGrid(newGrid);

        const { clearedGrid, clearedLinesCount } = clearLines(newGrid);
        
        setTimeout(() => {
            setGrid(clearedGrid);
            setClearingCells(new Set());
            const comboScore = clearedLinesCount > 0 ? (10 * clearedLinesCount) * clearedLinesCount : 0;
            const newTotalScore = score + pieceScore + comboScore;
            setScore(newTotalScore);
            
            const newPieces = [...currentPieces];
            newPieces[index] = null;
            
            const remainingPieces = newPieces.filter(p => p !== null);
            if (remainingPieces.length === 0) {
                const nextPieces = getRandomPieces();
                setCurrentPieces(nextPieces);
                if (isGameOver(nextPieces, clearedGrid)) {
                    handleGameOver(newTotalScore);
                }
            } else {
                setCurrentPieces(newPieces);
                if (isGameOver(remainingPieces, clearedGrid)) {
                    handleGameOver(newTotalScore);
                }
            }
        }, 300); // Animation duration
    };
    
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent, index: number, piece: Piece) => {
        if (!piece || gameState !== 'playing') return;
        
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        setDraggedPiece({ index, piece, x: clientX, y: clientY });
    };

    const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!draggedPiece) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        setDraggedPiece(prev => prev ? { ...prev, x: clientX, y: clientY } : null);

        const gridEl = gridRef.current;
        if (!gridEl) return;

        const rect = gridEl.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        const cellWidth = rect.width / GRID_SIZE;
        const cellHeight = rect.height / GRID_SIZE;
        
        const col = Math.floor(x / cellWidth);
        const row = Math.floor(y / cellHeight);
        
        const newGhostGrid = createEmptyGrid();
        if (canPlacePiece(draggedPiece.piece, row, col, grid)) {
            for (let r = 0; r < draggedPiece.piece.shape.length; r++) {
                for (let c = 0; c < draggedPiece.piece.shape[r].length; c++) {
                    if (draggedPiece.piece.shape[r][c]) {
                        const newRow = row + r;
                        const newCol = col + c;
                        if(newRow < GRID_SIZE && newCol < GRID_SIZE) {
                            newGhostGrid[newRow][newCol] = 'ghost';
                        }
                    }
                }
            }
        }
        setGhostGrid(newGhostGrid);
    };

    const handleDragEnd = (e: React.MouseEvent | React.TouchEvent) => {
        if (!draggedPiece) return;

        const gridEl = gridRef.current;
        if (!gridEl) {
            setDraggedPiece(null);
            setGhostGrid(createEmptyGrid());
            return;
        }
        
        const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
        const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;

        const rect = gridEl.getBoundingClientRect();
        if (clientX > rect.left && clientX < rect.right && clientY > rect.top && clientY < rect.bottom) {
            const x = clientX - rect.left;
            const y = clientY - rect.top;
            const cellWidth = rect.width / GRID_SIZE;
            const cellHeight = rect.height / GRID_SIZE;
            const col = Math.floor(x / cellWidth);
            const row = Math.floor(y / cellHeight);
            handleDrop(row, col);
        }
        
        setDraggedPiece(null);
        setGhostGrid(createEmptyGrid());
    };
    
    useEffect(() => {
        const moveHandler = (e: MouseEvent | TouchEvent) => handleDragMove(e as any);
        const endHandler = (e: MouseEvent | TouchEvent) => handleDragEnd(e as any);
        
        if (draggedPiece) {
            window.addEventListener('mousemove', moveHandler);
            window.addEventListener('touchmove', moveHandler);
            window.addEventListener('mouseup', endHandler);
            window.addEventListener('touchend', endHandler);
        }

        return () => {
            window.removeEventListener('mousemove', moveHandler);
            window.removeEventListener('touchmove', moveHandler);
            window.removeEventListener('mouseup', endHandler);
            window.removeEventListener('touchend', endHandler);
        };
    }, [draggedPiece, handleDragMove, handleDragEnd]);


    const DraggablePiece = ({ piece, index }: { piece: Piece | null, index: number }) => {
        if (!piece) return <div className="h-24 w-24" />;

        const isBeingDragged = draggedPiece?.index === index;
        
        return (
            <div
                onMouseDown={(e) => handleDragStart(e, index, piece)}
                onTouchStart={(e) => handleDragStart(e, index, piece)}
                className={cn(
                    "p-2 flex items-center justify-center touch-none",
                    isBeingDragged ? 'cursor-grabbing opacity-50' : 'cursor-grab',
                )}
            >
                <div className="flex flex-col items-center">
                    {piece.shape.map((row, r) => (
                        <div key={r} className="flex">
                            {row.map((cell, c) => (
                                <div key={c} className="w-6 h-6">
                                  {cell ? drawBlock(piece.color) : null}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="flex flex-col items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
                    <Blocks className="mr-2 h-7 w-7" /> Block Blast
                </h1>
                
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6">
                    <Card className="w-full max-w-sm shadow-xl bg-muted/30">
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2"><Star className="text-yellow-400 fill-yellow-400"/> {score}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 relative flex justify-center">
                            <div
                              ref={gridRef}
                              className="grid bg-background/50 border border-secondary"
                              style={{ 
                                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                                width: `min(calc(100vw - 4rem), 400px)`,
                                height: `min(calc(100vw - 4rem), 400px)`,
                              }}
                            >
                                {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                                    const r = Math.floor(i / GRID_SIZE);
                                    const c = i % GRID_SIZE;
                                    const cellColor = grid[r][c];
                                    const isGhost = ghostGrid[r][c] === 'ghost';
                                    const isClearing = clearingCells.has(`${r}-${c}`);
                                    
                                    return (
                                        <div
                                            key={i}
                                            className="border border-secondary/20 relative"
                                        >
                                            <AnimatePresence>
                                            {cellColor && (
                                                <motion.div
                                                    layoutId={`cell-${r}-${c}`}
                                                    className="w-full h-full"
                                                    initial={{ scale: isClearing ? 1 : 0.5, opacity: isClearing ? 1 : 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0, opacity: 0, transition: { duration: 0.2 } }}
                                                    transition={isClearing ? { duration: 0.3, ease: "easeOut" } : { type: 'spring', stiffness: 300, damping: 20 }}
                                                >
                                                   {drawBlock(cellColor)}
                                                </motion.div>
                                            )}
                                            {isGhost && !cellColor && <div className="w-full h-full">{drawBlock('', true)}</div>}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>
                            {gameState !== 'playing' && (
                                 <AnimatePresence>
                                    <motion.div
                                      className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white p-4 rounded-lg"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      exit={{ opacity: 0}}
                                    >
                                      <motion.h2 className="text-4xl font-bold font-headline mb-4" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring' }}>
                                        Block Blast
                                      </motion.h2>
                                      {gameState === 'over' && <p className="mb-2 text-lg">GAME OVER</p>}
                                      <Button size="lg" onClick={startGame}>
                                        <Play className="mr-2" />
                                        {gameState === 'start' ? '게임 시작' : '다시 시작'}
                                      </Button>
                                    </motion.div>
                                </AnimatePresence>
                            )}
                        </CardContent>
                    </Card>
                    <div className="w-full lg:max-w-sm flex flex-row lg:flex-col items-center justify-around gap-4 p-2 rounded-lg bg-muted/30">
                        {currentPieces.map((p, i) => <DraggablePiece key={i} piece={p} index={i} />)}
                    </div>
                </div>
            </div>
            
            {draggedPiece && (
                <div className="pointer-events-none fixed z-50" style={{ 
                    left: `${draggedPiece.x}px`,
                    top: `${draggedPiece.y}px`,
                    transform: 'translate(-50%, -50%)',
                }}>
                    <div className="flex flex-col items-center">
                        {draggedPiece.piece.shape.map((row, r) => (
                            <div key={r} className="flex">
                                {row.map((cell, c) => (
                                    <div key={c} className="w-8 h-8">
                                    {cell ? drawBlock(draggedPiece.piece.color) : null}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <AlertDialog open={gameState === 'over' && !isSubmitting}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2"><Trophy className="text-amber-500" />게임 오버!</AlertDialogTitle>
                  <AlertDialogDescription>최종 점수: <strong>{score}점</strong></AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={startGame}>다시하기</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isSubmitting}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2"><Loader2 className="animate-spin"/>점수 기록 중...</AlertDialogTitle>
                  <AlertDialogDescription>잠시만 기다려주세요.</AlertDialogDescription>
                </AlertDialogHeader>
              </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default BlockBlastGame;
