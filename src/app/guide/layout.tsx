
import type { ReactNode } from "react";

export default function GuideLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full isolate flex flex-col items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-4xl my-8">
        {children}
      </div>
    </div>
  );
}
