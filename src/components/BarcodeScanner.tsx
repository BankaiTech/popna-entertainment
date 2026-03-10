// Barcode Scanner - camera-based using BarcodeDetector API + manual input fallback
import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X, Camera, ScanBarcode, Keyboard } from 'lucide-react';

interface BarcodeScannerProps {
    onScan: (barcode: string) => void;
    onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
    const { t } = useTranslation();
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animFrameRef = useRef<number>(0);
    const [manualBarcode, setManualBarcode] = useState('');
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [mode, setMode] = useState<'camera' | 'manual'>('camera');
    const [hasBarcodeDetector] = useState(() => typeof window !== 'undefined' && 'BarcodeDetector' in window);

    const stopCamera = useCallback(() => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    }, []);

    const startCamera = useCallback(async () => {
        setCameraError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            if (!hasBarcodeDetector) {
                setCameraError(t('pos.noBarcodeDetector', 'Camera barcode detection is not supported in this browser. Use manual input instead.'));
                return;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const detector = new (window as any).BarcodeDetector({
                formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
            });

            const scan = async () => {
                if (!videoRef.current || videoRef.current.readyState < 2) {
                    animFrameRef.current = requestAnimationFrame(scan);
                    return;
                }
                try {
                    const barcodes = await detector.detect(videoRef.current);
                    if (barcodes.length > 0) {
                        const value = barcodes[0].rawValue;
                        if (value) {
                            stopCamera();
                            onScan(value);
                            return;
                        }
                    }
                } catch {
                    // detection can fail on some frames, continue
                }
                animFrameRef.current = requestAnimationFrame(scan);
            };
            animFrameRef.current = requestAnimationFrame(scan);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('NotAllowed') || msg.includes('Permission')) {
                setCameraError(t('pos.cameraPermissionDenied', 'Camera access denied. Please allow camera access or use manual input.'));
            } else {
                setCameraError(t('pos.cameraError', 'Could not access camera. Use manual input instead.'));
            }
            setMode('manual');
        }
    }, [hasBarcodeDetector, onScan, stopCamera, t]);

    useEffect(() => {
        if (mode === 'camera') startCamera();
        return stopCamera;
    }, [mode, startCamera, stopCamera]);

    const handleManualSubmit = () => {
        const code = manualBarcode.trim();
        if (code.length >= 4) {
            onScan(code);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-black/50">
                <h3 className="text-white font-semibold flex items-center gap-2">
                    <ScanBarcode className="w-5 h-5" />
                    {t('pos.scanBarcode', 'Scan Barcode')}
                </h3>
                <button
                    type="button"
                    onClick={() => { stopCamera(); onClose(); }}
                    className="p-2 rounded-full hover:bg-white/20 text-white min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Mode tabs */}
            <div className="shrink-0 flex gap-2 px-4 py-2">
                <button
                    type="button"
                    onClick={() => setMode('camera')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode === 'camera' ? 'bg-primary text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                >
                    <Camera className="w-4 h-4" /> {t('pos.camera', 'Camera')}
                </button>
                <button
                    type="button"
                    onClick={() => { stopCamera(); setMode('manual'); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode === 'manual' ? 'bg-primary text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                >
                    <Keyboard className="w-4 h-4" /> {t('pos.manual', 'Manual')}
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center px-4">
                {mode === 'camera' ? (
                    <div className="relative w-full max-w-md aspect-[4/3] rounded-xl overflow-hidden bg-gray-900">
                        <video
                            ref={videoRef}
                            className="w-full h-full object-cover"
                            playsInline
                            muted
                        />
                        {/* Scan guide overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-3/4 h-1/3 border-2 border-white/60 rounded-lg" />
                        </div>
                        {cameraError && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6">
                                <p className="text-white/80 text-sm text-center">{cameraError}</p>
                            </div>
                        )}
                        {!cameraError && (
                            <div className="absolute bottom-3 left-0 right-0 text-center">
                                <p className="text-white/70 text-xs">{t('pos.pointAtBarcode', 'Point camera at barcode')}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-full max-w-md space-y-4">
                        <div className="text-center mb-6">
                            <ScanBarcode className="w-12 h-12 text-white/40 mx-auto mb-3" />
                            <p className="text-white/70 text-sm">{t('pos.enterBarcodeManually', 'Enter barcode number manually')}</p>
                        </div>
                        <Input
                            value={manualBarcode}
                            onChange={(e) => setManualBarcode(e.target.value)}
                            placeholder={t('pos.barcodePlaceholder', 'Enter barcode number...')}
                            className="text-center text-lg bg-white/10 border-white/20 text-white placeholder:text-white/40"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                        />
                        <Button
                            onClick={handleManualSubmit}
                            className="w-full min-h-[48px]"
                            disabled={manualBarcode.trim().length < 4}
                        >
                            {t('pos.addProduct', 'Add Product')}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
