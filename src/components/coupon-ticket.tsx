'use client';

import React, { forwardRef, useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { Skeleton } from './ui/skeleton';

interface CouponTicketProps {
  code: string;
  value: number;
}

export const CouponTicket = forwardRef<HTMLDivElement, CouponTicketProps>(
  ({ code, value }, ref) => {
    const [qrCodeUrl, setQrCodeUrl] = useState('');

    useEffect(() => {
      const generateQr = async () => {
        try {
          const url = await QRCode.toDataURL(code, {
            width: 150,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#00000000', // Transparent background
            },
          });
          setQrCodeUrl(url);
        } catch (err) {
          console.error('Failed to generate QR code', err);
        }
      };

      if (code) {
        generateQr();
      }
    }, [code]);

    const TicketContent = () => (
      <div className="flex flex-col items-center justify-center h-full py-10 px-4 relative gap-10">
        <div className="text-center w-full">
            <h2 className="font-batang text-4xl font-bold text-primary">Jongdal Code</h2>
            <p className="mt-2 text-xs text-primary">
                jongdalsam.shop에서 소중한 친구와 라크를 나눠보세요.
            </p>
        </div>

        <div className="flex flex-row items-center justify-around w-full">
            <div className="flex flex-col items-center gap-2">
                {qrCodeUrl ? (
                    <Image src={qrCodeUrl} alt={`QR Code for ${code}`} width={80} height={80} />
                ) : (
                    <Skeleton className="w-[80px] h-[80px]" />
                )}
                <p className="font-batang font-bold text-xl tracking-widest text-primary">{code}</p>
            </div>
            <div className="flex flex-col items-center gap-2">
                {qrCodeUrl ? (
                    <Image src={qrCodeUrl} alt={`QR Code for ${code}`} width={80} height={80} />
                ) : (
                    <Skeleton className="w-[80px] h-[80px]" />
                )}
                <p className="font-batang font-bold text-xl tracking-widest text-primary">{code}</p>
            </div>
        </div>

        <div className="text-2xl font-batang text-primary font-bold">
            {value} Lak
        </div>
      </div>
    );

    return (
      <div
        ref={ref}
        className="w-[300px] h-[480px] bg-gradient-to-b from-white to-primary/20 rounded-3xl overflow-hidden relative shadow-lg"
      >
        <div className="absolute inset-0">
          <TicketContent />
        </div>
      </div>
    );
  }
);

CouponTicket.displayName = 'CouponTicket';
