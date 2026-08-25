import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RotateCw, Check, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Start Camera Stream
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      setCameraError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setCameraError(null);

    const startCamera = async () => {
      stopCamera();
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          newStream.getTracks().forEach(track => track.stop());
          return;
        }

        setStream(newStream);
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
        setIsLoading(false);
      } catch (err: any) {
        console.error("Camera access error:", err);
        if (isMounted) {
          setIsLoading(false);
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setCameraError('تم رفض إذن الوصول إلى الكاميرا. يرجى تفعيل الإذن من إعدادات المتصفح.');
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            setCameraError('لم يتم العثور على أي كاميرا متصلة بالجهاز.');
          } else {
            setCameraError('تعذر فتح الكاميرا مباشرة. يمكنك استخدام خيار رفع الصور.');
          }
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setCapturedImage(dataUrl);
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-xl bg-[#141414] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <Camera size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#F5F5DC]">التقاط صورة بالكاميرا</h3>
              <p className="text-[10px] sm:text-xs text-[#808080]">التقط صورة لتسأل Akasha AI عنها</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#A0A0A0] hover:text-white rounded-xl hover:bg-white/5 active:scale-95 transition-all"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewport / Live stream / Preview */}
        <div className="relative flex-1 min-h-[300px] sm:min-h-[380px] bg-black flex items-center justify-center overflow-hidden">
          {isLoading && !cameraError && (
            <div className="flex flex-col items-center gap-2.5 text-center p-4">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-xs text-[#A0A0A0]">جاري تشغيل الكاميرا...</span>
            </div>
          )}

          {cameraError ? (
            <div className="p-6 text-center space-y-3 max-w-sm">
              <AlertCircle size={36} className="text-red-400 mx-auto" />
              <p className="text-xs sm:text-sm text-red-300 leading-relaxed">{cameraError}</p>
              
              {/* Fallback standard native camera input */}
              <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-accent active:scale-95 transition-all">
                <Camera size={16} />
                <span>التقاط من تطبيق الكاميرا للجهاز</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          onCapture(event.target.result as string);
                          onClose();
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
          ) : capturedImage ? (
            <img 
              src={capturedImage} 
              alt="Captured preview" 
              className="w-full h-full object-contain max-h-[50vh]"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover max-h-[50vh]"
            />
          )}

          {/* Hidden Canvas for capture rendering */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-black/60 border-t border-white/10 flex items-center justify-between">
          {!capturedImage && !cameraError ? (
            <>
              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-3 bg-white/5 hover:bg-white/10 text-[#A0A0A0] hover:text-white rounded-2xl active:scale-95 transition-all flex items-center gap-2 text-xs font-medium"
                title="تبديل الكاميرا (أمامية/خلفية)"
              >
                <RotateCw size={18} />
                <span className="hidden sm:inline">تبديل الكاميرا</span>
              </button>

              <button
                type="button"
                onClick={handleCapture}
                disabled={isLoading}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary hover:bg-accent p-1.5 shadow-lg shadow-primary/30 active:scale-90 transition-all flex items-center justify-center border-4 border-white/20"
                aria-label="Capture photo"
              >
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-primary">
                  <Camera size={24} />
                </div>
              </button>

              <div className="w-10 sm:w-24" />
            </>
          ) : capturedImage ? (
            <div className="w-full flex items-center justify-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/15 text-[#F5F5DC] rounded-xl font-bold text-xs sm:text-sm active:scale-95 transition-all"
              >
                إعادة التقاط
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-3 px-4 bg-primary hover:bg-accent text-white rounded-xl font-bold text-xs sm:text-sm active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                <Check size={18} />
                <span>استخدام الصورة</span>
              </button>
            </div>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-5 bg-white/10 hover:bg-white/15 text-[#F5F5DC] rounded-xl font-bold text-xs sm:text-sm active:scale-95 transition-all"
              >
                إغلاق
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
