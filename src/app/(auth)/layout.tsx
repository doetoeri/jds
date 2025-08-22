
'use client';

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ParticleBackground } from '@/components/particle-background';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-transparent isolate flex items-center justify-center p-4">
      <ParticleBackground />
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
