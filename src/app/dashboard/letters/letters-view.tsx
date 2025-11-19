

'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { auth, db, sendLetter } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { Loader2, Mail, Send, Inbox, Info } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSearchParams, useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';

interface ReceivedLetter {
  id: string;
  senderStudentId: string;
  content: string;
  approvedAt: Timestamp;
  isOffline: boolean;
  status: 'pending' | 'approved' | 'rejected';
}

export default function LettersView() {
  const [receiverIdentifier, setReceiverIdentifier] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInboxLoading, setIsInboxLoading] = useState(true);
  const [receivedLetters, setReceivedLetters] = useState<ReceivedLetter[]>([]);
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'send';
  const initialReceiver = searchParams.get('to') || '';

  // Set initial receiver from URL params
  useEffect(() => {
    if (initialReceiver) {
      setReceiverIdentifier(initialReceiver);
    }
  }, [initialReceiver]);

  const fetchAndProcessLetters = useCallback(async () => {
    if (!user) return;
    setIsInboxLoading(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) throw new Error("User data not found.");
      
      const userData = userDocSnap.data();
      const userRole = userData.role;
      const userIdentifier = userRole === 'teacher' ? userData.nickname : userData.studentId;
      
      if (!userIdentifier) {
           throw new Error("User identifier (studentId or nickname) not found.");
      }

      const q = query(
        collection(db, 'letters'),
        where('receiverStudentId', '==', userIdentifier),
        where('status', '==', 'approved')
      );
      const querySnapshot = await getDocs(q);
      
      const letters = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ReceivedLetter))
        .sort((a, b) => b.approvedAt.toMillis() - a.approvedAt.toMillis());
      
      setReceivedLetters(letters);

      await updateDoc(userDocRef, {
        lastLetterCheckTimestamp: Timestamp.now()
      });
      
    } catch (error: any) {
      console.error('Error fetching/processing received letters:', error);
      toast({ title: '오류', description: error.message || '받은 편지를 불러오는 데 실패했습니다.', variant: 'destructive' });
    } finally {
      setIsInboxLoading(false);
    }
  }, [user, toast]);

  const handleSendLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverIdentifier || !content) {
      toast({ title: '입력 오류', description: '모든 필드를 채워주세요.', variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: '오류', description: '로그인이 필요합니다.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const result = await sendLetter(user.uid, receiverIdentifier, content);

      if (result.success) {
        toast({ title: '전송 완료!', description: result.message });
        setReceiverIdentifier('');
        setContent('');
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({ title: '전송 실패', description: error.message || '알 수 없는 오류가 발생했습니다.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTabChange = useCallback((value: string) => {
    if (value === 'inbox') {
      fetchAndProcessLetters();
    }
  }, [fetchAndProcessLetters]);

  useEffect(() => {
    if (initialTab === 'inbox') {
        handleTabChange('inbox');
    } else {
        setIsInboxLoading(false);
    }
  }, [initialTab, handleTabChange]);

  return (
    <Tabs defaultValue={initialTab} value={initialReceiver ? 'send' : undefined} className="w-full max-w-2xl mx-auto" onValueChange={handleTabChange}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="send">
          <Send className="mr-2 h-4 w-4" />
          편지 쓰기
        </TabsTrigger>
        <TabsTrigger value="inbox">
          <Inbox className="mr-2 h-4 w-4" />
          받은 편지함
        </TabsTrigger>
      </TabsList>
      <TabsContent value="send">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center">
              <Mail className="mr-2" /> 종달 우체국
            </CardTitle>
            <CardDescription>
              친구 또는 선생님에게 편지를 보내보세요.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSendLetter}>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="receiverId">받는 사람 (학번 또는 선생님 닉네임)</Label>
                <Input
                  id="receiverId"
                  placeholder="학생의 5자리 학번 또는 선생님의 닉네임을 입력하세요."
                  value={receiverIdentifier}
                  onChange={(e) => setReceiverIdentifier(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="content">편지 내용</Label>
                <Textarea
                  id="content"
                  placeholder="따뜻한 마음을 담아 편지를 작성해보세요."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  disabled={isLoading}
                  required
                  rows={6}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" className="font-bold" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                편지 보내기
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>
      <TabsContent value="inbox">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-2xl">받은 편지함</CardTitle>
            <CardDescription>
              나에게 온 편지를 확인할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isInboxLoading ? (
                 Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
            ) : receivedLetters.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                아직 받은 편지가 없습니다.
              </p>
            ) : (
              receivedLetters.map(letter => (
                <div key={letter.id} className="border p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold">
                      {letter.senderStudentId}님이 보낸 편지
                    </h4>
                    <Badge variant="secondary">
                      {letter.approvedAt?.toDate ? letter.approvedAt.toDate().toLocaleDateString() : ''}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                    {letter.content}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
