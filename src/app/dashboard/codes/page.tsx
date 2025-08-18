'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { auth, useCode } from '@/lib/firebase';
import { Loader2, QrCode, CameraOff } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import jsQR from 'jsqr';


export default function CodesPage() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [user] = useAuthState(auth);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameId = useRef<number>();

  const closeScanner = useCallback(() => {
    setIsScannerOpen(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
    }
  }, []);

  const handleUseCode = useCallback(async (scannedCode: string) => {
    if (!scannedCode) {
      toast({ title: "오류", description: "코드를 입력해주세요.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "오류", description: "로그인이 필요합니다.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const result = await useCode(user.uid, scannedCode);
      if (result.success) {
        toast({
          title: "성공!",
          description: result.message,
        });
        setCode('');
        closeScanner(); // Close scanner on success
        if (audioRef.current) {
          audioRef.current.play();
        }
      } else {
        toast({
          title: "오류",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "치명적인 오류",
        description: error.message || "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, closeScanner]);

  const tick = useCallback(() => {
    if (isLoading) return;
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const context = canvas.getContext('2d');
        if (context) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (qrCode) {
            setCode(qrCode.data);
            handleUseCode(qrCode.data);
            return; // Stop scanning after finding a code
          }
        }
      }
    }
    animationFrameId.current = requestAnimationFrame(tick);
  }, [isLoading, handleUseCode]);

  useEffect(() => {
    if (isScannerOpen && hasCameraPermission) {
      animationFrameId.current = requestAnimationFrame(tick);
      return () => {
        if(animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current)
        }
      };
    }
  }, [isScannerOpen, hasCameraPermission, tick]);

  const openScanner = async () => {
    setIsScannerOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCameraPermission(true);
    } catch (err) {
      console.error("Camera Error:", err);
      setHasCameraPermission(false);
      toast({ title: "카메라 오류", description: "카메라를 사용할 수 없습니다. 권한을 확인해주세요.", variant: "destructive" });
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleUseCode(code);
  }

  return (
    <div className="flex justify-center items-start pt-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">코드 사용하기</CardTitle>
          <CardDescription>
            코드를 직접 입력하거나, QR/바코드를 스캔하여 Lak을 적립하세요.
          </CardDescription>
        </CardHeader>

        {isScannerOpen ? (
          <CardContent className="space-y-4">
             {hasCameraPermission === false ? (
                 <Alert variant="destructive">
                  <CameraOff className="h-4 w-4" />
                  <AlertTitle>카메라 접근 불가</AlertTitle>
                  <AlertDescription>
                    카메라 사용 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.
                  </AlertDescription>
                </Alert>
             ) : (
                <div className="relative">
                  <video ref={videoRef} className="w-full aspect-video rounded-md bg-black" autoPlay playsInline muted />
                   <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="w-full max-w-[200px] aspect-square border-4 border-white/50 rounded-lg shadow-lg"/>
                   </div>
                </div>
             )}
             <Button variant="outline" className="w-full" onClick={closeScanner}>스캐너 닫기</Button>
          </CardContent>
        ) : (
          <>
            <form onSubmit={handleManualSubmit}>
              <CardContent>
                <div className="grid w-full items-center gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="code">코드</Label>
                    <Input 
                      id="code" 
                      placeholder="코드를 입력하세요" 
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row justify-end gap-2">
                <Button variant="secondary" className="w-full sm:w-auto" type="button" onClick={openScanner} disabled={isLoading}>
                  <QrCode className="mr-2 h-4 w-4" />
                  QR/바코드 스캔하기
                </Button>
                <Button type="submit" className="font-bold w-full sm:w-auto" disabled={isLoading || !code}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  사용하기
                </Button>
              </CardFooter>
            </form>
          </>
        )}
      </Card>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2021/08/04/audio_c668156e54.mp3" preload="auto" />
    </div>
  );
}
