
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Megaphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, postAnnouncement } from '@/lib/firebase';

export function AnnouncementPoster() {
  const [announcement, setAnnouncement] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [user] = useAuthState(auth);
  const { toast } = useToast();

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcement.trim() || !user) return;

    setIsSending(true);
    try {
      await postAnnouncement(user.uid, announcement);
      toast({ title: '공지 완료', description: '모든 학생에게 공지가 전송되었습니다.' });
      setAnnouncement('');
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
            전체 공지 보내기
        </CardTitle>
        <CardDescription>
            모든 학생의 대시보드에 표시될 공지사항을 작성합니다.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSendAnnouncement}>
        <CardContent>
          <Textarea 
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            placeholder="학생들에게 보낼 공지 내용을 입력하세요..." 
            disabled={isSending}
            rows={4}
          />
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSending || !announcement.trim()} className="ml-auto">
            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            공지 전송
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
