
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Gift, BookOpen, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const [unusedCodeCount, setUnusedCodeCount] = useState<number | null>(null);
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    const q = query(
      collection(db, 'codes'),
      where('type', '==', '히든코드'),
      where('used', '==', false)
    );

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        setUnusedCodeCount(snapshot.size);
      },
      error => {
        console.error('Error fetching unused code count:', error);
        setUnusedCodeCount(0);
      }
    );

    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    const handleRedirect = async () => {
        if (user) {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                const role = userDoc.data().role;
                if (role === 'admin') {
                    router.push('/admin');
                } else if (role === 'teacher') {
                    router.push('/teacher/rewards');
                } else if (role === 'council') {
                    router.push('/council');
                } else if (role === 'council_booth') {
                    router.push('/council/booth');
                }
                else {
                    router.push('/dashboard');
                }
            } else {
                 router.push('/dashboard');
            }
        }
    }
    
    if (!loading && user) {
        handleRedirect();
    }
  }, [user, loading, router]);


  const FADE_IN_ANIMATION_VARIANTS = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' } },
  };


  if (loading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden isolate">
      
      <motion.div 
        className="relative z-10 flex min-h-screen flex-col items-center justify-center text-center p-4 font-batang"
        initial="hidden"
        animate="show"
        viewport={{ once: true }}
        variants={{
          hidden: {},
          show: {
            transition: {
              staggerChildren: 0.15,
            },
          },
        }}
      >
        <motion.h1 
          variants={FADE_IN_ANIMATION_VARIANTS}
          className="text-6xl md:text-8xl font-bold text-primary tracking-tighter">
          JongDalSam
        </motion.h1>
        <motion.p 
           variants={FADE_IN_ANIMATION_VARIANTS}
           className="mt-4 max-w-md text-lg text-gray-700">
          고촌중학교 학생 자치회를 위한 허브에 오신 것을 환영합니다.
          다양한 활동에 참여하고 포인트를 관리해보세요.
           <br/>
          <strong className="text-primary">지금 가입하고 바로 사용 가능한 3포인트를 받으세요!</strong>
        </motion.p>
        
        <motion.div
          variants={FADE_IN_ANIMATION_VARIANTS}
          className="mt-6"
        >
          {unusedCodeCount === null ? (
            <Skeleton className="h-10 w-64 rounded-lg" />
          ) : (
            <div className="flex items-center justify-center gap-3 rounded-full border border-primary/20 bg-white/50 px-4 py-2 text-sm font-semibold text-primary backdrop-blur-sm animate-highlight-pulse">
              <Gift className="h-5 w-5" />
              <span>
                학교 곳곳에 숨겨진 히든코드! 현재{' '}
                <span className="font-bold text-base">{unusedCodeCount}</span>개의 코드가 남아있어요.
              </span>
            </div>
          )}
        </motion.div>

        <motion.div 
          variants={FADE_IN_ANIMATION_VARIANTS}
          className="mt-8 flex w-full flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="font-bold w-full sm:w-auto">
            <Link href="/login">로그인</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="font-bold w-full sm:w-auto bg-white/50"
          >
            <Link href="/signup">회원가입</Link>
          </Button>
           <Button
            asChild
            variant="secondary"
            size="lg"
            className="font-bold w-full sm:w-auto bg-white/50"
          >
            <Link href="/guide"><BookOpen className="mr-2 h-4 w-4"/>사용 방법 둘러보기</Link>
          </Button>
        </motion.div>
      </motion.div>
    </main>
  );
}
