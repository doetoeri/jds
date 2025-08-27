
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp, doc, updateDoc, or } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Megaphone } from 'lucide-react';
import Image from 'next/image';
import { useAuthState } from 'react-firebase-hooks/auth';

interface ReleaseNote {
  id: string;
  title: string;
  content: string;
  createdAt: Timestamp;
  authorName: string;
  imageUrl?: string;
  targetStudentId?: string;
}

export default function ReleasesPage() {
  const [notes, setNotes] = useState<ReleaseNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [user] = useAuthState(auth);

  const markAsRead = useCallback(async () => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        lastLetterCheckTimestamp: Timestamp.now(),
      });
    } catch (error) {
      console.error("Failed to update last check timestamp", error);
    }
  }, [user]);

  useEffect(() => {
    const fetchNotes = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            setIsLoading(false);
            return;
        }

        const currentUserStudentId = userDocSnap.data().studentId;

        const announcementsRef = collection(db, 'announcements');
        // Query for general announcements OR announcements targeted at the current user
        const q = query(
          announcementsRef,
          or(
            where('targetStudentId', '==', null),
            where('targetStudentId', '==', currentUserStudentId)
          ),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const fetchedNotes = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ReleaseNote));
        
        // Filter again in client-side because Firestore OR queries on different fields can be tricky
        // and sometimes return more than expected if not structured perfectly.
        // This ensures we only show global (null target) or user-specific announcements.
        const filteredNotes = fetchedNotes.filter(note => 
            !note.targetStudentId || note.targetStudentId === currentUserStudentId
        );
        
        setNotes(filteredNotes);
        
        // Mark as read after fetching
        markAsRead();

      } catch (error) {
        console.error("Error fetching release notes: ", error);
        toast({ title: "오류", description: "업데이트 소식을 불러오는 데 실패했습니다.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotes();
  }, [toast, markAsRead, user]);

  return (
    <div>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
          <Megaphone className="mr-2 h-6 w-6" />
          업데이트 소식
        </h1>
        <p className="text-muted-foreground">
          종달샘 허브의 새로운 기능, 이벤트, 변경사항을 확인하세요.
        </p>
      </div>
      
      <div className="space-y-8">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </Card>
          ))
        ) : notes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <p className="text-muted-foreground">아직 새로운 소식이 없습니다.</p>
            </CardContent>
          </Card>
        ) : (
          notes.map((note) => (
            <Card key={note.id} className={note.targetStudentId ? 'border-primary bg-primary/5' : ''}>
              <CardHeader>
                <CardTitle>{note.title}</CardTitle>
                <CardDescription>
                  {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleDateString() : ''} by {note.authorName}
                  {note.targetStudentId && <span className="ml-2 font-bold text-primary">[개인 알림]</span>}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {note.imageUrl && (
                  <div className="relative w-full h-64 rounded-lg overflow-hidden">
                    <Image
                      src={note.imageUrl}
                      alt={note.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {note.content}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
