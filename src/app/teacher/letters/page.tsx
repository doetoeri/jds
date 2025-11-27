'use client';

import { Suspense } from 'react';
import LettersView from '@/app/dashboard/letters/letters-view';

export const dynamic = 'force-dynamic';

// This is a new wrapper component that uses Suspense
// to handle the `useSearchParams` hook correctly.
export default function TeacherLettersPage() {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <LettersView />
      </Suspense>
    </div>
  );
}
