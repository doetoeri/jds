
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Megaphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit, Timestamp } from 'firebase/firestore';

interface Announcement {
  id: string;
  text: string;
  createdAt: Timestamp;
  authorName: string;
}

export function AnnouncementView() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(1));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const latestDoc = querySnapshot.docs[0];
        setAnnouncement({ id: latestDoc.id, ...latestDoc.data() } as Announcement);
      } else {
        setAnnouncement(null);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching announcement: ", error);
      toast({ title: '오류', description: '공지를 불러오는 데 실패했습니다.', variant: 'destructive' });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  if (isLoading) {
    return (
      <Card className="bg-[hsl(var(--announcement-bg))] border-announcement-border">
        <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-[hsl(var(--announcement-fg))]">
                <Megaphone />
                공지사항
            </CardTitle>
        </CardHeader>
        <CardContent>
            <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--announcement-fg))]" />
        </CardContent>
      </Card>
    );
  }
  
  if (!announcement) {
    return null; // Don't render anything if there's no announcement
  }

  return (
    <Card className="bg-[hsl(var(--announcement-bg))] border-announcement-border animate-in fade-in-50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-[hsl(var(--announcement-fg))]">
          <Megaphone />
          공지사항
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-[hsl(var(--announcement-fg))] space-y-2">
         <p className="whitespace-pre-wrap">{announcement.text}</p>
         <p className="text-xs text-right opacity-80">
            - {announcement.authorName}, {announcement.createdAt.toDate().toLocaleDateString()}
         </p>
      </CardContent>
    </Card>
  );
}
