
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
import { Loader2, User, Palette, Bell, BellOff, FlaskConical } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, onSnapshot } from 'firebase/firestore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';

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
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
  const [isLiquidGlassEnabled, setIsLiquidGlassEnabled] = useState(false);

  const { toast } = useToast();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'liquid-glass') {
      setIsLiquidGlassEnabled(true);
    }
  }, []);

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
  
  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
        toast({ title: "오류", description: "이 브라우저에서는 알림을 지원하지 않습니다.", variant: "destructive" });
        return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
        toast({ title: "알림 허용됨", description: "이제 새로운 편지 알림을 받을 수 있습니다." });
    } else if (permission === 'denied') {
         toast({ title: "알림 거부됨", description: "알림을 받으려면 브라우저 설정에서 권한을 변경해야 합니다.", variant: "destructive" });
    }
  };
  
  const handleThemeToggle = (enabled: boolean) => {
    setIsLiquidGlassEnabled(enabled);
    if (enabled) {
      localStorage.setItem('theme', 'liquid-glass');
      document.body.classList.add('liquid-glass-theme-enabled');
    } else {
      localStorage.removeItem('theme');
      document.body.classList.remove('liquid-glass-theme-enabled');
    }
  }

  const getInitials = () => {
    return userData?.displayName?.substring(0, 1).toUpperCase() || user?.email?.substring(0, 1).toUpperCase() || 'U';
  }

  if (pageLoading || authLoading) {
      return (
        <div className="space-y-6">
            <div className="space-y-1">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-full max-w-sm" />
            </div>
            <Card>
                <CardContent className="pt-6 space-y-6">
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
        </div>
      )
  }

  return (
    <div className="space-y-6">
        <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
                <User className="mr-2" /> 프로필 설정
            </h1>
            <p className="text-muted-foreground">
                프로필 스타일과 닉네임, 알림 설정을 변경할 수 있습니다.
            </p>
        </div>
        <Card>
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardHeader>
                    <CardTitle>프로필</CardTitle>
                </CardHeader>
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
                    프로필 저장
                </Button>
                </CardFooter>
            </form>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>알림 설정</CardTitle>
                <CardDescription>새로운 편지가 오면 브라우저 알림을 받도록 설정합니다.</CardDescription>
            </CardHeader>
            <CardContent>
                 {notificationPermission === 'granted' ? (
                    <Alert variant="default" className="bg-green-50 border-green-200">
                        <Bell className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-800">알림이 현재 허용되어 있습니다.</AlertTitle>
                        <AlertDescription className="text-green-700">
                            이제 새로운 편지 도착 등 알림을 브라우저를 통해 받을 수 있습니다.
                        </AlertDescription>
                    </Alert>
                ) : notificationPermission === 'denied' ? (
                    <Alert variant="destructive">
                        <BellOff className="h-4 w-4" />
                        <AlertTitle>알림이 차단되었습니다.</AlertTitle>
                        <AlertDescription>
                            알림을 받으려면 브라우저 주소창 옆의 아이콘을 클릭하여 사이트 설정에서 직접 권한을 변경해야 합니다.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">새로운 편지 도착 등 중요 알림을 받으시겠어요?</p>
                        <Button onClick={handleRequestPermission}>
                           <Bell className="mr-2 h-4 w-4"/> 알림 권한 요청하기
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><FlaskConical/> 실험실</CardTitle>
                <CardDescription>아직 개발 중인 새로운 기능을 미리 사용해볼 수 있습니다.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-1">
                        <Label htmlFor="liquid-glass-theme" className="font-semibold">리퀴드 글래스 테마</Label>
                        <p className="text-sm text-muted-foreground">앱 전체에 반투명 유리 효과를 적용합니다.</p>
                    </div>
                    <Switch
                        id="liquid-glass-theme"
                        checked={isLiquidGlassEnabled}
                        onCheckedChange={handleThemeToggle}
                    />
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
