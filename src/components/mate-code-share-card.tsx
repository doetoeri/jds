
'use client';

import React, { forwardRef } from 'react';
import Image from 'next/image';
import { Bird, Instagram } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';

interface MateCodeShareCardProps {
  displayName: string;
  mateCode: string;
  qrCodeUrl: string | null;
  avatarGradient: string; // Used for the aurora background
}

export const MateCodeShareCard = forwardRef<HTMLDivElement, MateCodeShareCardProps>(
  ({ displayName, mateCode, qrCodeUrl, avatarGradient }, ref) => {
    
    const gradientClasses: { [key: string]: { from: string; to: string } } = {
        blue: { from: 'from-blue-400', to: 'to-sky-500' },
        orange: { from: 'from-orange-400', to: 'to-amber-500' },
        purple: { from: 'from-purple-400', to: 'to-violet-500' },
        red: { from: 'from-red-400', to: 'to-rose-500' },
        amber: { from: 'from-amber-400', to: 'to-yellow-500' },
        lime: { from: 'from-lime-400', to: 'to-green-500' },
        emerald: { from: 'from-emerald-400', to: 'to-teal-500' },
        sky: { from: 'from-sky-400', to: 'to-cyan-500' },
        violet: { from: 'from-violet-400', to: 'to-indigo-500' },
    }
    
    const auroraFrom = gradientClasses[avatarGradient]?.from || 'from-orange-400';
    const auroraTo = gradientClasses[avatarGradient]?.to || 'to-amber-500';

    return (
      // The outer container that provides the colorful background to be blurred
      <div
        ref={ref}
        className='w-[320px] h-[568px] bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden'
      >
        {/* Aurora background effect */}
        <div className={cn("absolute -top-1/4 -left-1/4 w-96 h-96 rounded-full mix-blend-lighten filter blur-3xl opacity-40 animate-pulse", auroraFrom)}></div>
        <div className={cn("absolute -bottom-1/4 -right-1/4 w-96 h-96 rounded-full mix-blend-lighten filter blur-3xl opacity-40 animate-pulse delay-1000", auroraTo)}></div>

        {/* The Glassmorphism Card */}
        <div className="w-full h-full bg-white/20 backdrop-blur-xl rounded-3xl border border-white/30 shadow-soft-xl flex flex-col items-center justify-between p-6 text-white font-headline">
          
          {/* Header */}
          <div className="text-center">
              <Bird className="h-8 w-8 mx-auto" />
              <h1 className="text-xl font-bold mt-1">JongDalSam Hub</h1>
          </div>

          {/* Main Content */}
          <div className="text-center my-6">
              <p className="text-md opacity-80">from. {displayName}</p>
              <p className="text-6xl font-black tracking-widest my-2 text-shadow-lg">{mateCode}</p>
              <div className="bg-black/20 px-4 py-1.5 rounded-full inline-block">
                <p className="font-body text-xs">
                    위 코드를 입력하고 함께 포인트를 받으세요!
                </p>
              </div>
          </div>
          
          {/* QR Code Section */}
          <div className="bg-white p-2 rounded-lg shadow-lg">
              {qrCodeUrl ? (
                  <Image src={qrCodeUrl} alt="Mate Code QR" width={100} height={100} />
              ) : (
                  <Skeleton className="w-[100px] h-[100px]" />
              )}
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
             <div className="flex items-center justify-center gap-2">
                <Instagram className="h-4 w-4"/>
                <p className="font-body text-sm opacity-90">jongdalsam.shop</p>
             </div>
          </div>

        </div>
      </div>
    );
  }
);

MateCodeShareCard.displayName = 'MateCodeShareCard';
