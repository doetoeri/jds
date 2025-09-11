
'use client';

import { Suspense } from 'react';
import LettersView from './letters-view';

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
