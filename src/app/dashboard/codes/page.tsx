'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { auth, useCode } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function CodesPage() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [user] = useAuthState(auth);

  const handleUseCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      toast({ title: "오류", description: "코드를 입력해주세요.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "오류", description: "로그인이 필요합니다.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const result = await useCode(user.uid, code);
      if (result.success) {
        toast({
          title: "성공!",
          description: result.message,
        });
        setCode('');
      } else {
        toast({
          title: "오류",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "치명적인 오류",
        description: error.message || "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="flex justify-center items-start pt-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">코드 사용하기</CardTitle>
          <CardDescription>
            종달코드, 메이트코드, 또는 온라인 특수코드를 입력하여 Lak을 적립하세요.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleUseCode}>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="code">코드</Label>
                <Input 
                  id="code" 
                  placeholder="코드를 입력하세요" 
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" className="font-bold" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              사용하기
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
