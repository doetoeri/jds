
'use client';

import { Bird, HardHat } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const colors = [
    "text-red-500", "text-orange-500", "text-yellow-500", "text-green-500", 
    "text-blue-500", "text-indigo-500", "text-purple-500", "text-pink-500"
];

export default function MaintenancePage() {
  const [reason, setReason] = useState("보다 나은 서비스 제공을 위해 잠시 시스템을 점검하고 있습니다.");
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [velocity, setVelocity] = useState({ x: 0.5, y: 0.3 });
  const [colorIndex, setColorIndex] = useState(0);
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    const settingsRef = doc(db, 'system_settings', 'main');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists() && doc.data().maintenanceReason) {
        setReason(doc.data().maintenanceReason);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!showAnimation) return;

    let animationFrameId: number;

    function animate() {
      if (containerRef.current) {
        setPosition(prevPos => {
          let newX = prevPos.x + velocity.x;
          let newY = prevPos.y + velocity.y;
          let newVx = velocity.x;
          let newVy = velocity.y;
          let hit = false;

          if (newX <= 0 || newX >= 100) { newVx = -newVx; hit = true; }
          if (newY <= 0 || newY >= 100) { newVy = -newVy; hit = true; }

          if (hit) {
            setColorIndex(prev => (prev + 1) % colors.length);
          }

          if (newVx !== velocity.x || newVy !== velocity.y) {
            setVelocity({ x: newVx, y: newVy });
          }

          return {
            x: Math.max(0, Math.min(100, newX)),
            y: Math.max(0, Math.min(100, newY)),
          };
        });
      }
      animationFrameId = requestAnimationFrame(animate);
    }
    
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [showAnimation, velocity.x, velocity.y]);

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden bg-gray-900 flex items-center justify-center"
    >
      {!showAnimation ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center p-6 text-center"
        >
            <div className="flex items-center gap-4 mb-4">
                <HardHat className="h-10 w-10 text-yellow-400" />
            </div>
            <h1 className="text-2xl font-bold font-headline text-gray-100 mb-2">
                시스템 점검 중
            </h1>
            <p className="text-md text-gray-400 max-w-sm mb-6">
                {reason}
            </p>
            <Button onClick={() => setShowAnimation(true)}>
                확인하기
            </Button>
        </motion.div>
      ) : (
        <motion.div
            className="absolute"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
                top: `${position.y}%`,
                left: `${position.x}%`,
                transform: "translate(-50%, -50%)"
            }}
            transition={{ type: "tween", ease: "linear" }}
        >
            <div className="flex items-center gap-2">
                <Bird className={cn("h-12 w-12", colors[colorIndex])} />
                <span className={cn("text-2xl font-bold font-headline text-gray-100", colors[colorIndex])}>
                    종달샘 허브
                </span>
            </div>
        </motion.div>
      )}
    </div>
  );
};
