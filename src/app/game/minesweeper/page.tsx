
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bomb, Flag, Loader2, Award, Smile, Frown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, awardMinesweeperWin } from '@/lib/firebase';
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

const difficulties: Record<Difficulty, { rows: number; cols: number; mines: number; points: number }> = {
  easy: { rows: 9, cols: 9, mines: 10, points: 1 },
  medium: { rows: 16, cols: 16, mines: 40, points: 3 },
  hard: { rows: 16, cols: 30, mines: 99, points: 5 },
};

type Cell = {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
};

type Board = Cell[][];

const createEmptyBoard = (rows: number, cols: number): Board => {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacentMines: 0,
    }))
  );
};

export default function MinesweeperPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [board, setBoard] = useState<Board>(() => createEmptyBoard(9, 9));
  const [isFirstClick, setIsFirstClick] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [time, setTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  
  const { toast } = useToast();
  const [user] = useAuthState(auth);

  const restartGame = useCallback(() => {
    const { rows, cols } = difficulties[difficulty];
    setBoard(createEmptyBoard(rows, cols));
    setGameOver(false);
    setGameWon(false);
    setIsFirstClick(true);
    setTime(0);
    setTimerActive(false);
  }, [difficulty]);
  
  useEffect(restartGame, [difficulty]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive && !gameOver && !gameWon) {
      interval = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, gameOver, gameWon]);

  const handleWin = useCallback(async () => {
    setGameWon(true);
    setTimerActive(false);
    if (!user) return;

    setIsProcessing(true);
    const result = await awardMinesweeperWin(user.uid, difficulty);
    if (result.success) {
      toast({
        title: '승리!',
        description: result.message,
      });
    } else {
      toast({
        title: '보상 지급 실패',
        description: result.message,
        variant: 'destructive',
      });
    }
    setIsProcessing(false);
  }, [user, difficulty, toast]);

  useEffect(() => {
    if (gameOver || gameWon || isFirstClick) return;
    const { rows, cols, mines } = difficulties[difficulty];
    const nonMineCells = rows * cols - mines;
    const revealedCount = board.flat().filter(cell => cell.isRevealed).length;
    if (revealedCount === nonMineCells) {
      handleWin();
    }
  }, [board, difficulty, gameOver, gameWon, handleWin, isFirstClick]);

  const generateBoardWithMines = (firstClickRow: number, firstClickCol: number) => {
    const { rows, cols, mines } = difficulties[difficulty];
    const newBoard = createEmptyBoard(rows, cols);

    let minesPlaced = 0;
    while (minesPlaced < mines) {
      const row = Math.floor(Math.random() * rows);
      const col = Math.floor(Math.random() * cols);
      
      if (!newBoard[row][col].isMine && !(row === firstClickRow && col === firstClickCol)) {
        newBoard[row][col].isMine = true;
        minesPlaced++;
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (newBoard[r][c].isMine) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && newBoard[nr][nc].isMine) {
              count++;
            }
          }
        }
        newBoard[r][c].adjacentMines = count;
      }
    }
    return newBoard;
  };

  const revealCellRecursive = (r: number, c: number, boardToUpdate: Board) => {
    const { rows, cols } = difficulties[difficulty];
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    
    const cell = boardToUpdate[r][c];
    if (cell.isRevealed || cell.isFlagged || cell.isMine) return;

    cell.isRevealed = true;

    if (cell.adjacentMines === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          revealCellRecursive(r + dr, c + dc, boardToUpdate);
        }
      }
    }
  };
  
  const handleClick = (r: number, c: number) => {
    if (gameOver || gameWon || board[r][c].isRevealed || board[r][c].isFlagged) {
      return;
    }

    let currentBoard = board;
    if (isFirstClick) {
      currentBoard = generateBoardWithMines(r, c);
      setIsFirstClick(false);
      setTimerActive(true);
    }
    
    const newBoard = JSON.parse(JSON.stringify(currentBoard));
    const cell = newBoard[r][c];

    if (cell.isMine) {
      setGameOver(true);
      setTimerActive(false);
      newBoard.forEach((row: Cell[]) => row.forEach(c => {
        if(c.isMine) c.isRevealed = true;
      }));
      setBoard(newBoard);
      return;
    }
    
    revealCellRecursive(r, c, newBoard);
    setBoard(newBoard);
  };


  const toggleFlag = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (gameOver || gameWon || board[r][c].isRevealed || isFirstClick) return;
    const newBoard = JSON.parse(JSON.stringify(board));
    newBoard[r][c].isFlagged = !newBoard[r][c].isFlagged;
    setBoard(newBoard);
  };

  const { rows, cols, mines } = difficulties[difficulty];
  const remainingMines = mines - board.flat().filter(c => c.isFlagged).length;
  
  const GameStatusIcon = gameWon ? Smile : gameOver ? Frown : isProcessing ? Loader2 : Smile;

  return (
    <>
      <Card className="max-w-fit mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bomb />지뢰찾기</CardTitle>
          <CardDescription>지뢰를 모두 찾아내면 난이도에 따라 포인트를 드립니다! (하루 1회)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4 p-2 bg-muted rounded-lg">
            <div className="flex gap-2">
                <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)} disabled={timerActive && !gameOver && !gameWon}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="난이도" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">초급</SelectItem>
                    <SelectItem value="medium">중급</SelectItem>
                    <SelectItem value="hard">고급</SelectItem>
                  </SelectContent>
                </Select>
                 <Button onClick={restartGame} variant="outline">
                    재시작
                 </Button>
            </div>
            <div className="flex gap-4 text-lg font-mono font-bold">
                 <div className="flex items-center gap-2 bg-background px-3 py-1 rounded-md">
                    <Bomb className="text-red-500"/>
                    <span className="w-8">{String(remainingMines).padStart(3, '0')}</span>
                 </div>
                  <div className="flex items-center gap-2 bg-background px-3 py-1 rounded-md">
                    <GameStatusIcon className={cn("text-yellow-500", isProcessing && "animate-spin")} />
                    <span className="w-8">{String(time).padStart(3, '0')}</span>
                  </div>
            </div>
          </div>

          <div
            className="grid bg-muted/50 p-1 border rounded-md"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              width: `${cols * 28}px`,
            }}
          >
            {board.map((row, r) =>
              row.map((cell, c) => (
                <button
                  key={`${r}-${c}`}
                  disabled={gameOver || gameWon}
                  onClick={() => handleClick(r, c)}
                  onContextMenu={(e) => toggleFlag(e, r, c)}
                  className={cn(
                    'h-7 w-7 flex items-center justify-center font-bold text-sm border',
                    !cell.isRevealed ? 'bg-background border-muted hover:bg-accent' : 'bg-muted/30 border-muted',
                    cell.isRevealed && cell.isMine && 'bg-red-500'
                  )}
                >
                  {cell.isRevealed ? (
                    cell.isMine ? (
                      <Bomb className="h-4 w-4 text-white" />
                    ) : cell.adjacentMines > 0 ? (
                      <span className={cn(
                          'font-mono',
                          {
                              'text-blue-600': cell.adjacentMines === 1,
                              'text-green-600': cell.adjacentMines === 2,
                              'text-red-600': cell.adjacentMines === 3,
                              'text-purple-600': cell.adjacentMines === 4,
                              'text-orange-600': cell.adjacentMines === 5,
                          }
                      )}>
                          {cell.adjacentMines}
                      </span>
                    ) : (
                      ''
                    )
                  ) : cell.isFlagged ? (
                    <Flag className="h-4 w-4 text-primary" />
                  ) : (
                    ''
                  )}
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      
       <AlertDialog open={gameWon && !isProcessing}>
          <AlertDialogContent>
             <AlertDialogHeader>
               <AlertDialogTitle className="flex items-center gap-2"><Award className="text-amber-500"/>승리!</AlertDialogTitle>
                <AlertDialogDescription>
                    축하합니다! 지뢰를 모두 찾았습니다.
                    <br/>
                    획득한 포인트: <strong>{difficulties[difficulty].points} 포인트</strong>
                </AlertDialogDescription>
             </AlertDialogHeader>
             <AlertDialogFooter>
                <AlertDialogAction onClick={restartGame}>다시하기</AlertDialogAction>
             </AlertDialogFooter>
          </AlertDialogContent>
       </AlertDialog>
    </>
  );
}
