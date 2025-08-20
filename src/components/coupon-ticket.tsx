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
      <div className="flex flex-col items-center justify-between h-full py-16 px-8 relative">
        <div className="text-center w-full">
            <h2 className="font-batang text-5xl font-bold text-primary">Jongdal Code</h2>
            <p className="mt-2 text-sm text-primary">
                jongdalsam.shop에서 소중한 친구와 라크를 나눠보세요.
            </p>
        </div>

        <div className="flex flex-col items-center gap-6">
            {qrCodeUrl ? (
                <Image src={qrCodeUrl} alt={`QR Code for ${code}`} width={120} height={120} />
            ) : (
                <Skeleton className="w-[120px] h-[120px]" />
            )}
            <p className="font-batang font-bold text-3xl tracking-widest text-primary">{code}</p>
        </div>

        <div className="flex flex-col items-center gap-6">
            {qrCodeUrl ? (
                <Image src={qrCodeUrl} alt={`QR Code for ${code}`} width={120} height={120} />
            ) : (
                <Skeleton className="w-[120px] h-[120px]" />
            )}
            <p className="font-batang font-bold text-3xl tracking-widest text-primary">{code}</p>
        </div>

        <div className="absolute bottom-8 text-4xl font-batang text-primary font-bold">
            S
        </div>
      </div>
    );

    return (
      <div
        ref={ref}
        className="w-[300px] h-[480px] bg-white rounded-3xl overflow-hidden relative shadow-lg"
      >
        <Image
          src="/coupon-template.png"
          alt="Coupon background"
          layout="fill"
          objectFit="cover"
          quality={100}
        />
        <div className="absolute inset-0">
          <TicketContent />
        </div>
      </div>
    );
  }
);

CouponTicket.displayName = 'CouponTicket';
