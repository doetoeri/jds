
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Printer, User, Users, Calendar, Type, Mail, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface Letter {
  id: string;
  senderStudentId: string;
  receiverStudentId: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
}

export default function LetterDetailPage({ params: { id: letterId } }: { params: { id: string } }) {
  const [letter, setLetter] = useState<Letter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!letterId) {
      setError('편지 ID가 없습니다.');
      setIsLoading(false);
      return;
    }

    const fetchLetter = async () => {
      try {
        const letterRef = doc(db, 'letters', letterId as string);
        const letterSnap = await getDoc(letterRef);
        if (letterSnap.exists()) {
          setLetter({ id: letterSnap.id, ...letterSnap.data() } as Letter);
        } else {
          setError('편지를 찾을 수 없습니다.');
        }
      } catch (e) {
        setError('편지를 불러오는 중 오류가 발생했습니다.');
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLetter();
  }, [letterId]);
  
  const handleStatusUpdate = async (newStatus: 'approved' | 'rejected') => {
      if (!letter) return;
      setIsProcessing(true);
      try {
          const letterRef = doc(db, 'letters', letter.id);
          await updateDoc(letterRef, {
              status: newStatus,
              approvedAt: newStatus === 'approved' ? Timestamp.now() : null,
          });
          
          setLetter(prev => prev ? {...prev, status: newStatus} : null);
          toast({ title: '성공', description: `편지를 ${newStatus === 'approved' ? '승인' : '거절'}했습니다.` });
          
      } catch (error) {
          toast({ title: '오류', description: '상태 업데이트 중 오류 발생', variant: 'destructive'});
      } finally {
          setIsProcessing(false);
      }
  }


  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (!letter) {
    return <p>편지 정보를 찾을 수 없습니다.</p>;
  }
  
  const statusVariant = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
  } as const;

  const statusText = {
      pending: '대기중',
      approved: '승인됨',
      rejected: '거절됨',
  };

  return (
    <div>
        <div className="flex items-center gap-4 mb-4">
            <Button asChild variant="outline" size="icon" className="h-7 w-7">
              <Link href="/admin/letters">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Link>
            </Button>
            <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
              편지 상세 정보
            </h1>
             {letter.status === 'pending' && (
               <div className="ml-auto flex items-center gap-2">
                 {isProcessing ? (
                     <Loader2 className="h-4 w-4 animate-spin"/>
                 ) : (
                    <>
                        <Button size="sm" variant="default" onClick={() => handleStatusUpdate('approved')} className="bg-green-500 hover:bg-green-600">
                            <CheckCircle className="mr-2 h-4 w-4" /> 승인
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate('rejected')}>
                            <XCircle className="mr-2 h-4 w-4" /> 거절
                        </Button>
                    </>
                 )}
               </div>
            )}
        </div>
      <Card>
        <CardHeader>
          <CardTitle>From. {letter.senderStudentId}</CardTitle>
          <CardDescription>To. {letter.receiverStudentId}</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">작성일:</span>
                        <span className="font-medium">{letter.createdAt.toDate().toLocaleString()}</span>
                    </div>
                     <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">상태:</span>
                        <span><Badge variant={statusVariant[letter.status]}>{statusText[letter.status]}</Badge></span>
                    </div>
                </div>

                <Separator />
                
                <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2"><Mail className="h-4 w-4"/>편지 내용</h3>
                    <div className="p-4 bg-muted/50 rounded-lg min-h-[200px] whitespace-pre-wrap break-words">
                        {letter.content}
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
