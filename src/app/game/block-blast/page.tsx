

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
  '1x1': { shape: [[1]], color: 'hsl(0, 72%, 50%)' },
  '2x1': { shape: [[1, 1]], color: 'hsl(25, 84%, 50%)' },
  '1x2': { shape: [[1], [1]], color: 'hsl(25, 84%, 50%)' },
  '3x1': { shape: [[1, 1, 1]], color: 'hsl(45, 93%, 47%)' },
  '1x3': { shape: [[1], [1], [1]], color: 'hsl(45, 93%, 47%)' },
  '2x2': { shape: [[1, 1], [1, 1]], color: 'hsl(100, 78%, 45%)' },
  'L-1': { shape: [[1, 0], [1, 0], [1, 1]], color: 'hsl(210, 89%, 56%)' },
  'L-2': { shape: [[0, 1], [0, 1], [1, 1]], color: 'hsl(210, 89%, 56%)' },
  'L-3': { shape: [[1, 1, 1], [1, 0, 0]], color: 'hsl(210, 89%, 56%)' },
  'L-4': { shape: [[1, 1, 1], [0, 0, 1]], color: 'hsl(210, 89%, 56%)' },
  'T': { shape: [[1, 1, 1], [0, 1, 0]], color: 'hsl(260, 84%, 60%)' },
  'Z-1': { shape: [[1, 1, 0], [0, 1, 1]], color: 'hsl(330, 74%, 55%)' },
  'Z-2': { shape: [[0, 1], [1, 1], [1, 0]], color: 'hsl(330, 74%, 55%)' },
};

type ShapeKey = keyof typeof SHAPES;
type Grid = (string | null)[][];
type Piece = { key: ShapeKey; shape: number[][]; color: string };
type GameStatus = 'start' | 'playing' | 'over';

// --- React Component ---
const BlockBlastGame: React.FC = () => {
    const [grid, setGrid] = useState<Grid>(() => createEmptyGrid());
    const [currentPieces, setCurrentPieces] = useState<(Piece | null)[]>([]);
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState<GameStatus>('start');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [clearingCells, setClearingCells] = useState<Set<string>>(new Set());

    const [dragState, setDragState] = useState<{ piece: Piece; index: number; element: HTMLElement } | null>(null);
    const [ghostPosition, setGhostPosition] = useState<{row: number, col: number} | null>(null);
    
    const floatingPieceRef = useRef<HTMLDivElement>(null);
    
    const { toast } = useToast();
    const [user] = useAuthState(auth);
    const gridRef = useRef<HTMLDivElement>(null);


    // --- Game Logic ---

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
                toast({ 
                    title: result.success ? '점수 기록 완료!' : '점수 기록 실패',
                    description: result.message,
                    variant: result.success ? 'default' : 'destructive',
                });
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

    // --- Drag and Drop Handlers ---

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, index: number) => {
        const piece = currentPieces[index];
        if (!piece || gameState !== 'playing') return;
        
        const target = e.target as HTMLElement;
        target.setPointerCapture(e.pointerId);

        setDragState({ piece, index, element: target });
        
        if (floatingPieceRef.current) {
            floatingPieceRef.current.style.display = 'block';
            floatingPieceRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
        }
    };
    
    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragState) return;

        if (floatingPieceRef.current) {
            floatingPieceRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
        }

        const gridEl = gridRef.current;
        if (!gridEl) {
            setGhostPosition(null);
            return;
        }
        
        const gridRect = gridEl.getBoundingClientRect();
        const cellWidth = gridRect.width / GRID_SIZE;
        const offsetX = e.clientX - gridRect.left;
        const offsetY = e.clientY - gridRect.top;
        
        const piece = dragState.piece;
        const row = Math.round(offsetY / cellWidth - piece.shape.length / 2);
        const col = Math.round(offsetX / cellWidth - piece.shape[0].length / 2);
        
        if (canPlacePiece(piece, row, col, grid)) {
            setGhostPosition({ row, col });
        } else {
            setGhostPosition(null);
        }
    };
    
    const handlePointerUp = (e: React.PointerEvent) => {
        if (!dragState) return;

        if (floatingPieceRef.current) {
            floatingPieceRef.current.style.display = 'none';
        }

        if (ghostPosition) {
            const { piece, index } = dragState;
            const { row, col } = ghostPosition;
            
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
            setGrid(newGrid);

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
            }, 300);
        }

        setDragState(null);
        setGhostPosition(null);
    };

    const TetrisBlock = ({ color }: { color: string }) => {
        return (
            <div className="w-full h-full p-0.5">
                <div className="w-full h-full rounded-sm"
                    style={{ 
                        backgroundColor: color,
                        boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.4), inset -1px -1px 2px rgba(0,0,0,0.3)',
                    }}
                />
            </div>
        )
    }
    
    // --- Rendering ---
    
    const renderPiece = (piece: Piece, cellSize: number) => {
        return (
            <div className="flex flex-col items-center justify-center p-1">
                {piece.shape.map((row, r) => (
                    <div key={r} className="flex" style={{ height: cellSize }}>
                        {row.map((cell, c) => (
                            <div key={c} style={{ width: cellSize, height: cellSize }}>
                               {cell ? <TetrisBlock color={piece.color} /> : null}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        );
    }
    
    return (
        <>
            <div className="flex flex-col items-center gap-4 w-full" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
                    <Blocks className="mr-2 h-7 w-7" /> Block Blast
                </h1>
                
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 w-full">
                    <Card className="w-full max-w-sm lg:max-w-md shadow-xl bg-muted/30">
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2"><Star className="text-yellow-400 fill-yellow-400"/> {score}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 relative flex justify-center">
                            <div
                                ref={gridRef}
                                className="grid bg-background/50 border-2 border-primary/20 rounded-md"
                                style={{ 
                                    gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                                    width: `min(calc(100vw - 4rem), 400px)`,
                                    aspectRatio: '1 / 1'
                                }}
                            >
                                {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                                    const r = Math.floor(i / GRID_SIZE);
                                    const c = i % GRID_SIZE;
                                    const cellColor = grid[r][c];
                                    const isGhost = ghostPosition && dragState?.piece.shape.some((pr, pri) => pr.some((pc, pci) => pc && ghostPosition.row + pri === r && ghostPosition.col + pci === c));
                                    const isClearing = clearingCells.has(`${r}-${c}`);

                                    return (
                                        <div key={i} className="border border-primary/10 relative">
                                            <AnimatePresence>
                                                {isClearing && cellColor ? (
                                                     <motion.div
                                                        key={`clear-${r}-${c}`}
                                                        layout
                                                        initial={{ scale: 1, opacity: 1 }}
                                                        animate={{ scale: 0, opacity: 0 }}
                                                        exit={{ scale: 0, opacity: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="w-full h-full"
                                                    >
                                                        <TetrisBlock color={cellColor} />
                                                    </motion.div>
                                                ) : cellColor ? (
                                                    <motion.div
                                                        key={`cell-${r}-${c}`}
                                                        layout
                                                        initial={{ scale: 0.5, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                                        className="w-full h-full"
                                                    >
                                                      <TetrisBlock color={cellColor} />
                                                    </motion.div>
                                                ) : isGhost ? (
                                                     <div className="w-full h-full rounded-sm bg-primary/20" />
                                                ) : null}
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
                        {currentPieces.map((p, i) => (
                           <div
                             key={i}
                             onPointerDown={e => handlePointerDown(e, i)}
                             className={cn("touch-none", p ? 'cursor-grab' : 'opacity-0 pointer-events-none', dragState?.index === i && 'opacity-0')}
                           >
                            {p && renderPiece(p, 24)}
                           </div>
                        ))}
                    </div>
                </div>
                 {dragState && (
                    <div
                        ref={floatingPieceRef}
                        className="fixed top-0 left-0 pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2"
                        style={{display: 'none'}}
                    >
                        {renderPiece(dragState.piece, 24)}
                    </div>
                 )}
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
        </>
    );
};

export default BlockBlastGame;
