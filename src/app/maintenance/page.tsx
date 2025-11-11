

'use client';

import { Bird, HardHat } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    const settingsRef = doc(db, 'system_settings', 'main');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists() && doc.data().maintenanceReason) {
        setReason(doc.data().maintenanceReason);
      }
    });

    const animationFrame = requestAnimationFrame(animate);

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
      requestAnimationFrame(animate);
    }
    
    return () => {
      unsubscribe();
      cancelAnimationFrame(animationFrame);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden bg-gray-900"
    >
      <motion.div
        className="absolute"
        animate={{ x: `${position.x}%`, y: `${position.y}%` }}
        style={{ translateX: "-50%", translateY: "-50%" }}
        transition={{ type: "tween", ease: "linear" }}
      >
        <div className="flex flex-col items-center p-6 text-center">
            <div className="flex items-center gap-4 mb-4">
                <HardHat className={cn("h-10 w-10", colors[colorIndex])} />
                <Bird className={cn("h-12 w-12", colors[colorIndex])} />
            </div>
            <h1 className="text-2xl font-bold font-headline text-gray-100 mb-2">
                시스템 점검 중
            </h1>
            <p className="text-md text-gray-400 max-w-sm">
                {reason}
            </p>
        </div>
      </motion.div>
    </div>
  );
};
