
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gamepad2, Wrench } from 'lucide-react';

export default function TetrisPage() {
  return (
    <div className="flex flex-col items-center gap-4">
       <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center">
        <Gamepad2 className="mr-2 h-6 w-6" />
        테트리스
      </h1>
      <Card className="w-full max-w-md">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wrench/> 개발 중인 기능입니다</CardTitle>
            <CardDescription>테트리스 게임은 현재 열심히 만들고 있어요. 조금만 기다려주세요!</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-16">
            <Gamepad2 className="h-24 w-24 text-muted-foreground/50"/>
        </CardContent>
      </Card>
    </div>
  );
}
