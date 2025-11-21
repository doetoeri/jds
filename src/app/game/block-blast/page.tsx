
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Blocks, Loader2, Play, Trophy, RefreshCw, Star } from 'lucide-react';
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
  '1x1': { shape: [[1]], color: 'bg-red-500' },
  '2x1': { shape: [[1, 1]], color: 'bg-orange-500' },
  '1x2': { shape: [[1], [1]], color: 'bg-orange-500' },
  '3x1': { shape: [[1, 1, 1]], color: 'bg-yellow-400' },
  '1x3': { shape: [[1], [1], [1]], color: 'bg-yellow-400' },
  '4x1': { shape: [[1, 1, 1, 1]], color: 'bg-cyan-400' },
  '1x4': { shape: [[1], [1], [1], [1]], color: 'bg-cyan-400' },
  '2x2': { shape: [[1, 1], [1, 1]], color: 'bg-lime-500' },
  'L-1': { shape: [[1, 0], [1, 0], [1, 1]], color: 'bg-blue-500' },
  'L-2': { shape: [[0, 1], [0, 1], [1, 1]], color: 'bg-blue-500' },
  'L-3': { shape: [[1, 1, 1], [1, 0, 0]], color: 'bg-blue-500' },
  'L-4': { shape: [[1, 1, 1], [0, 0, 1]], color: 'bg-blue-500' },
  'T': { shape: [[1, 1, 1], [0, 1, 0]], color: 'bg-purple-500' },
  'Z-1': { shape: [[1, 1, 0], [0, 1, 1]], color: 'bg-pink-500' },
  'Z-2': { shape: [[0, 1], [1, 1], [1, 0]], color: 'bg-pink-500' },
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
    
    const [draggedPieceIndex, setDraggedPieceIndex] = useState<number | null>(null);
    const [ghostGrid, setGhostGrid] = useState<Grid>(createEmptyGrid());
    const [isDragging, setIsDragging] = useState(false);
    const [clearingCells, setClearingCells] = useState<Set<string>>(new Set());

    const { toast } = useToast();
    const [user] = useAuthState(auth);

    function createEmptyGrid(): Grid {
        return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    }

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
        setIsDragging(false);
        setGhostGrid(createEmptyGrid());
        if (draggedPieceIndex === null) return;

        const piece = currentPieces[draggedPieceIndex];
        if (!piece || !canPlacePiece(piece, row, col, grid)) {
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

        const { clearedGrid, clearedLinesCount } = clearLines(newGrid);
        
        setTimeout(() => {
            setGrid(clearedGrid);
            setClearingCells(new Set());
            const comboScore = clearedLinesCount > 0 ? (10 * clearedLinesCount) * clearedLinesCount : 0;
            const newTotalScore = score + pieceScore + comboScore;
            setScore(newTotalScore);
            
            const newPieces = [...currentPieces];
            newPieces[draggedPieceIndex] = null;
            
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

    const handleDragStart = (e: React.DragEvent, index: number) => {
        if (!currentPieces[index]) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.effectAllowed = 'move';
        setDraggedPieceIndex(index);
        setIsDragging(true);
    };
    
    const handleCellDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const draggedPiece = draggedPieceIndex !== null ? currentPieces[draggedPieceIndex] : null;
        if (!draggedPiece) return;

        const cellElement = e.currentTarget;
        const gridElement = cellElement.parentElement;
        if (!gridElement) return;

        const rect = gridElement.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const col = Math.floor(x / cellElement.offsetWidth);
        const row = Math.floor(y / cellElement.offsetHeight);

        const newGhostGrid = createEmptyGrid();
        if (canPlacePiece(draggedPiece, row, col, grid)) {
            for (let r = 0; r < draggedPiece.shape.length; r++) {
                for (let c = 0; c < draggedPiece.shape[r].length; c++) {
                    if (draggedPiece.shape[r][c]) {
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

    const handleGridDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const draggedPiece = draggedPieceIndex !== null ? currentPieces[draggedPieceIndex] : null;
        if (!draggedPiece) return;
    
        const gridElement = e.currentTarget;
        const rect = gridElement.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const cellWidth = gridElement.offsetWidth / GRID_SIZE;
        const cellHeight = gridElement.offsetHeight / GRID_SIZE;
    
        const col = Math.floor(x / cellWidth);
        const row = Math.floor(y / cellHeight);

        handleDrop(row, col);
    };

    const DraggablePiece = ({ piece, index }: { piece: Piece | null, index: number }) => {
        if (!piece) return <div className="h-24 w-24" />;

        return (
            <div
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={() => {
                  setIsDragging(false);
                  setGhostGrid(createEmptyGrid());
                  setDraggedPieceIndex(null);
                }}
                className={cn(
                    "p-2 cursor-grab active:cursor-grabbing flex items-center justify-center touch-none",
                    isDragging && draggedPieceIndex === index && 'opacity-30'
                )}
            >
                <div className="flex flex-col items-center">
                    {piece.shape.map((row, r) => (
                        <div key={r} className="flex">
                            {row.map((cell, c) => (
                                <div key={c} className={cn("w-5 h-5 transition-transform duration-100", cell ? `${piece.color} border-black/20 border` : "")} />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
                <Blocks className="mr-2 h-7 w-7" /> Block Blast
            </h1>
            
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6">
                <Card className="w-full max-w-sm shadow-xl bg-muted/30">
                    <CardHeader className="flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2"><Star className="text-yellow-400 fill-yellow-400"/> {score}</CardTitle>
                        <Button variant="outline" size="icon" onClick={startGame}><RefreshCw className="h-4 w-4"/></Button>
                    </CardHeader>
                    <CardContent className="p-2 relative flex justify-center">
                        <div
                          className="grid bg-background/50 border border-secondary"
                          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
                          onDragOver={handleCellDragOver}
                          onDrop={handleGridDrop}
                        >
                            {grid.map((row, r) => row.map((cellColor, c) => (
                                <div
                                    key={`${r}-${c}`}
                                    className="w-10 h-10 border border-secondary/20 relative"
                                >
                                    <AnimatePresence>
                                    {cellColor && !clearingCells.has(`${r}-${c}`) && (
                                        <motion.div
                                            layoutId={`cell-${r}-${c}`}
                                            className={cn("w-full h-full shadow-inner", cellColor)}
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.2 } }}
                                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                        />
                                    )}
                                    </AnimatePresence>
                                     <div className={cn(
                                        "absolute inset-0 transition-colors",
                                        ghostGrid[r][c] === 'ghost' && 'bg-primary/20'
                                    )} />
                                </div>
                            )))}
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
                <div className="w-full max-w-sm lg:w-32 flex lg:flex-col items-center justify-around gap-4 p-2 rounded-lg bg-muted/30">
                    {currentPieces.map((p, i) => <DraggablePiece key={i} piece={p} index={i} />)}
                </div>
            </div>

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
        </div>
    );
};

export default BlockBlastGame;

