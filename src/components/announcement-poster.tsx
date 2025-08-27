
'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Megaphone, Image as ImageIcon, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, postAnnouncement, storage } from '@/lib/firebase';
import { Input } from './ui/input';
import { Label } from './ui/label';
import Image from 'next/image';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Switch } from './ui/switch';

export function AnnouncementPoster() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isTargeted, setIsTargeted] = useState(false);
  const [targetStudentId, setTargetStudentId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user] = useAuthState(auth);
  const { toast } = useToast();
  
  const resetForm = () => {
      setTitle('');
      setContent('');
      setImageFile(null);
      setImagePreview(null);
      setIsTargeted(false);
      setTargetStudentId('');
      if(fileInputRef.current) fileInputRef.current.value = "";
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !user) {
        toast({ title: '입력 오류', description: '제목과 내용은 필수입니다.', variant: 'destructive'});
        return;
    }
    if (isTargeted && !targetStudentId) {
        toast({ title: '입력 오류', description: '알림을 받을 학생의 학번을 입력해주세요.', variant: 'destructive'});
        return;
    }

    setIsSending(true);
    try {
        let imageUrl = '';
        let imagePath = '';
        if (imageFile) {
            const newImagePath = `announcements/${Date.now()}_${imageFile.name}`;
            const imageRef = ref(storage, newImagePath);
            const snapshot = await uploadBytes(imageRef, imageFile);
            imageUrl = await getDownloadURL(snapshot.ref);
            imagePath = newImagePath;
        }

      await postAnnouncement(user.uid, title, content, imageUrl, imagePath, isTargeted ? targetStudentId : undefined);
      toast({ title: '공지 완료', description: isTargeted ? `${targetStudentId} 학생에게 알림이 전송되었습니다.` : '모든 학생에게 새 소식이 전달됩니다.' });
      resetForm();
    } catch (error: any) {
      toast({ title: '전송 실패', description: error.message, variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Megaphone />
            릴리즈 노트 / 공지 보내기
        </CardTitle>
        <CardDescription>
            모든 학생의 '업데이트 소식' 페이지에 표시될 내용을 작성합니다.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSendAnnouncement}>
        <CardContent className="space-y-4">
           <div className="flex items-center space-x-2">
              <Switch id="targeted-switch" checked={isTargeted} onCheckedChange={setIsTargeted} disabled={isSending} />
              <Label htmlFor="targeted-switch">특정 학생에게 보내기</Label>
            </div>

            {isTargeted && (
                <div className="pl-8 space-y-2">
                    <Label htmlFor="student-id">대상 학생 학번 (5자리)</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            id="student-id"
                            value={targetStudentId}
                            onChange={(e) => setTargetStudentId(e.target.value)}
                            placeholder="예: 10203" 
                            disabled={isSending}
                            className="pl-9"
                        />
                    </div>
                </div>
            )}
           <div>
             <Label htmlFor="announcement-title">제목</Label>
             <Input 
                id="announcement-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="업데이트의 핵심 내용을 요약해주세요." 
                disabled={isSending}
              />
           </div>
          <div>
            <Label htmlFor="announcement-content">내용</Label>
            <Textarea 
                id="announcement-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="학생들에게 보낼 상세 내용을 입력하세요..." 
                disabled={isSending}
                rows={4}
            />
          </div>
          <div>
            <Label>이미지 (선택)</Label>
            <div className="flex items-center gap-4">
                {imagePreview ? (
                    <Image src={imagePreview} alt="preview" width={80} height={80} className="rounded-md object-cover"/>
                ) : (
                    <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground"/>
                    </div>
                )}
                <Input id="picture" type="file" accept="image/*" onChange={handleImageChange} ref={fileInputRef} disabled={isSending} className="flex-1"/>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSending || !content.trim() || !title.trim()} className="ml-auto">
            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            게시하기
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
