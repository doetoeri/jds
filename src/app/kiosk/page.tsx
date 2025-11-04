
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Feather, MessageSquareHeart } from "lucide-react";
import Link from "next/link";
import { motion } from 'framer-motion';

const kioskOptions = [
    {
        title: '종달샘 삼행시',
        description: '학생들이 제시어로 삼행시를 짓고 포인트를 받습니다.',
        href: '/kiosk/poem',
        icon: Feather
    },
    {
        title: '비밀 편지 보내기',
        description: '학생들이 익명으로 친구에게 비밀 편지를 보냅니다.',
        href: '/kiosk/letter',
        icon: MessageSquareHeart
    }
]

export default function KioskSelectPage() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold font-headline text-foreground">키오스크 모드 선택</h1>
        <p className="text-lg text-muted-foreground mt-2">진행할 활동을 선택해주세요.</p>
      </div>

      <motion.div 
        className="grid md:grid-cols-2 gap-8"
        initial="hidden"
        animate="visible"
        variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1 } }
        }}
      >
        {kioskOptions.map((option, i) => (
            <motion.div key={i} variants={{hidden: {opacity: 0, y: 20}, visible: {opacity: 1, y: 0}}}>
                <Link href={option.href} className="block h-full">
                    <Card className="h-full hover:border-primary hover:shadow-lg transition-all flex flex-col text-center">
                        <CardHeader>
                            <option.icon className="h-12 w-12 mx-auto text-primary mb-4"/>
                            <CardTitle>{option.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <CardDescription>{option.description}</CardDescription>
                        </CardContent>
                    </Card>
                </Link>
            </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
