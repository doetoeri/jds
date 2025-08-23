
'use client';

import { Suspense } from 'react';
import LettersView from './letters-view';
import { Card } from '@/components/ui/card';

// This is a new wrapper component that uses Suspense
// to handle the `useSearchParams` hook correctly.
export default function LettersPage() {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <LettersView />
      </Suspense>
    </div>
  );
}

    