'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  addDoc,
  Timestamp,
  getDocs,
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Loader2, Gift, Check, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { handleSignOut } from '@/lib/firebase';

export default function SantaMagicVotePage() {
  const [user, loading] = useAuthState(auth);
  const [userData, setUserData] = useState<{
    studentId: string;
    grade: string;
    class: string;
  } | null>(null);
  const [votedFor, setVotedFor] = useState('');
  const [hasVoted, setHasVoted] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login/santamagic');
      return;
    }

    const fetchUserData = async () => {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.role === 'admin') {
          router.push('/santamagic/admin');
          return;
        }
        const studentId = data.studentId;
        const grade = studentId.substring(0, 1);
        const studentClass = studentId.substring(1, 3);
        setUserData({ studentId, grade, class: studentClass });

        // Check if user has already voted
        const votesQuery = query(
          collection(db, 'santas_magic_votes'),
          where('voterId', '==', studentId)
        );
        const voteSnapshot = await getDocs(votesQuery);
        setHasVoted(!voteSnapshot.empty);
      } else {
        toast({
          title: '오류',
          description: '학생 정보를 찾을 수 없습니다.',
          variant: 'destructive',
        });
        handleSignOut();
        router.push('/login/santamagic');
      }
    };

    fetchUserData();
  }, [user, loading, router, toast]);

  const handleSubmitVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!votedFor.match(/^\d{5}$/)) {
      toast({
        title: '입력 오류',
        description: '올바른 5자리 학번을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }
    if (!userData || !user) return;

    const votedForGrade = votedFor.substring(0, 1);
    const votedForClass = votedFor.substring(1, 3);

    if (votedForGrade !== userData.grade || votedForClass !== userData.class) {
      toast({
        title: '투표 오류',
        description: '자신과 같은 반의 학생에게만 투표할 수 있습니다.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      await addDoc(collection(db, 'santas_magic_votes'), {
        grade: userData.grade,
        class: userData.class,
        votedFor: votedFor,
        voterId: userData.studentId,
        createdAt: Timestamp.now(),
      });
      setHasVoted(true);
      toast({
        title: '투표 완료!',
        description: '소중한 한 표 감사합니다.',
      });
    } catch (error: any) {
      toast({
        title: '투표 실패',
        description: error.message || '오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFullLogout = async () => {
    await handleSignOut();
    router.push('/');
  }

  if (loading || hasVoted === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-800">
        <Loader2 className="h-16 w-16 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full isolate flex items-center justify-center p-4 bg-red-800 text-white">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/santamagic-bg.jpg')",
          filter: 'blur(4px) brightness(0.7)',
        }}
      />
        <Button onClick={handleFullLogout} variant="ghost" className="absolute top-4 right-4 text-white hover:bg-white/10 hover:text-white">
            <LogOut className="mr-2 h-4 w-4" />
            로그아웃
        </Button>

      <div className="relative z-10 w-full max-w-md text-center">
        <h1 className="text-5xl font-headline font-black tracking-tight text-white drop-shadow-lg mb-2">
          Santa's Magic
        </h1>
        {hasVoted ? (
          <div className="bg-white/10 backdrop-blur-md p-8 rounded-lg">
            <Check className="h-16 w-16 mx-auto text-white bg-green-500 rounded-full p-2 mb-4" />
            <h2 className="text-2xl font-bold">투표해주셔서 감사합니다!</h2>
            <p className="text-red-100 mt-2">결과는 12월 24일에 공개됩니다.</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmitVote}
            className="bg-white/10 backdrop-blur-md p-8 rounded-lg space-y-6"
          >
            <div>
              <h2 className="text-2xl font-bold">
                {userData?.grade}학년 {userData?.class}반에서
              </h2>
              <p className="text-red-100">가장 멋진 친구에게 투표하세요!</p>
            </div>
            <div className="space-y-2 text-left">
              <Label htmlFor="votedFor">추천할 친구의 학번</Label>
              <Input
                id="votedFor"
                type="text"
                placeholder="5자리 학번 입력"
                value={votedFor}
                onChange={(e) => setVotedFor(e.target.value)}
                disabled={isProcessing}
                className="h-12 text-base bg-white/10 border-white/20 text-white placeholder:text-red-100 focus:bg-white/20 text-center tracking-widest"
                maxLength={5}
              />
            </div>
            <Button
              type="submit"
              className="w-full font-bold h-12 text-base bg-white text-red-700 hover:bg-red-100"
              disabled={isProcessing || !votedFor}
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Gift className="mr-2 h-4 w-4" />
              )}
              투표하기
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
