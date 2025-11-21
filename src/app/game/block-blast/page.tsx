'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Blocks, Loader2, Play, Trophy, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, awardBlockBlastScore } from '@/lib/firebase';
import { motion } from 'framer-motion';
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
const BLOCK_SIZE = 40;

const SHAPES = {
  // 1x1
  '1x1': { shape: [[1]], color: '#f87171' }, // red
  // 2x1
  '2x1': { shape: [[1, 1]], color: '#fb923c' }, // orange
  '1x2': { shape: [[1], [1]], color: '#fb923c' },
  // 3x1
  '3x1': { shape: [[1, 1, 1]], color: '#facc15' }, // yellow
  '1x3': { shape: [[1], [1], [1]], color: '#facc15' },
  // 4x1
  '4x1': { shape: [[1, 1, 1, 1]], color: '#a3e635' }, // lime
  '1x4': { shape: [[1], [1], [1], [1]], color: '#a3e635' },
   // 5x1
  '5x1': { shape: [[1, 1, 1, 1, 1]], color: '#4ade80' }, // green
  '1x5': { shape: [[1], [1], [1], [1], [1]], color: '#4ade80' },
  // 2x2
  '2x2': { shape: [[1, 1], [1, 1]], color: '#38bdf8' }, // sky
  // 3x3
  '3x3': { shape: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: '#818cf8' }, // indigo
  // L-shapes (2x2)
  'L2-1': { shape: [[1, 0], [1, 1]], color: '#a78bfa' }, // violet
  'L2-2': { shape: [[0, 1], [1, 1]], color: '#a78bfa' },
  'L2-3': { shape: [[1, 1], [1, 0]], color: '#a78bfa' },
  'L2-4': { shape: [[1, 1], [0, 1]], color: '#a78bfa' },
  // L-shapes (3x3)
  'L3-1': { shape: [[1, 0, 0], [1, 0, 0], [1, 1, 1]], color: '#e879f9' }, // fuchsia
  'L3-2': { shape: [[0, 0, 1], [0, 0, 1], [1, 1, 1]], color: '#e879f9' },
  'L3-3': { shape: [[1, 1, 1], [1, 0, 0], [1, 0, 0]], color: '#e879f9' },
  'L3-4': { shape: [[1, 1, 1], [0, 0, 1], [0, 0, 1]], color: '#e879f9' },
};
type ShapeKey = keyof typeof SHAPES;
type Grid = (string | null)[][];
type Piece = { key: ShapeKey; shape: number[][]; color: string };
type GameStatus = 'start' | 'playing' | 'over';


const BlockBlastGame: React.FC = () => {
    const [grid, setGrid] = useState<Grid>(createEmptyGrid());
    const [currentPieces, setCurrentPieces] = useState<Piece[]>([]);
    const [selectedPieceIndex, setSelectedPieceIndex] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState<GameStatus>('start');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const { toast } = useToast();
    const [user] = useAuthState(auth);

    function createEmptyGrid(): Grid {
        return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    }

    const getRandomPieces = useCallback((): Piece[] => {
        const keys = Object.keys(SHAPES) as ShapeKey[];
        const newPieces: Piece[] = [];
        for (let i = 0; i < 3; i++) {
            const randomKey = keys[Math.floor(Math.random() * keys.length)];
            newPieces.push({ key: randomKey, ...SHAPES[randomKey] });
        }
        return newPieces;
    }, []);

    const startGame = useCallback(() => {
        setGrid(createEmptyGrid());
        setCurrentPieces(getRandomPieces());
        setScore(0);
        setSelectedPieceIndex(null);
        setGameState('playing');
    }, [getRandomPieces]);
    
    const canPlacePiece = (piece: Piece, row: number, col: number, currentGrid: Grid): boolean => {
        for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
                if (piece.shape[r][c]) {
                    const newRow = row + r;
                    const newCol = col + c;
                    if (newRow >= GRID_SIZE || newCol >= GRID_SIZE || currentGrid[newRow][newCol]) {
                        return false;
                    }
                }
            }
        }
        return true;
    };
    
    const isGameOver = useCallback((pieces: Piece[], currentGrid: Grid): boolean => {
        for (const piece of pieces) {
            if (!piece) continue;
            for (let r = 0; r <= GRID_SIZE - piece.shape.length; r++) {
                for (let c = 0; c <= GRID_SIZE - piece.shape[0].length; c++) {
                    if (canPlacePiece(piece, r, c, currentGrid)) {
                        return false; // Found a valid move
                    }
                }
            }
        }
        return true;
    }, []);

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

    const placePiece = (row: number, col: number) => {
        if (selectedPieceIndex === null) return;
        
        const piece = currentPieces[selectedPieceIndex];
        if (!piece || !canPlacePiece(piece, row, col, grid)) {
            return;
        }

        const newGrid = grid.map(r => [...r]);
        let pieceScore = 0;
        for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
                if (piece.shape[r][c]) {
                    newGrid[row + r][col + c] = piece.color;
                    pieceScore++;
                }
            }
        }

        const { clearedGrid, clearedLinesCount } = clearLines(newGrid);
        
        let comboScore = 0;
        if (clearedLinesCount > 0) {
            comboScore = (clearedLinesCount * 10) * clearedLinesCount; // Combo bonus
        }
        setScore(s => s + pieceScore + comboScore);
        
        const newPieces = [...currentPieces];
        newPieces[selectedPieceIndex] = null as any; // Mark as used
        setSelectedPieceIndex(null);
        
        if (newPieces.every(p => p === null)) {
            const nextPieces = getRandomPieces();
            setCurrentPieces(nextPieces);
            if (isGameOver(nextPieces, clearedGrid)) {
                handleGameOver(score + pieceScore + comboScore);
            }
        } else {
            setCurrentPieces(newPieces);
            if (isGameOver(newPieces.filter(p => p !== null), clearedGrid)) {
                handleGameOver(score + pieceScore + comboScore);
            }
        }
        setGrid(clearedGrid);
    };

    const clearLines = (currentGrid: Grid) => {
        const rowsToClear = new Set<number>();
        const colsToClear = new Set<number>();

        for (let r = 0; r < GRID_SIZE; r++) {
            if (currentGrid[r].every(cell => cell !== null)) {
                rowsToClear.add(r);
            }
        }
        for (let c = 0; c < GRID_SIZE; c++) {
            if (currentGrid.every(row => row[c] !== null)) {
                colsToClear.add(c);
            }
        }
        
        if (rowsToClear.size === 0 && colsToClear.size === 0) {
            return { clearedGrid: currentGrid, clearedLinesCount: 0 };
        }

        const clearedGrid = createEmptyGrid();
        for(let r=0; r<GRID_SIZE; r++){
            for(let c=0; c<GRID_SIZE; c++){
                if(!rowsToClear.has(r) && !colsToClear.has(c)){
                    clearedGrid[r][c] = currentGrid[r][c];
                }
            }
        }
        
        return { clearedGrid, clearedLinesCount: rowsToClear.size + colsToClear.size };
    };

    const BoardGrid = useMemo(() => (
      <div className="grid" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
        {grid.map((row, r) =>
          row.map((cellColor, c) => (
            <div
              key={`${r}-${c}`}
              className="aspect-square border border-secondary"
              style={{ backgroundColor: cellColor || 'transparent', width: BLOCK_SIZE, height: BLOCK_SIZE }}
              onClick={() => placePiece(r, c)}
            />
          ))
        )}
      </div>
    ), [grid, selectedPieceIndex, currentPieces]);

    return (
        <>
            <div className="flex flex-col items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
                    <Blocks className="mr-2 h-7 w-7" /> Block Blast
                </h1>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                    블록을 배치하여 가로나 세로줄을 채워 점수를 얻으세요. 한 번에 여러 줄을 없애면 콤보 보너스를 받습니다!
                </p>
                <div className="flex flex-col lg:flex-row items-start gap-4">
                    <Card className="w-full max-w-sm shadow-lg">
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle>Score: {score}</CardTitle>
                             <Button variant="outline" size="icon" onClick={startGame}>
                                <RefreshCw className="h-4 w-4"/>
                            </Button>
                        </CardHeader>
                        <CardContent className="p-2 relative">
                            {BoardGrid}
                             {gameState !== 'playing' && (
                                <motion.div
                                  className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white p-4 rounded-lg"
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
                                  <Button size="lg" onClick={startGame}>
                                    <Play className="mr-2" />
                                    {gameState === 'start' ? '게임 시작' : '다시 시작'}
                                  </Button>
                                </motion.div>
                            )}
                        </CardContent>
                    </Card>
                    <Card className="w-full max-w-sm lg:w-48">
                        <CardHeader>
                            <CardTitle>Pieces</CardTitle>
                        </CardHeader>
                        <CardContent className="flex lg:flex-col items-center justify-center gap-4">
                            {currentPieces.map((piece, index) => (
                                <div key={index}
                                    onClick={() => piece && setSelectedPieceIndex(index)}
                                    className={cn("p-2 rounded-lg cursor-pointer", selectedPieceIndex === index && 'bg-primary/20 ring-2 ring-primary')}
                                >
                                    {piece ? (
                                        <div>
                                            {piece.shape.map((row, r) => (
                                                <div key={r} className="flex">
                                                    {row.map((cell, c) => (
                                                        <div key={c}
                                                            className="w-4 h-4"
                                                            style={{ backgroundColor: cell ? piece.color : 'transparent' }}
                                                        />
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    ) : <div className="h-[56px] w-[56px]" />}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
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
                  <AlertDialogAction onClick={startGame}>다시하기</AlertDialogAction>
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

export default BlockBlastGame;
