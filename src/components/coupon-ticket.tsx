
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
            width: 150, // Smaller QR for smaller coupon
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
    
    const getDescription = () => {
        switch (type) {
            case '히든코드':
                return '파트너와 함께 코드를 사용하고 두 배의 라크를 받으세요!';
            case '선착순코드':
                return '선착순으로 사용 가능한 코드입니다. 서두르세요!';
            default:
                return 'jongdalsam.shop에서 라크를 사용해보세요.';
        }
    }
    
    return (
      <div
        ref={ref}
        className="w-[360px] h-[225px] bg-gradient-to-r from-orange-50 via-white to-orange-50 rounded-xl overflow-hidden relative shadow-md flex items-center p-4 gap-4"
        style={{ fontFamily: "'Gowun Batang', serif" }}
      >
          {/* Left Side */}
          <div className="flex-1 flex flex-col justify-between h-full py-1">
              <div className="text-left">
                  <h2 className="text-3xl font-bold text-primary flex items-center gap-2">
                      <Bird className="h-7 w-7"/>
                      종달코드
                  </h2>
                  <p className="mt-1 text-xs text-primary/80">
                      {getDescription()}
                  </p>
              </div>

              <div className="text-left">
                  <p className="text-3xl text-primary font-bold">{value} Lak</p>
                  <p className="text-[10px] text-primary/80 -mt-1">고촌중학교 학생 자치회</p>
              </div>
          </div>
          
          {/* Right Side */}
          <div className="flex flex-col items-center justify-center gap-1">
              {qrCodeUrl ? (
                  <Image src={qrCodeUrl} alt={`QR Code for ${code}`} width={150} height={150} />
              ) : (
                  <Skeleton className="w-[150px] h-[150px]" />
              )}
              <p className="font-mono font-bold text-2xl tracking-widest text-primary">{code}</p>
          </div>
      </div>
    );
  }
);

CouponTicket.displayName = 'CouponTicket';
