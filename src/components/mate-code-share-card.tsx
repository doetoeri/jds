
'use client';

import React, { forwardRef } from 'react';
import Image from 'next/image';
import { Bird } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';

interface MateCodeShareCardProps {
  displayName: string;
  mateCode: string;
  qrCodeUrl: string | null;
  avatarGradient: string;
}

export const MateCodeShareCard = forwardRef<HTMLDivElement, MateCodeShareCardProps>(
  ({ displayName, mateCode, qrCodeUrl, avatarGradient }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'w-[300px] h-[533px] p-8 flex flex-col items-center justify-between text-white font-headline',
          `gradient-${avatarGradient}`
        )}
      >
        <div className="text-center">
            <Bird className="h-10 w-10 mx-auto" />
            <h1 className="text-2xl font-bold mt-2">JongDalSam Hub</h1>
            <p className="font-body opacity-80">함께 포인트를 모아봐요!</p>
        </div>

        <div className="text-center my-8">
            <p className="text-lg">from. {displayName}</p>
            <p className="text-6xl font-black tracking-widest my-4">{mateCode}</p>
            <p className="font-body text-sm bg-black/20 px-3 py-1 rounded-full">
                위 코드를 입력하고 함께 포인트를 받으세요!
            </p>
        </div>
        
        <div className="bg-white p-2 rounded-lg shadow-lg">
            {qrCodeUrl ? (
                <Image src={qrCodeUrl} alt="Mate Code QR" width={100} height={100} />
            ) : (
                <Skeleton className="w-[100px] h-[100px]" />
            )}
        </div>

        <p className="font-body text-sm mt-8 opacity-90">jongdalsam.shop</p>
      </div>
    );
  }
);

MateCodeShareCard.displayName = 'MateCodeShareCard';

    