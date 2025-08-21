import { Bird } from 'lucide-react';
import Link from 'next/link';

export function Logo({ isAdmin = false, isCouncil = false }: { isAdmin?: boolean, isCouncil?: boolean }) {
  const href = isAdmin ? "/admin" : isCouncil ? "/council" : "/dashboard";
  return (
    <Link href={href} className="flex items-center gap-2">
      <Bird className="h-6 w-6 text-primary" />
      <span className="font-headline text-lg font-bold">종달샘 허브</span>
    </Link>
  );
}
