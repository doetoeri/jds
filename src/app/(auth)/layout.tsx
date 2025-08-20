'use client';

import type { ReactNode } from "react";
import { motion } from "framer-motion";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <motion.main 
      className="flex min-h-screen w-full items-center justify-center bg-transparent p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      {children}
    </motion.main>
  );
}
