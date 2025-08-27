
'use client';

import React, { forwardRef, useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { Skeleton } from './ui/skeleton';
import { Bird } from 'lucide-react';

interface CouponTicketProps {
  code: string;
  value: number;
  type: '종달코드' | '메이트코드' | '온라인 특수코드' | '히든코드' | '선착순코드';
}

export const CouponTicket = forwardRef<HTMLDivElement, CouponTicketProps>(
  ({ code, value, type }, ref) => {
    const [qrCodeUrl, setQrCodeUrl] = useState('');

    useEffect(() => {
      const generateQr = async (codeToQr: string, setUrl: (url: string) => void) => {
        try {
          const url = await QRCode.toDataURL(codeToQr, {
            width: 150, 
            margin: 1,
            color: {
              dark: '#000000',
              light: '#00000000', // Transparent background
            },
          });
          setUrl(url);
        } catch (err) {
          console.error('Failed to generate QR code', err);
        }
      };

      if (code) {
        generateQr(code, setQrCodeUrl);
      }
    }, [code]);
    
    return (
      <div
        ref={ref}
        className="w-[250px] h-[400px] bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl overflow-hidden relative shadow-lg flex flex-col p-5 font-headline"
      >
        {/* Header */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Bird className="h-6 w-6" />
            <h2 className="text-xl font-bold">
              종달샘 포인트 쿠폰
            </h2>
          </div>
          <p className="text-xs text-primary/80">고촌중학교 학생 자치회</p>
        </div>

        {/* Value */}
        <div className="text-center my-auto">
            <p className="text-6xl font-bold text-primary tracking-tighter">{value}</p>
            <p className="text-2xl font-semibold text-primary/90 -mt-2">포인트</p>
        </div>

        {/* QR & Code */}
        <div className="flex flex-col items-center justify-center gap-1 mb-4">
            {qrCodeUrl ? (
                <Image src={qrCodeUrl} alt={`QR Code for ${code}`} width={120} height={120} />
            ) : (
                <Skeleton className="w-[120px] h-[120px]" />
            )}
            <p className="font-mono font-bold text-2xl tracking-widest text-primary">{code}</p>
        </div>
        
        {/* Footer */}
        <div className="text-center text-xs text-primary/70 border-t-2 border-dashed border-primary/20 pt-3">
           <p className="font-bold">jongdalsam.web.app</p>
           <p className="mt-1">1. 웹사이트 접속 {'>'} 2. 코드사용 {'>'} 3. 코드입력/스캔</p>
        </div>
      </div>
    );
  }
);

CouponTicket.displayName = 'CouponTicket';
