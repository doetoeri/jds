
'use client';

import { Bird, HardHat } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4 bg-gray-50">
       <div className="flex items-center gap-4 text-primary mb-6">
         <HardHat className="h-12 w-12" />
         <Bird className="h-16 w-16" />
       </div>
      <h1 className="text-4xl font-bold font-headline text-gray-800 mb-2">
        시스템 점검 중
      </h1>
      <p className="text-lg text-gray-600 max-w-md">
        보다 나은 서비스 제공을 위해 잠시 시스템을 점검하고 있습니다.
        불편을 드려 죄송하며, 최대한 빨리 마무리하도록 하겠습니다.
      </p>
       <p className="mt-8 text-sm text-gray-500">
        - 고촌중학교 학생 자치회 -
      </p>
    </div>
  );
};
