
'use client';

import { AnnouncementPoster } from "@/components/announcement-poster";


export default function AdminPage() {
  
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline">관리자 홈</h1>
        <p className="text-muted-foreground">
          이 페이지에서 새로운 공지사항이나 업데이트 소식을 모든 사용자에게 알릴 수 있습니다.
        </p>
      </div>
      <AnnouncementPoster />
    </div>
  );
}
