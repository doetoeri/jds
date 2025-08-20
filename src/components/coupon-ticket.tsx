'use client';

import React, { forwardRef, useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { Skeleton } from './ui/skeleton';

interface CouponTicketProps {
  code: string;
  value: number;
  type: '종달코드' | '메이트코드' | '온라인 특수코드' | '히든코드';
}

export const CouponTicket = forwardRef<HTMLDivElement, CouponTicketProps>(
  ({ code, value, type }, ref) => {
    const [qrCodeUrl1, setQrCodeUrl1] = useState('');
    const [qrCodeUrl2, setQrCodeUrl2] = useState('');

    const codes = type === '히든코드' ? code.split(' & ') : [code];

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

      if (codes[0]) {
        generateQr(codes[0], setQrCodeUrl1);
      }
      if (codes[1]) {
        generateQr(codes[1], setQrCodeUrl2);
      }
    }, [code, type]); // Rerun when code or type changes

    const SingleCodeDisplay = ({ qrUrl, codeStr }: { qrUrl: string, codeStr: string }) => (
        <div className="flex flex-col items-center justify-center gap-4">
            {qrUrl ? (
                <Image src={qrUrl} alt={`QR Code for ${codeStr}`} width={120} height={120} />
            ) : (
                <Skeleton className="w-[120px] h-[120px]" />
            )}
            <p className="font-batang font-bold text-3xl tracking-widest text-primary">{codeStr}</p>
        </div>
    );
    
    const PairedCodeDisplay = ({ qrUrl1, qrUrl2, codeStr1, codeStr2 }: { qrUrl1: string, qrUrl2: string, codeStr1: string, codeStr2: string }) => (
       <div className="flex flex-row items-center justify-around w-full">
            <div className="flex flex-col items-center gap-2">
                {qrUrl1 ? (
                    <Image src={qrUrl1} alt={`QR Code for ${codeStr1}`} width={80} height={80} />
                ) : (
                    <Skeleton className="w-[80px] h-[80px]" />
                )}
                <p className="font-batang font-bold text-xl tracking-widest text-primary">{codeStr1}</p>
            </div>
            <div className="flex flex-col items-center gap-2">
                {qrUrl2 ? (
                    <Image src={qrUrl2} alt={`QR Code for ${codeStr2}`} width={80} height={80} />
                ) : (
                    <Skeleton className="w-[80px] h-[80px]" />
                )}
                <p className="font-batang font-bold text-xl tracking-widest text-primary">{codeStr2}</p>
            </div>
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
    
            {type === '히든코드' ? (
                <PairedCodeDisplay qrUrl1={qrCodeUrl1} qrUrl2={qrCodeUrl2} codeStr1={codes[0]} codeStr2={codes[1]} />
            ) : (
                <SingleCodeDisplay qrUrl={qrCodeUrl1} codeStr={codes[0]} />
            )}

            <div className="text-2xl font-batang text-primary font-bold">
                {value} Lak
            </div>
        </div>
      </div>
    );
  }
);

CouponTicket.displayName = 'CouponTicket';
