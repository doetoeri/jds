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
import { auth, db, updateUserProfile, uploadProfileImage, deleteOldProfileImage } from '@/lib/firebase';
import { Loader2, User, Image as ImageIcon } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, getDoc } from 'firebase/firestore';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

const profileSchema = z.object({
  displayName: z.string().min(2, '닉네임은 2자 이상이어야 합니다.').max(20, '닉네임은 20자 이하이어야 합니다.'),
  photo: z.any().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface UserData {
    displayName?: string;
    photoURL?: string;
    photoPath?: string; // To store the path for deletion
}

export default function SettingsPage() {
  const [user, authLoading] = useAuthState(auth);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { toast } = useToast();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });
  
  const photoField = watch("photo");

  useEffect(() => {
    if (photoField && photoField.length > 0) {
      const file = photoField[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewImage(null);
    }
  }, [photoField]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data() as UserData;
            setUserData(data);
            reset({ displayName: data.displayName || '' });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          toast({ title: "오류", description: "사용자 정보를 불러오는 데 실패했습니다.", variant: "destructive" });
        }
      }
      setPageLoading(false);
    };

    if (!authLoading) {
      fetchUserData();
    }
  }, [user, authLoading, reset, toast]);

  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    if (!user) {
      toast({ title: "오류", description: "로그인이 필요합니다.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      let photoURL = userData?.photoURL || '';
      let photoPath = userData?.photoPath || '';

      const imageFile = data.photo?.[0];

      if (imageFile) {
         // If there's an old image, delete it from storage
        if(userData?.photoPath) {
            await deleteOldProfileImage(userData.photoPath);
        }
        const { downloadURL, filePath } = await uploadProfileImage(user.uid, imageFile);
        photoURL = downloadURL;
        photoPath = filePath;
      }

      await updateUserProfile(user.uid, {
        displayName: data.displayName,
        photoURL: photoURL,
        photoPath: photoPath,
      });

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
    return userData?.displayName?.substring(0, 1).toUpperCase() || 'U';
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
          프로필 사진과 닉네임을 변경할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>프로필 사진</Label>
            <div className="flex items-center gap-4">
                <Avatar className="h-24 w-24">
                    <AvatarImage src={previewImage || userData?.photoURL || ''} alt="Profile Preview" />
                    <AvatarFallback className="text-3xl">{getInitials()}</AvatarFallback>
                </Avatar>
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="picture" className="cursor-pointer border rounded-md p-2 text-center text-sm hover:bg-accent">
                        <ImageIcon className="mr-2 h-4 w-4 inline-block" />
                        사진 변경
                    </Label>
                    <Input id="picture" type="file" {...register("photo")} className="hidden" accept="image/png, image/jpeg, image/gif" />
                    <p className="text-xs text-muted-foreground">PNG, JPG, GIF 파일을 지원합니다.</p>
                </div>
            </div>
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
