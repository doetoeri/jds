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
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';
import { signUp } from '@/lib/firebase';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';


export default function SignupPage() {
  const [userType, setUserType] = useState('student');
  const [studentId, setStudentId] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [officeFloor, setOfficeFloor] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: '오류',
        description: '비밀번호가 일치하지 않습니다.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    
    const signupData = userType === 'student' 
      ? { studentId }
      : { name: teacherName, officeFloor };

    try {
      await signUp(userType, signupData, password, email);
      toast({
        title: '회원가입 요청 완료',
        description: userType === 'student' 
          ? '회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.'
          : '교직원 가입 신청이 완료되었습니다. 관리자 승인 후 활동할 수 있습니다.',
      });
      router.push('/login');
    } catch (error: any) {
       toast({
        title: '회원가입 실패',
        description: error.message,
        variant: 'destructive',
      });
      setIsLoading(false); // Stop loading on error
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline text-primary">회원가입</CardTitle>
        <CardDescription>
          새로운 종달샘 허브 계정을 만듭니다.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSignup}>
        <CardContent className="space-y-4">
          
          <div className="space-y-2">
            <Label>가입 유형</Label>
            <RadioGroup defaultValue="student" onValueChange={setUserType} className="flex gap-4" disabled={isLoading}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="student" id="r1" />
                <Label htmlFor="r1">학생</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="teacher" id="r2" />
                <Label htmlFor="r2">교직원</Label>
              </div>
            </RadioGroup>
          </div>

          {userType === 'student' ? (
             <div className="space-y-2">
              <Label htmlFor="studentId">학번 (5자리)</Label>
              <Input
                id="studentId"
                placeholder="예: 10203 (1학년 2반 3번)"
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                disabled={isLoading}
              />
            </div>
          ) : (
            <>
               <div className="space-y-2">
                <Label htmlFor="teacherName">성함</Label>
                <Input
                  id="teacherName"
                  placeholder="예: 홍길동"
                  required
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="officeFloor">교무실 층수</Label>
                <Input
                  id="officeFloor"
                  placeholder="예: 2층"
                  required
                  value={officeFloor}
                  onChange={(e) => setOfficeFloor(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </>
          )}
         
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="hello@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">비밀번호 확인</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full font-bold" disabled={isLoading}>
             {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            회원가입
          </Button>
          <div className="text-center text-sm">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className={`font-semibold text-primary underline ${isLoading ? 'pointer-events-none opacity-50' : ''}`}>
              로그인
            </Link>
          </div>
           <Alert variant="destructive" className="mt-4 text-xs">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                계정 도용이 의심되는 경우, 즉시 <a href="mailto:doe0kim@gmail.com" className="underline">doe0kim@gmail.com</a> 또는 <a href="tel:010-4838-8264" className="underline">010-4838-8264</a>로 신고해주세요.
              </AlertDescription>
            </Alert>
        </CardFooter>
      </form>
    </Card>
  );
}
