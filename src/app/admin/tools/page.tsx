
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Wrench, AlertTriangle, Repeat } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { migrateUserData, revertUserDataMigration } from '@/lib/firebase';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function AdminToolsPage() {
  const [oldUid, setOldUid] = useState('');
  const [newUid, setNewUid] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const { toast } = useToast();

  const handleMigration = async () => {
    setIsMigrating(true);
    try {
      await migrateUserData(oldUid, newUid);
      toast({
        title: '데이터 이전 성공',
        description: `UID ${oldUid}의 데이터가 ${newUid}로 이전되었습니다.`,
      });
      setOldUid('');
      setNewUid('');
    } catch (error: any) {
      toast({
        title: '데이터 이전 실패',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsMigrating(false);
    }
  };
  
  const handleRevert = async () => {
      setIsReverting(true);
      try {
          await revertUserDataMigration();
          toast({
              title: "되돌리기 성공",
              description: "마지막으로 실행된 데이터 이전 작업을 되돌렸습니다."
          });
      } catch (error: any) {
          toast({
              title: "되돌리기 실패",
              description: error.message,
              variant: "destructive"
          });
      } finally {
          setIsReverting(false);
      }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
          <Wrench className="mr-2 h-6 w-6" />
          개발자 도구
        </h1>
        <p className="text-muted-foreground">
          데이터베이스 관리를 위한 고급 도구입니다. 주의해서 사용하세요.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>사용자 데이터 이전</CardTitle>
          <CardDescription>
            한 사용자의 모든 데이터(프로필, 포인트, 활동 기록 등)를 다른 사용자에게 이전합니다. 이메일 주소 변경 등으로 계정을 새로 만들어야 할 때 사용합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <h3 className="font-bold text-destructive">주의: 매우 위험한 작업</h3>
            </div>
            <p className="text-sm text-destructive/80 mt-1">
              이 작업은 데이터베이스를 직접 수정하며, 되돌리기 어렵습니다. UID를 여러 번 확인하고, 정말 필요한 경우에만 사용하세요.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="old-uid">기존 계정 UID (데이터를 가져올 계정)</Label>
              <Input
                id="old-uid"
                value={oldUid}
                onChange={(e) => setOldUid(e.target.value)}
                placeholder="데이터를 잃어버린 예전 계정의 UID"
                disabled={isMigrating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-uid">새 계정 UID (데이터를 붙여넣을 계정)</Label>
              <Input
                id="new-uid"
                value={newUid}
                onChange={(e) => setNewUid(e.target.value)}
                placeholder="새로 만든 계정의 UID"
                disabled={isMigrating}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-between">
           <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="secondary" disabled={isReverting}>
                  <Repeat className="mr-2 h-4 w-4"/>
                  마지막 이전 되돌리기
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>마지막 이전을 되돌리시겠습니까?</AlertDialogTitle>
                    <AlertDialogDescription>
                        가장 최근에 실행된 데이터 이전 작업을 취소하고 데이터를 원래 상태로 복원합니다.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRevert} disabled={isReverting}>
                        {isReverting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        되돌리기
                    </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
           </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={!oldUid || !newUid || isMigrating}>
                {isMigrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                데이터 이전 실행
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>정말로 데이터를 이전하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>
                  이 작업은 되돌릴 수 없습니다. <strong className="text-foreground">{oldUid.substring(0, 10)}...</strong>의 데이터가 <strong className="text-foreground">{newUid.substring(0, 10)}...</strong>(으)로 덮어씌워집니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={handleMigration} disabled={isMigrating}>
                  {isMigrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  네, 이전합니다
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}
