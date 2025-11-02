
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrainCircuit, Loader2, Play, Smile, Trophy, Users, Award, Crown, Check, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, awardSudokuWin } from '@/lib/firebase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type Difficulty = 'easy' | 'medium' | 'hard';
const difficulties: Record<Difficulty, { blanks: number; points: number }> = {
  easy: { blanks: 30, points: 1 },
  medium: { blanks: 40, points: 2 },
  hard: { blanks: 50, points: 3 },
};

type Board = (number | null)[][];
type Puzzle = { board: Board, solution: Board };

// --- Sudoku Generation (Simplified) ---
function generateSudoku(): Puzzle {
  const base = [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9],
  ];

  // Randomize for variety - very basic shuffle
  for (let i = 0; i < 20; i++) {
    const r1 = Math.floor(Math.random() * 9);
    const r2 = Math.floor(Math.random() * 9);
    const temp = base[r1];
    base[r1] = base[r2];
    base[r2] = temp;
  }
  const solution: Board = JSON.parse(JSON.stringify(base));
  return { board: base, solution };
}

function createPuzzle(difficulty: Difficulty): Puzzle {
  const { board, solution } = generateSudoku();
  const puzzle: Board = JSON.parse(JSON.stringify(board));
  const { blanks } = difficulties[difficulty];
  let removed = 0;
  while (removed < blanks) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    if (puzzle[row][col] !== null) {
      puzzle[row][col] = null;
      removed++;
    }
  }
  return { board: puzzle, solution };
}

export default function SudokuPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'won'>('start');
  const [isProcessing, setIsProcessing] = useState(false);

  const [user] = useAuthState(auth);
  const { toast } = useToast();

  const startGame = useCallback(() => {
    const newPuzzle = createPuzzle(difficulty);
    setPuzzle(newPuzzle);
    setBoard(JSON.parse(JSON.stringify(newPuzzle.board))); // Deep copy
    setSelectedCell(null);
    setGameState('playing');
  }, [difficulty]);

  useEffect(() => {
    startGame();
  }, [startGame]);
  
  const checkWin = useCallback(() => {
    if (!board || !puzzle) return false;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] !== puzzle.solution[r][c]) {
          return false;
        }
      }
    }
    return true;
  }, [board, puzzle]);


  useEffect(() => {
    if (gameState === 'playing' && checkWin()) {
      setGameState('won');
      if (user) {
          setIsProcessing(true);
          awardSudokuWin(user.uid, difficulty)
              .then(result => {
                  toast({
                      title: '스도쿠 완료!',
                      description: result.message,
                  });
              })
              .catch(error => {
                  toast({
                      title: '오류',
                      description: error.message,
                      variant: 'destructive'
                  });
              })
              .finally(() => setIsProcessing(false));
      }
    }
  }, [board, checkWin, gameState, user, difficulty, toast]);

  const handleCellClick = (row: number, col: number) => {
    if (puzzle && puzzle.board[row][col] !== null) {
      // It's a pre-filled cell, do nothing
      return;
    }
    setSelectedCell({ row, col });
  };

  const handleNumberInput = (num: number) => {
    if (!selectedCell || !board) return;
    const { row, col } = selectedCell;
    const newBoard: Board = JSON.parse(JSON.stringify(board));
    newBoard[row][col] = num;
    setBoard(newBoard);
  };
  
  const isCellInvalid = (row: number, col: number): boolean => {
    if(!board || !puzzle) return false;
    const value = board[row][col];
    if(value === null) return false;
    return value !== puzzle.solution[row][col];
  }

  const boardGrid = useMemo(() => {
    if (!board) return null;
    return board.map((row, r) => (
      row.map((cellValue, c) => {
        const isPreFilled = puzzle?.board[r][c] !== null;
        const isSelected = selectedCell?.row === r && selectedCell?.col === c;
        const isRelated = selectedCell !== null && (selectedCell.row === r || selectedCell.col === c || (Math.floor(selectedCell.row / 3) === Math.floor(r / 3) && Math.floor(selectedCell.col / 3) === Math.floor(c / 3)));
        const isInvalid = isCellInvalid(r, c);

        return (
          <div
            key={`${r}-${c}`}
            onClick={() => handleCellClick(r, c)}
            className={cn(
              'flex items-center justify-center aspect-square border-secondary text-2xl font-mono cursor-pointer transition-colors',
              'border-r border-b',
              (c + 1) % 3 === 0 && c < 8 && 'border-r-primary/50 border-r-2',
              (r + 1) % 3 === 0 && r < 8 && 'border-b-primary/50 border-b-2',
              c === 0 && 'border-l-2 border-l-primary/50',
              r === 0 && 'border-t-2 border-t-primary/50',
              isPreFilled ? 'bg-muted/30 text-foreground' : 'text-primary',
              isRelated && !isSelected && 'bg-primary/5',
              isSelected && 'bg-primary/20 ring-2 ring-primary',
              isInvalid && !isPreFilled && 'bg-destructive/20 text-destructive-foreground animate-pulse'
            )}
          >
            {cellValue}
          </div>
        );
      })
    ));
  }, [board, selectedCell, puzzle]);


  return (
    <>
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
          <BrainCircuit className="mr-2 h-7 w-7" />
          스도쿠
        </h1>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="grid grid-cols-9 w-full max-w-lg shadow-lg">
              {boardGrid}
            </div>
            
            <div className="flex-shrink-0 w-full lg:w-48 space-y-4">
               <Card>
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">난이도</CardTitle>
                </CardHeader>
                 <CardContent className="p-3 pt-0">
                  <Select value={difficulty} onValueChange={(v) => { setDifficulty(v as Difficulty); startGame(); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">쉬움</SelectItem>
                      <SelectItem value="medium">보통</SelectItem>
                      <SelectItem value="hard">어려움</SelectItem>
                    </SelectContent>
                  </Select>
                 </CardContent>
               </Card>
              
               <Card>
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">숫자</CardTitle>
                </CardHeader>
                 <CardContent className="p-3 pt-0">
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 9 }, (_, i) => i + 1).map(num => (
                      <Button key={num} variant="outline" size="icon" onClick={() => handleNumberInput(num)}>
                        {num}
                      </Button>
                    ))}
                    <Button variant="destructive" size="icon" onClick={() => handleNumberInput(0)}>
                        X
                    </Button>
                  </div>
                 </CardContent>
               </Card>

              <Button onClick={startGame} className="w-full">
                새 게임
              </Button>
            </div>
        </div>
      </div>

       <AlertDialog open={gameState === 'won'}>
          <AlertDialogContent>
             <AlertDialogHeader>
               <AlertDialogTitle className="flex items-center gap-2"><Trophy className="text-amber-500"/>승리!</AlertDialogTitle>
                <AlertDialogDescription>
                    축하합니다! 스도쿠 퍼즐을 완성했습니다.
                    <br/>
                    획득 포인트: <strong>{difficulties[difficulty].points}포인트</strong>
                </AlertDialogDescription>
             </AlertDialogHeader>
             <AlertDialogFooter>
                <AlertDialogAction onClick={startGame}>새 게임 시작</AlertDialogAction>
             </AlertDialogFooter>
          </AlertDialogContent>
       </AlertDialog>
    </>
  );
}
