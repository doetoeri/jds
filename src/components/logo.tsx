import { Bird } from 'lucide-react';
import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2">
      <Bird className="h-6 w-6 text-primary" />
      <span className="font-headline text-lg font-bold">종달샘 허브</span>
    </Link>
  );
}
