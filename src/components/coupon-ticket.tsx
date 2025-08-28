
'use client';

import React, { forwardRef, useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { Skeleton } from './ui/skeleton';
import { Bird, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CouponTicketProps {
  code: string;
  value: number;
  type: '종달코드' | '메이트코드' | '온라인 특수코드' | '히든코드' | '선착순코드';
}

export const CouponTicket = forwardRef<HTMLDivElement, CouponTicketProps>(
  ({ code, value, type }, ref) => {
    const [codeQrUrl, setCodeQrUrl] = useState('');
    const [pageQrUrl, setPageQrUrl] = useState('');

    useEffect(() => {
      const generateQr = async (text: string, setUrl: (url: string) => void) => {
        try {
          const url = await QRCode.toDataURL(text, {
            width: 150, 
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
          });
          setUrl(url);
        } catch (err) {
          console.error('Failed to generate QR code', err);
        }
      };

      if (code) {
        generateQr(code, setCodeQrUrl);
        generateQr('https://jongdalsam.shop/dashboard/codes', setPageQrUrl);
      }
    }, [code]);
    
    const valueToGradient: { [key: number]: string } = {
        1: 'from-amber-400/80',
        3: 'from-lime-400/80',
        5: 'from-emerald-400/80',
        7: 'from-sky-400/80',
        10: 'from-violet-400/80',
    };

    const gradientClass = valueToGradient[value] || 'from-orange-400/80';

    return (
        <div
            ref={ref}
            className={cn(
                "w-[250px] h-[400px] rounded-2xl overflow-hidden relative shadow-soft-lg flex flex-col font-headline bg-gradient-to-b to-white",
                gradientClass
            )}
        >
            {/* Header */}
            <div className="text-center p-3 text-gray-800">
                <div className="flex items-center justify-center gap-1.5">
                    <Bird className="h-5 w-5" />
                    <h2 className="text-lg font-bold">
                        종달샘 포인트 쿠폰
                    </h2>
                </div>
            </div>

            {/* Value */}
            <div className="text-center my-auto py-2">
                <p className="text-6xl font-bold text-gray-800 tracking-tighter">{value}</p>
                <p className="text-2xl font-semibold text-gray-700 -mt-2">포인트</p>
            </div>
            
            {/* QR Codes Section */}
            <div className="border-t border-b border-gray-200/50 grid grid-cols-2 gap-px bg-gray-200/50 backdrop-blur-sm bg-white/30">
                <div className="flex flex-col items-center justify-center p-2">
                    {codeQrUrl ? (
                        <Image src={codeQrUrl} alt={`QR Code for ${code}`} width={80} height={80} />
                    ) : (
                        <Skeleton className="w-[80px] h-[80px]" />
                    )}
                    <p className="mt-1 font-mono font-bold text-lg tracking-wider text-gray-800">{code}</p>
                    <p className="text-[10px] font-semibold text-gray-500">코드 사용하기</p>
                </div>
                 <div className="flex flex-col items-center justify-center p-2">
                    {pageQrUrl ? (
                        <Image src={pageQrUrl} alt="Page QR Code" width={80} height={80} />
                    ) : (
                        <Skeleton className="w-[80px] h-[80px]" />
                    )}
                    <QrCode className="h-4 w-4 mt-1.5 text-gray-600"/>
                    <p className="text-[10px] font-semibold text-gray-500 mt-0.5">코드 등록 페이지로 가기</p>
                </div>
            </div>
            
            {/* Footer */}
            <div className="text-center text-xs text-gray-500 p-2 mt-auto">
                <p className="font-bold">jongdalsam.shop</p>
            </div>
        </div>
    );
  }
);

CouponTicket.displayName = 'CouponTicket';
