'use client';

import React, { forwardRef, useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { Skeleton } from './ui/skeleton';

interface CouponTicketProps {
  code: string;
  value: number;
  type: '종달코드' | '메이트코드' | '온라인 특수코드';
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

    const CodeDisplay = ({ qrUrl, codeStr }: { qrUrl: string, codeStr: string }) => (
        <div className="flex flex-col items-center justify-center gap-4">
            {qrUrl ? (
                <Image src={qrUrl} alt={`QR Code for ${codeStr}`} width={120} height={120} />
            ) : (
                <Skeleton className="w-[120px] h-[120px]" />
            )}
            <p className="font-batang font-bold text-3xl tracking-widest text-primary">{codeStr}</p>
        </div>
    );
    
    return (
      <div
        ref={ref}
        className="w-[300px] h-[480px] bg-gradient-to-b from-white to-primary/20 rounded-3xl overflow-hidden relative shadow-lg"
      >
        <div className="flex flex-col items-center justify-center h-full py-10 px-4 relative gap-10">
            <div className="text-center w-full">
                <h2 className="font-batang text-4xl font-bold text-primary">Jongdal Code</h2>
                <p className="mt-2 text-xs text-primary">
                    jongdalsam.shop에서 소중한 친구와 라크를 나눠보세요.
                </p>
            </div>
    
            <CodeDisplay qrUrl={qrCodeUrl} codeStr={code} />

            <div className="text-2xl font-batang text-primary font-bold">
                {value} Lak
            </div>
        </div>
      </div>
    );
  }
);

CouponTicket.displayName = 'CouponTicket';
