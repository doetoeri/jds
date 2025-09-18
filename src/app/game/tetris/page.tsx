'use client';

import { useEffect, useRef, useReducer, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Gamepad2, Loader2, RotateCw, ArrowLeft, ArrowRight, ArrowDown, ChevronsDown } from 'lucide-react';
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
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 24;
const BLOCK_RADIUS = 4;

const COLORS = [
    null,
    '#fdba74', // I - orange-300
    '#93c5fd', // J - blue-300
    '#fca5a5', // L - red-300
    '#fde047', // O - yellow-300
    '#a7f3d0', // S - emerald-200
    '#d8b4fe', // T - purple-300
    '#86efac', // Z - green-300
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

type GameState = {
  board: number[][];
  piece: { shape: number[][]; value: number; x: number; y: number; } | null;
  nextPieceShape: number[][];
  score: number;
  lines: number;
  level: number;
  status: 'start' | 'playing' | 'over';
  isSubmitting: boolean;
};

type Action =
  | { type: 'START' }
  | { type: 'GAME_OVER' }
  | { type: 'MOVE'; payload: { dx: number; dy: number } }
  | { type: 'HARD_DROP' }
  | { type: 'ROTATE' }
  | { type: 'TICK' }
  | { type: 'SUBMIT_SCORE'; payload: boolean };

function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randomPieceShape() {
  const rand = Math.floor(Math.random() * (SHAPES.length - 1)) + 1;
  return SHAPES[rand];
}

const initialState: GameState = {
  board: createEmptyBoard(),
  piece: null,
  nextPieceShape: randomPieceShape(),
  score: 0,
  lines: 0,
  level: 0,
  status: 'start',
  isSubmitting: false,
};

function checkCollision(board: number[][], piece: { shape: number[][]; x: number; y: number; }): boolean {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (
                piece.shape[y][x] !== 0 &&
                (
                    (board[piece.y + y] && board[piece.y + y][piece.x + x]) !== 0 ||
                    !board[piece.y + y] ||
                    board[piece.y + y][piece.x + x] === undefined
                )
            ) {
                return true;
            }
        }
    }
    return false;
}

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START': {
      const nextPieceShape = randomPieceShape();
      const pieceShape = state.nextPieceShape;
      const piece = {
        shape: pieceShape,
        value: SHAPES.findIndex(s => s === pieceShape),
        x: Math.floor(COLS / 2) - Math.floor(pieceShape[0].length / 2),
        y: 0,
      };
      return {
        ...initialState,
        status: 'playing',
        board: createEmptyBoard(),
        piece,
        nextPieceShape,
      };
    }
    case 'GAME_OVER':
      return { ...state, status: 'over' };
    case 'SUBMIT_SCORE':
        return {...state, isSubmitting: action.payload };
    case 'MOVE': {
      if (!state.piece || state.status !== 'playing') return state;
      const newPiece = { ...state.piece, x: state.piece.x + action.payload.dx, y: state.piece.y + action.payload.dy };
      if (checkCollision(state.board, newPiece)) {
        if(action.payload.dy > 0) { // Moving down and collided
            const newBoard = JSON.parse(JSON.stringify(state.board));
             state.piece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        newBoard[state.piece!.y + y][state.piece!.x + x] = state.piece!.value;
                    }
                });
            });

            // Clear lines
            let linesCleared = 0;
            for (let y = newBoard.length - 1; y >= 0; ) {
              if (newBoard[y].every(cell => cell !== 0)) {
                newBoard.splice(y, 1);
                newBoard.unshift(Array(COLS).fill(0));
                linesCleared++;
              } else {
                y--;
              }
            }

            const newLines = state.lines + linesCleared;
            const newLevel = Math.floor(newLines / 10);
            
            const pieceShape = state.nextPieceShape;
            const nextPiece = {
                shape: pieceShape,
                value: SHAPES.findIndex(s => s === pieceShape),
                x: Math.floor(COLS / 2) - Math.floor(pieceShape[0].length / 2),
                y: 0,
            };

            if(checkCollision(newBoard, nextPiece)) {
                return {...state, status: 'over', board: newBoard, piece: null};
            }

            return {
                ...state,
                board: newBoard,
                piece: nextPiece,
                nextPieceShape: randomPieceShape(),
                score: state.score + [0, 100, 300, 500, 800][linesCleared] * (state.level + 1),
                lines: newLines,
                level: newLevel,
            }
        }
        return state;
      }
      return { ...state, piece: newPiece };
    }
     case 'HARD_DROP': {
      if (!state.piece || state.status !== 'playing') return state;
      let newPiece = { ...state.piece };
      while (!checkCollision(state.board, newPiece)) {
        newPiece.y++;
      }
      newPiece.y--;
      return { ...state, piece: newPiece };
    }
    case 'ROTATE': {
      if (!state.piece || state.status !== 'playing') return state;

      const shape = state.piece.shape;
      const newShape = shape[0].map((_, colIndex) => shape.map(row => row[colIndex]).reverse());
      
      let newPiece = { ...state.piece, shape: newShape };
      
      // Wall kick
      let offset = 1;
      while (checkCollision(state.board, newPiece)) {
          newPiece.x += offset;
          offset = -(offset + (offset > 0 ? 1 : -1));
          if (Math.abs(offset) > newPiece.shape[0].length + 1) { // More robust kick check
              return state; // Can't rotate
          }
      }

      return { ...state, piece: newPiece };
    }
    case 'TICK':
        return gameReducer(state, {type: 'MOVE', payload: {dx: 0, dy: 1}});
    default:
      return state;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}


export default function TetrisPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { status, score, lines, level, board, piece, nextPieceShape, isSubmitting } = state;
  const gameLoopRef = useRef<number>();
  const { toast } = useToast();
  const [user] = useAuthState(auth);

  const draw = useCallback(() => {
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    context.fillStyle = 'hsl(var(--background))';
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);

    board.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          context.fillStyle = COLORS[value]!;
          context.globalAlpha = 0.5;
          roundRect(context, x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE, BLOCK_RADIUS);
          context.fill();
          context.globalAlpha = 1;
          context.fillStyle = COLORS[value]!;
          roundRect(context, x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2, BLOCK_RADIUS-1);
          context.fill();
        }
      });
    });

    if (piece) {
      context.fillStyle = COLORS[piece.value]!;
      piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            roundRect(context, (piece.x + x) * BLOCK_SIZE, (piece.y + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE, BLOCK_RADIUS);
            context.fill();
          }
        });
      });
    }
  }, [board, piece]);

  const submitScore = useCallback(async () => {
    if (user && score > 0) {
      dispatch({ type: 'SUBMIT_SCORE', payload: true });
      try {
        await awardTetrisScore(user.uid, score);
        toast({ title: "게임 종료!", description: `최종 점수 ${score}점이 기록되었습니다.` });
      } catch (error: any) {
        toast({ title: "오류", description: error.message || '점수 기록 중 오류 발생', variant: 'destructive' });
      } finally {
        dispatch({ type: 'SUBMIT_SCORE', payload: false });
      }
    }
  }, [user, score, toast]);

  useEffect(() => {
    if (status === 'over' && score > 0) {
      submitScore();
    }
  }, [status, submitScore, score]);
  
  useEffect(() => {
    draw();
  }, [draw, state]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== 'playing') return;
      
      let handled = false;
      switch (e.key) {
        case 'ArrowLeft': dispatch({ type: 'MOVE', payload: { dx: -1, dy: 0 } }); handled = true; break;
        case 'ArrowRight': dispatch({ type: 'MOVE', payload: { dx: 1, dy: 0 } }); handled = true; break;
        case 'ArrowDown': dispatch({ type: 'MOVE', payload: { dx: 0, dy: 1 } }); handled = true; break;
        case 'ArrowUp': dispatch({ type: 'ROTATE' }); handled = true; break;
        case ' ': dispatch({ type: 'HARD_DROP' }); dispatch({ type: 'TICK' }); handled = true; break;
      }

      if(handled) e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status]);
  
  useEffect(() => {
    if (status !== 'playing') {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      return;
    }
    
    let dropCounter = 0;
    let lastTime = 0;
    const dropInterval = 1000 * Math.pow(0.8, level);
    
    const gameLoop = (time: number) => {
      if(lastTime === 0) lastTime = time;
      const deltaTime = time - lastTime;
      dropCounter += deltaTime;
      if (dropCounter > dropInterval) {
        dispatch({type: 'TICK'});
        dropCounter = 0;
      }
      lastTime = time;
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [status, level]);

  const handleMobileControl = (action: Action) => {
      if(status === 'playing') {
          dispatch(action);
          if(action.type === 'HARD_DROP') {
              dispatch({type: 'TICK'});
          }
      }
  }

  return (
    <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
            <Gamepad2 className="mr-2 h-6 w-6"/>테트리스
        </h1>
        <Card className="flex flex-col">
             <CardContent className="p-2">
            <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-4">
               
                 <div className="relative border-4 border-primary rounded-lg overflow-hidden shadow-lg">
                    <canvas ref={canvasRef} width={COLS * BLOCK_SIZE} height={ROWS * BLOCK_SIZE} />
                    {status !== 'playing' && (
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                            <h2 className="text-4xl font-bold font-headline mb-4">테트리스</h2>
                            <Button size="lg" onClick={() => dispatch({ type: 'START' })}>
                                게임 시작
                            </Button>
                        </div>
                    )}
                </div>

                <div className="w-full sm:w-40 space-y-3">
                    <Card>
                        <CardHeader className="p-3"><CardTitle className="text-sm">점수</CardTitle></CardHeader>
                        <CardContent className="p-3 pt-0 text-xl font-bold font-mono">{score}</CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="p-3"><CardTitle className="text-sm">줄</CardTitle></CardHeader>
                        <CardContent className="p-3 pt-0 text-xl font-bold font-mono">{lines}</CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="p-3"><CardTitle className="text-sm">레벨</CardTitle></CardHeader>
                        <CardContent className="p-3 pt-0 text-xl font-bold font-mono">{level}</CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="p-3"><CardTitle className="text-sm">다음</CardTitle></CardHeader>
                        <CardContent className="p-3 pt-0 flex justify-center items-center h-16">
                            {nextPieceShape && (
                                <div className="bg-background p-1 rounded-md">
                                    {nextPieceShape.map((row, y) => (
                                        <div key={y} className="flex">
                                            {row.map((value, x) => (
                                                <div key={x} style={{
                                                    width: BLOCK_SIZE / 2,
                                                    height: BLOCK_SIZE / 2,
                                                    backgroundColor: value ? COLORS[SHAPES.findIndex(s => s === nextPieceShape)] : 'transparent',
                                                }} className="rounded-sm"/>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
            </CardContent>
            <CardFooter className="flex-col gap-2">
                 <div className="mt-4 flex sm:hidden items-center justify-center w-full gap-2">
                    <div className="flex flex-col gap-2">
                        <Button size="lg" className="h-16 w-16" onTouchStart={() => handleMobileControl({type: 'MOVE', payload: {dx:-1, dy:0}})}><ArrowLeft /></Button>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button size="lg" className="h-16 w-16" onTouchStart={() => handleMobileControl({type: 'ROTATE'})}><RotateCw /></Button>
                        <Button size="lg" className="h-16 w-16" onTouchStart={() => handleMobileControl({type: 'MOVE', payload: {dx:0, dy:1}})}><ArrowDown /></Button>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button size="lg" className="h-16 w-16" onTouchStart={() => handleMobileControl({type: 'MOVE', payload: {dx:1, dy:0}})}><ArrowRight /></Button>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                        <Button size="lg" className="h-34 w-16" onTouchStart={() => handleMobileControl({type: 'HARD_DROP'})}><ChevronsDown size={32}/></Button>
                    </div>
                </div>

                <p className="text-sm text-muted-foreground text-center mt-2">
                    <b>PC:</b> ↑: 회전, ←/→: 이동, ↓: 소프트 드롭, Space: 하드 드롭
                </p>
            </CardFooter>
        </Card>

        <AlertDialog open={status === 'over' && !isSubmitting}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>게임 종료!</AlertDialogTitle>
                    <AlertDialogDescription>
                        최종 점수: <strong>{score}점</strong> / 완성한 줄: <strong>{lines}줄</strong>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => dispatch({ type: 'START' })}>다시하기</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={isSubmitting}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2"><Loader2 className="animate-spin" />점수 기록 중...</AlertDialogTitle>
                    <AlertDialogDescription>잠시만 기다려주세요.</AlertDialogDescription>
                </AlertDialogHeader>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
