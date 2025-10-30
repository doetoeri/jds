

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
import { auth, useCode, db } from '@/lib/firebase';
import { Loader2, QrCode, CameraOff, UserPlus, Info, Sparkles } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import jsQR from 'jsqr';
import { collection, doc, onSnapshot } from 'firebase/firestore';


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

  const [isPartnerDialogVisible, setIsPartnerDialogVisible] = useState(false);
  const [partnerStudentId, setPartnerStudentId] = useState('');
  const [isConfirmingPartner, setIsConfirmingPartner] = useState(false);

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
  
  const confirmAndUseCode = async (codeToUse: string, partnerId?: string) => {
      if (!user) {
          toast({ title: "오류", description: "로그인이 필요합니다.", variant: "destructive" });
          return;
      }
      setIsConfirmingPartner(true); 
      setIsLoading(true);

      try {
          const result = await useCode(user.uid, codeToUse, partnerId);
          if (result.success) {
              toast({
                  title: "성공!",
                  description: result.message,
              });
              setCode('');
              setPartnerStudentId('');
              closeScanner();
              setIsPartnerDialogVisible(false);
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
          setIsConfirmingPartner(false);
      }
  }


  const handleUseCode = useCallback(async (scannedCode: string) => {
    const codeToUse = scannedCode.trim().toUpperCase();
    if (!codeToUse) {
      toast({ title: "오류", description: "코드를 입력해주세요.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "오류", description: "로그인이 필요합니다.", variant: "destructive" });
      return;
    }

    // New: If the code is a 5-digit number, treat it as a friend invite and directly use it.
    if (/^\d{5}$/.test(codeToUse)) {
        await confirmAndUseCode(codeToUse);
        return;
    }
    
    setIsLoading(true);
    const { getDocs, query, collection, where } = await import('firebase/firestore');
    const codeQuery = query(collection(db, 'codes'), where('code', '==', codeToUse));
    const codeSnapshot = await getDocs(codeQuery);

    
    if (codeSnapshot.empty) {
        setIsLoading(false);
        toast({ title: "오류", description: "유효하지 않은 코드입니다.", variant: "destructive" });
        return;
    }
    
    setIsLoading(false); // Stop loading after initial checks
    
    const codeData = !codeSnapshot.empty ? codeSnapshot.docs[0].data() : null;

    if (codeData?.type === '히든코드' && !codeData.used) {
        setCode(codeToUse);
        setIsPartnerDialogVisible(true);
        return; 
    }
    
    await confirmAndUseCode(codeToUse);

  }, [user, toast, closeScanner]);

  const tick = useCallback(() => {
    if (isLoading || isPartnerDialogVisible || isConfirmingPartner) return;
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
            closeScanner();
            handleUseCode(qrCode.data);
            return; 
          }
        }
      }
    }
    animationFrameId.current = requestAnimationFrame(tick);
  }, [isLoading, handleUseCode, closeScanner, isPartnerDialogVisible, isConfirmingPartner]);

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

  const handlePartnerConfirm = () => {
      if (!partnerStudentId) {
          toast({ title: "입력 오류", description: "친구의 학번을 입력해주세요.", variant: "destructive" });
          return;
      }
      confirmAndUseCode(code, partnerStudentId);
  }

  return (
    <>
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline">코드 사용하기</h1>
        <p className="text-muted-foreground">코드를 직접 입력하거나, QR/바코드를 스캔하여 포인트를 적립하세요.</p>
      </div>

      <div className="max-w-md mx-auto grid gap-6">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>코드 또는 친구 학번 입력</CardTitle>
            <CardDescription>
                {isScannerOpen ? "QR 코드를 중앙에 맞춰주세요." : "코드를 입력하거나 스캔하세요."}
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
                      <Label htmlFor="code">코드 또는 학번</Label>
                      <Input 
                        id="code" 
                        placeholder="이벤트 코드 또는 친구의 학번 입력" 
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        disabled={isLoading || isConfirmingPartner}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row justify-end gap-2">
                  <Button className="w-full sm:w-auto" type="button" onClick={openScanner} disabled={isLoading || isConfirmingPartner}>
                    <QrCode className="mr-2 h-4 w-4" />
                    QR/바코드 스캔하기
                  </Button>
                  <Button type="submit" className="font-bold w-full sm:w-auto" disabled={isLoading || isConfirmingPartner || !code}>
                    {(isLoading || isConfirmingPartner) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    사용하기
                  </Button>
                </CardFooter>
              </form>
            </>
          )}
        </Card>
        <Alert className="mt-6">
            <Info className="h-4 w-4" />
            <AlertTitle className="font-semibold">코드 사용 팁!</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
                 <div className="flex items-start gap-2">
                   <UserPlus className="h-4 w-4 mt-0.5 text-primary flex-shrink-0"/>
                   <p>
                     <strong className="text-primary">친구 초대:</strong> 친구의 5자리 학번을 입력하면, 나와 친구 모두 포인트를 받습니다!
                   </p>
                 </div>
                 <div className="flex items-start gap-2">
                   <Sparkles className="h-4 w-4 mt-0.5 text-primary flex-shrink-0"/>
                   <p><strong className="text-primary">히든코드:</strong> 학교에 숨겨진 코드로, 입력 시 파트너의 학번이 필요하며 두 사람 모두에게 보상이 지급됩니다.</p>
                 </div>
            </AlertDescription>
        </Alert>
      </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2021/08/04/audio_c668156e54.mp3" preload="auto" />
      

       <AlertDialog open={isPartnerDialogVisible} onOpenChange={setIsPartnerDialogVisible}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserPlus />
              파트너 지정하기
            </AlertDialogTitle>
            <AlertDialogDescription>
              이 코드는 파트너와 함께 사용하는 코드입니다! 함께 포인트를 받을 친구의 5자리 학번을 입력해주세요. 본인과 입력한 친구 모두에게 보상이 지급됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="partner-id" className="text-right">
                친구 학번
              </Label>
              <Input
                id="partner-id"
                placeholder="예: 10203"
                value={partnerStudentId}
                onChange={(e) => setPartnerStudentId(e.target.value)}
                className="col-span-3"
                disabled={isConfirmingPartner}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isConfirmingPartner}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handlePartnerConfirm} disabled={!partnerStudentId || isConfirmingPartner}>
              {isConfirmingPartner && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
