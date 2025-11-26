'use client';

import { Suspense } from 'react';
import BetaLeaderboardClient from './beta-leaderboard-client';
import { Loader2 } from 'lucide-react';

export default function BetaLeaderboardPage() {
  return (
    <div>
      <Suspense fallback={<div className="flex items-center justify-center p-10"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
        <BetaLeaderboardClient />
      </Suspense>
    </div>
  );
}
