
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { resetAllData } from '@/lib/firebase';
import { Loader2, Trash2 } from 'lucide-react';

export default function AdminResetPage() {
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetAllData();
      toast({
        title: '초기화 완료',
        description: '모든 활동 데이터가 성공적으로 초기화되었습니다.',
      });
      // You might want to refresh the page or update state here
      window.location.reload();
    } catch (error: any) {
      toast({
        title: '초기화 오류',
        description: error.message || '데이터 초기화 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div>
        <div className="space-y-1 mb-6">
            <h1 className="text-2xl font-bold tracking-tight font-headline">데이터 초기화</h1>
            <p className="text-muted-foreground">
                시스템의 모든 활동 데이터를 영구적으로 삭제하고 초기 상태로 되돌립니다.
            </p>
        </div>

        <Card className="border-destructive/50">
            <CardHeader>
            <CardTitle>
                위험 구역
            </CardTitle>
             <CardDescription className="text-destructive">
                이 작업은 되돌릴 수 없으므로, 모든 내용을 신중하게 읽고 진행해주세요.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <p className="text-sm text-foreground mb-4">
                아래 버튼을 누르면 시스템의 모든 활동 데이터가 영구적으로 삭제됩니다.
                <br/>
                <strong className="font-bold">삭제되는 데이터:</strong> 모든 포인트, 거래 내역, 발급된 코드, 편지, 구매 내역, 공지사항, 소통 채널 메시지, 방명록.
                <br/>
                <strong className="font-bold">유지되는 데이터:</strong> 사용자 계정(이메일, 비밀번호, 학번, 이름 등)은 그대로 유지됩니다.
            </p>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isResetting}>
                    {isResetting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    전체 활동 데이터 초기화
                </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>정말로 초기화하시겠습니까?</AlertDialogTitle>
                    <AlertDialogDescription>
                    이 작업은 모든 사용자의 포인트, 거래 내역, 코드, 편지, 구매 기록 등을 영구적으로 삭제합니다. 사용자 계정 자체는 삭제되지 않습니다. 이 작업은 되돌릴 수 없습니다.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={handleReset}
                    disabled={isResetting}
                    >
                    {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    네, 모든 활동 내역을 초기화합니다.
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            </CardContent>
        </Card>
    </div>
  );
}
