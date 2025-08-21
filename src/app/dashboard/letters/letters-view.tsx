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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { Loader2, Mail, Send, Inbox, Info } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSearchParams } from 'next/navigation';


interface ReceivedLetter {
  id: string;
  senderStudentId: string;
  content: string;
  approvedAt: Timestamp;
  isOffline: boolean;
}

export default function LettersView() {
  const [receiverStudentId, setReceiverStudentId] = useState('');
  const [content, setContent] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInboxLoading, setIsInboxLoading] = useState(true);
  const [receivedLetters, setReceivedLetters] = useState<ReceivedLetter[]>([]);
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'send';
  const initialReceiver = searchParams.get('to') || '';

  // Set initial receiver from URL params
  useEffect(() => {
    if (initialReceiver) {
      setReceiverStudentId(initialReceiver);
    }
  }, [initialReceiver]);


  const fetchAndProcessLetters = useCallback(async () => {
    if (user) {
      setIsInboxLoading(true);
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            throw new Error("User data not found.");
        }
        const userData = userDocSnap.data();
        const currentUserStudentId = userData.studentId;

        // 1. Fetch letters without ordering on the server
        const q = query(
          collection(db, 'letters'),
          where('receiverStudentId', '==', currentUserStudentId),
          where('status', '==', 'approved')
        );
        const querySnapshot = await getDocs(q);
        const letters = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as ReceivedLetter[];
        
        // 2. Sort letters by approvedAt descending on the client-side
        letters.sort((a, b) => {
          const dateA = a.approvedAt?.toMillis() || 0;
          const dateB = b.approvedAt?.toMillis() || 0;
          return dateB - dateA;
        });

        setReceivedLetters(letters);

        // 3. Update last check timestamp after fetching
        await updateDoc(userDocRef, {
          lastLetterCheckTimestamp: Timestamp.now()
        });
        
      } catch (error) {
        console.error('Error fetching/processing received letters:', error);
        toast({
          title: '오류',
          description: '받은 편지를 불러오는 데 실패했습니다.',
          variant: 'destructive',
        });
      } finally {
        setIsInboxLoading(false);
      }
    }
  }, [user, toast]);


  useEffect(() => {
    // Only fetch letters when the component mounts and the inbox tab is active
    if (initialTab === 'inbox') {
      fetchAndProcessLetters();
    } else {
      setIsInboxLoading(false);
    }
  }, [initialTab, fetchAndProcessLetters]);

  const handleSendLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverStudentId || !content) {
      toast({
        title: '입력 오류',
        description: '모든 필드를 채워주세요.',
        variant: 'destructive',
      });
      return;
    }
    if (!user) {
      toast({
        title: '오류',
        description: '로그인이 필요합니다.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        throw new Error('사용자 정보를 찾을 수 없습니다.');
      }
      const senderStudentId = userDoc.data().studentId;

      if (senderStudentId === receiverStudentId) {
        throw new Error('자기 자신에게는 편지를 보낼 수 없습니다.');
      }

      const receiverQuery = query(collection(db, 'users'), where('studentId', '==', receiverStudentId));
      const receiverSnapshot = await getDocs(receiverQuery);
      if (receiverSnapshot.empty) {
        throw new Error(`학번 ${receiverStudentId}에 해당하는 학생을 찾을 수 없습니다.`);
      }

      await addDoc(collection(db, 'letters'), {
        senderUid: user.uid,
        senderStudentId: senderStudentId,
        receiverStudentId: receiverStudentId,
        content: content,
        status: 'pending',
        createdAt: Timestamp.now(),
        isOffline: isOffline,
      });

      toast({
        title: '전송 완료!',
        description: '편지가 성공적으로 전달되었습니다. 관리자 승인 후 처리됩니다.',
      });
      setReceiverStudentId('');
      setContent('');
      setIsOffline(false);
    } catch (error: any) {
      toast({
        title: '전송 실패',
        description: error.message || '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // This function is called when the user clicks on the inbox tab.
  const handleTabChange = (value: string) => {
      if (value === 'inbox') {
          fetchAndProcessLetters();
      }
  }

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
              친구에게 편지를 보내고 함께 Lak을 받아보세요. 관리자 승인 후 편지와
              Lak이 지급됩니다.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSendLetter}>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="receiverId">받는 사람 학번 (5자리)</Label>
                <Input
                  id="receiverId"
                  placeholder="예: 10203"
                  value={receiverStudentId}
                  onChange={e => setReceiverStudentId(e.target.value)}
                  disabled={isLoading}
                  required
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
              <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="offline" 
                    checked={isOffline}
                    onCheckedChange={(checked) => setIsOffline(checked as boolean)}
                    disabled={isLoading}
                    />
                  <Label htmlFor="offline" className="cursor-pointer">
                    오프라인으로 편지 전달하기
                  </Label>
              </div>
              {isOffline && (
                 <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>오프라인 편지 안내</AlertTitle>
                  <AlertDescription>
                    학생회에서 편지 내용을 확인 후, 오프라인으로 대신 전달해 드립니다. 관련 Lak 포인트 또한 오프라인으로 지급됩니다.
                  </AlertDescription>
                </Alert>
              )}
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
              친구가 보낸 편지가 여기에 도착합니다.
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
                    {letter.isOffline ? '학생회를 통해 오프라인으로 편지가 전달되었습니다.' : letter.content}
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
