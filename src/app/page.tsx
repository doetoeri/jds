'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Bird, Coins, Gift, MessageSquare } from 'lucide-react';

const GlassmorphismLanding = () => {
  const floatingIcons = [
    { icon: Coins, className: 'top-[10%] left-[15%] w-10 h-10 text-yellow-300', delay: 0 },
    { icon: Gift, className: 'top-[20%] right-[10%] w-14 h-14 text-pink-300', delay: 1 },
    { icon: MessageSquare, className: 'bottom-[15%] left-[20%] w-12 h-12 text-blue-300', delay: 2 },
    { icon: Bird, className: 'bottom-[25%] right-[25%] w-16 h-16 text-orange-300', delay: 0.5 },
  ];

  return (
    <main className="relative min-h-screen w-full overflow-hidden flex items-center justify-center p-4 bg-[#1a1a2e]">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute bottom-0 left-[-20%] right-0 top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(255,0,182,0.15),rgba(255,255,255,0))]"></div>
        <div className="absolute bottom-[-40%] right-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(0,102,255,0.15),rgba(255,255,255,0))]"></div>
      </div>
      
       {/* Floating Icons */}
       <div className="absolute inset-0 z-10 overflow-hidden">
          {floatingIcons.map((item, index) => (
            <div key={index} className={`floating-icon absolute ${item.className}`} style={{ animationDelay: `${item.delay}s` }}>
              <item.icon className="w-full h-full drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
            </div>
          ))}
      </div>


      {/* Glassmorphism Card */}
      <div className="relative z-20 flex flex-col items-center justify-center text-center w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-orange-400/20 bg-orange-400/10">
          <Bird className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-headline text-5xl font-bold text-white drop-shadow-lg">
          종달샘 허브
        </h1>
        <p className="mt-4 max-w-md text-lg text-white/70 drop-shadow">
          고촌중학교 학생자치회 종달샘에 오신 것을 환영합니다. 포인트를
          관리하고 다양한 활동에 참여해보세요.
        </p>
        <div className="mt-8 flex w-full flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="font-bold w-full sm:w-auto">
            <Link href="/login">로그인</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="font-bold w-full sm:w-auto border-primary/50 bg-primary/10 text-white hover:bg-primary/20 hover:text-white"
          >
            <Link href="/signup">회원가입</Link>
          </Button>
        </div>
      </div>
      
       <style jsx global>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        .floating-icon {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>

    </main>
  );
};

export default GlassmorphismLanding;
