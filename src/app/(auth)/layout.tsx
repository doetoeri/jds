
'use client';

import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-orange-50 via-white to-blue-50 isolate flex items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
