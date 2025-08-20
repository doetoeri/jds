'use client';

import { useState, useEffect } from 'react';
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
import { auth, db, updateUserProfile } from '@/lib/firebase';
import { Loader2, User, Palette } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  displayName: z.string().min(2, '닉네임은 2자 이상이어야 합니다.').max(20, '닉네임은 20자 이하이어야 합니다.'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface UserData {
    displayName?: string;
    avatarGradient?: string;
}

const gradientOptions = [
    { id: 'blue', name: '파랑', className: 'gradient-blue' },
    { id: 'orange', name: '주황', className: 'gradient-orange' },
    { id: 'purple', name: '보라', className: 'gradient-purple' },
    { id: 'red', name: '빨강', className: 'gradient-red' },
];

export default function SettingsPage() {
  const [user, authLoading] = useAuthState(auth);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGradient, setSelectedGradient] = useState<string>('orange');

  const { toast } = useToast();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
        setPageLoading(false);
        return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data() as UserData;
            setUserData(data);
            reset({ displayName: data.displayName || '' });
            setSelectedGradient(data.avatarGradient || 'orange');
        }
        setPageLoading(false);
    }, (error) => {
        console.error("Error fetching user data:", error);
        toast({ title: "오류", description: "사용자 정보를 불러오는 데 실패했습니다.", variant: "destructive" });
        setPageLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, reset, toast]);

  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    if (!user) {
      toast({ title: "오류", description: "로그인이 필요합니다.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const updateData: { displayName: string; avatarGradient: string } = {
        displayName: data.displayName,
        avatarGradient: selectedGradient,
      };

      await updateUserProfile(user.uid, updateData);
      
      toast({ title: "성공", description: "프로필이 성공적으로 업데이트되었습니다." });
    } catch (error: any) {
      toast({
        title: "업데이트 실패",
        description: error.message || '프로필 업데이트 중 오류가 발생했습니다.',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getInitials = () => {
    return userData?.displayName?.substring(0, 1).toUpperCase() || user?.email?.substring(0, 1).toUpperCase() || 'U';
  }

  if (pageLoading || authLoading) {
      return (
          <Card className="w-full max-w-2xl mx-auto">
              <CardHeader>
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent className="space-y-6">
                  <div className="flex items-center gap-4">
                      <Skeleton className="h-24 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
              </CardContent>
              <CardFooter>
                  <Skeleton className="h-10 w-24 ml-auto" />
              </CardFooter>
          </Card>
      )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <User className="mr-2" /> 프로필 설정
        </CardTitle>
        <CardDescription>
          프로필 스타일과 닉네임을 변경할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>프로필 스타일</Label>
            <div className="flex items-center gap-6">
                <Avatar className={cn("h-24 w-24", selectedGradient && `gradient-${selectedGradient}`)}>
                    <AvatarFallback className="text-4xl text-white bg-transparent font-bold">{getInitials()}</AvatarFallback>
                </Avatar>
                <div className="grid grid-cols-2 gap-3">
                    {gradientOptions.map((gradient) => (
                        <button
                          key={gradient.id}
                          type="button"
                          onClick={() => setSelectedGradient(gradient.id)}
                          className={cn(
                              "w-12 h-12 rounded-full cursor-pointer border-2 transition-all",
                              gradient.className,
                              selectedGradient === gradient.id ? 'border-ring' : 'border-transparent'
                          )}
                          aria-label={gradient.name}
                        />
                    ))}
                </div>
            </div>
             <p className="text-sm text-muted-foreground flex items-center gap-2 pt-2">
                <Palette className="h-4 w-4"/>
                원하는 그라데이션을 선택하여 프로필 배경을 꾸며보세요.
             </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">닉네임</Label>
            <Input
              id="displayName"
              {...register('displayName')}
              disabled={isSubmitting}
            />
            {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="ml-auto font-bold" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            저장하기
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
