
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';

interface Letter {
  senderStudentId: string;
  receiverStudentId: string;
  content: string;
}

export default function PrintLetterPage() {
  const searchParams = useSearchParams();
  const letterId = searchParams.get('id');
  const [letter, setLetter] = useState<Letter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        document.body.style.backgroundColor = 'white';
        document.body.style.color = 'black';
    }
  }, [])

  useEffect(() => {
    if (!letterId) {
      setError('편지 ID가 없습니다.');
      setIsLoading(false);
      return;
    }

    const fetchLetter = async () => {
      try {
        const letterRef = doc(db, 'letters', letterId);
        const letterSnap = await getDoc(letterRef);
        if (letterSnap.exists()) {
          setLetter(letterSnap.data() as Letter);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="p-8 font-serif bg-white text-black min-h-screen">
      <style>{`
        @media print {
          .no-print {
            display: none;
          }
          body {
            background-color: white !important;
            color: black !important;
          }
        }
      `}</style>
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8 no-print">
            <h1 className="text-xl font-bold">편지 인쇄 미리보기</h1>
            <Button onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                인쇄하기
            </Button>
        </div>
        <div className="border border-gray-300 p-8 rounded-lg space-y-6">
          <p>To. {letter?.receiverStudentId} 학생에게</p>
          <div className="whitespace-pre-wrap leading-relaxed min-h-[400px]">
            {letter?.content}
          </div>
          <p className="text-right">From. {letter?.senderStudentId} 학생이</p>
        </div>
      </div>
    </div>
  );
}
