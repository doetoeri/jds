'use client';

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ParticleBackground } from '@/components/particle-background';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-transparent isolate">
      <ParticleBackground />
      <motion.main 
        className="relative z-10 flex min-h-screen w-full items-center justify-center bg-transparent p-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 10, duration: 0.3 }}
      >
        {children}
      </motion.main>
    </div>
  );
}
