'use client';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Gift } from 'lucide-react';

interface Vote {
  id: string;
  grade: string;
  class: string;
  votedFor: string;
  voterId: string;
  createdAt: any;
}

interface ClassResult {
  [studentId: string]: number;
}

interface GradeResult {
  [className: string]: ClassResult;
}

interface AllResults {
  [gradeName: string]: GradeResult;
}

export default function SantaMagicAdminPage() {
  const [results, setResults] = useState<AllResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const votesQuery = query(
      collection(db, 'santas_magic_votes'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      votesQuery,
      (snapshot) => {
        const votes = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Vote[];

        const aggregatedResults: AllResults = {};

        votes.forEach((vote) => {
          const gradeName = `${vote.grade}학년`;
          const className = `${vote.class}반`;

          if (!aggregatedResults[gradeName]) {
            aggregatedResults[gradeName] = {};
          }
          if (!aggregatedResults[gradeName][className]) {
            aggregatedResults[gradeName][className] = {};
          }
          if (!aggregatedResults[gradeName][className][vote.votedFor]) {
            aggregatedResults[gradeName][className][vote.votedFor] = 0;
          }
          aggregatedResults[gradeName][className][vote.votedFor]++;
        });

        // Sort results within each class
        for (const grade in aggregatedResults) {
          for (const aClass in aggregatedResults[grade]) {
            const sortedClass = Object.entries(
              aggregatedResults[grade][aClass]
            )
              .sort(([, a], [, b]) => b - a)
              .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
            aggregatedResults[grade][aClass] = sortedClass;
          }
        }

        setResults(aggregatedResults);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching votes:', error);
        toast({
          title: '오류',
          description: '투표 결과를 불러오는 데 실패했습니다.',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [toast]);

  return (
    <div className="min-h-screen bg-red-900 text-white p-4 sm:p-6 lg:p-8">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/santamagic-bg.jpg')",
          filter: 'blur(8px) brightness(0.6)',
          transform: 'scale(1.1)',
        }}
      />
      <div className="relative z-10 max-w-7xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-headline font-black tracking-tight text-white drop-shadow-lg mb-2">
          Santa's Magic - 투표 결과
        </h1>
        <p className="text-red-200 mb-8">
          각 반별 투표 현황입니다. 가장 많은 표를 받은 학생이 맨 위에 표시됩니다.
        </p>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 bg-white/10" />
            ))}
          </div>
        )}

        <div className="space-y-8">
          {results &&
            Object.keys(results)
              .sort()
              .map((gradeName) => (
                <div key={gradeName}>
                  <h2 className="text-3xl font-bold font-headline mb-4 border-b-2 border-red-400 pb-2">
                    {gradeName}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Object.keys(results[gradeName])
                      .sort((a, b) => parseInt(a) - parseInt(b))
                      .map((className) => (
                        <Card
                          key={className}
                          className="bg-white/5 border-white/10 backdrop-blur-sm"
                        >
                          <CardHeader>
                            <CardTitle className="text-xl font-bold text-white">
                              {className}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {Object.entries(results[gradeName][className])
                                .map(([studentId, count]) => (
                                  <li
                                    key={studentId}
                                    className="flex justify-between items-center text-lg"
                                  >
                                    <span className="font-semibold">{studentId}</span>
                                    <span className="font-bold text-red-200">
                                      {count}표
                                    </span>
                                  </li>
                                ))}
                            </ul>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              ))}
          {!isLoading && (!results || Object.keys(results).length === 0) && (
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm col-span-full">
              <CardContent className="p-10 text-center">
                <Gift className="mx-auto h-12 w-12 text-red-300 mb-4" />
                <p className="text-red-200">아직 투표 결과가 없습니다.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
