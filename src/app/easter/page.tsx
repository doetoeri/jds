
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function EasterPage() {
  const [clickCount, setClickCount] = useState(0);
  const [showSecret, setShowSecret] = useState(false);

  const handleClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= 10) {
      setShowSecret(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Button
          onClick={handleClick}
          variant="outline"
          className="w-48 h-48 rounded-full text-lg font-bold border-4 hover:bg-primary/10"
        >
          {showSecret ? '🎉' : '클릭'}
        </Button>
      </motion.div>
      {showSecret && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 text-xl font-bold text-primary"
        >
          비밀을 발견하셨군요!
        </motion.p>
      )}
    </div>
  );
}
