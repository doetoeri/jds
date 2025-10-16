
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface LiquidToggleButtonProps {
  isPressed: boolean;
  onPressedChange: (isPressed: boolean) => void;
}

export function LiquidToggleButton({ isPressed, onPressedChange }: LiquidToggleButtonProps) {
  const [complete, setComplete] = useState(isPressed ? 100 : 0);

  useEffect(() => {
    setComplete(isPressed ? 100 : 0);
  }, [isPressed]);

  const handleClick = () => {
    onPressedChange(!isPressed);
  };

  const style = {
    '--complete': complete,
    '--checked': 'hsl(var(--primary))',
  } as React.CSSProperties;

  return (
    <>
      <button
        aria-label="toggle"
        aria-pressed={isPressed}
        className="liquid-toggle"
        onClick={handleClick}
        style={style}
      >
        <div className="indicator indicator--masked">
          <div className="mask"></div>
        </div>
        <div className="indicator__liquid">
          <div className="wrapper">
            <div className="liquids">
              <div className="liquid__shadow"></div>
              <div className="liquid__track"></div>
            </div>
          </div>
          <div className="cover"></div>
        </div>
      </button>
      <svg className="sr-only" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="goo">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="13"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -10"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
          <filter id="remove-black" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      -255 -255 -255 0 1"
              result="black-pixels"
            />
            <feMorphology
              in="black-pixels"
              operator="dilate"
              radius="0.5"
              result="smoothed"
            />
            <feComposite in="SourceGraphic" in2="smoothed" operator="out" />
          </filter>
        </defs>
      </svg>
    </>
  );
}
