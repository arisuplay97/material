import { useState, useRef, useEffect, useCallback } from 'react';
import { useGetTrackingByCode, useReceiveTracking } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ScanLine, CheckCircle2, Camera, ArrowLeft, Package,
  Clock, AlertTriangle, MapPin, Keyboard, X, RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/browser';

/* ─── step type ─── */
type Step = 'scan' | 'preview' | 'foto' | 'success';

/* ─── anim variants ─── */
const slide = {
  enter:  { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 26 } },
  exit:   { opacity: 0, x: -40, transition: { duration: 0.2 } },
};

const pop = {
  hidden: { scale: 0, opacity: 0 },
  show:   { scale: 1, opacity: 1, transition: { type: 'spring' as const, stiffness: 320, damping: 20, delay: 0.15 } },
};

/* ─── info row ─── */
function InfoRow({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex-shrink-0 pt-0.5">{label}</span>
      <span className={`font-medium text-right text-sm ${accent || ''}`}>{value}</span>
    </div>
  );
}

/* ─── main page ─── */
export default function Receive() {
  const { toast } = useToast();
  const [step, setStep]         = useState<Step>('scan');
  const [scannedCode, setScannedCode] = useState('');
  const [manualCode, setManualCode]   = useState('');
  const [showManual, setShowManual]   = useState(false);
  const [scanActive, setScanActive]   = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isCameraPhoto, setIsCameraPhoto] = useState(false);
  const [gps, setGps] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [notes, setNotes] = useState('');

  const videoScanRef  = useRef<HTMLVideoElement>(null);
  const videoFotoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const readerRef     = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef   = useRef<{ stop: () => void } | null>(null);

  /* ── look up tracking from scanned code ── */
  const { data: tracking, isFetching: isLookingUp, error: lookupError } = useGetTrackingByCode(
    scannedCode,
    { query: { enabled: !!scannedCode && step === 'preview' } }
  );

  const receiveMutation = useReceiveTracking();

  /* ── start barcode scanner ── */
  const startScanner = useCallback(async () => {
    setScanActive(true);
    setShowManual(false);
    try {
      readerRef.current = new BrowserMultiFormatReader();
      const controls = await readerRef.current.decodeFromVideoDevice(
        undefined,
        videoScanRef.current!,
        (result, err) => {
          if (result) {
            const text = result.getText();
            stopScanner();
            setScannedCode(text.toUpperCase());
            setStep('preview');
          }
          // ignore NotFoundException (no barcode in frame yet)
        }
      );
      controlsRef.current = controls;
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Kamera Gagal', description: err.message });
      setScanActive(false);
    }
  }, [toast]);

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    readerRef.current = null;
    setScanActive(false);
  }, []);

  /* ── cleanup on unmount ── */
  useEffect(() => () => {
    stopScanner();
    stopFotoCamera();
  }, []);

  /* ── capture GPS ── */
  const captureGPS = useCallback(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      pos => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
    );
  }, []);

  /* ── foto camera ── */
  const startFotoCamera = async () => {
    setIsCameraPhoto(true);
    captureGPS();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoFotoRef.current) videoFotoRef.current.srcObject = stream;
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Kamera Gagal', description: err.message });
      setIsCameraPhoto(false);
    }
  };

  const takeFoto = () => {
    if (!videoFotoRef.current || !canvasRef.current) return;
    const v = videoFotoRef.current;
    const c = canvasRef.current;
    c.width  = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')?.drawImage(v, 0, 0);
    setPhotoDataUrl(c.toDataURL('image/jpeg', 0.85));
    stopFotoCamera();
  };

  const stopFotoCamera = () => {
    if (videoFotoRef.current?.srcObject) {
      (videoFotoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setIsCameraPhoto(false);
  };

  /* ── confirm receive ── */
  const handleConfirm = () => {
    if (!tracking) return;
    receiveMutation.mutate(
      { id: tracking.id, data: { qrScannedCode: scannedCode, notes: notes || undefined } },
      {
        onSuccess: () => setStep('success'),
        onError: (err: any) => {
          toast({ variant: 'destructive', title: 'Gagal', description: err?.data?.error || 'Kesalahan sistem' });
        },
      }
    );
  };

  /* ── reset all ── */
  const reset = () => {
    setStep('scan');
    setScannedCode('');
    setManualCode('');
    setPhotoDataUrl(null);
    setGps(null);
    setNotes('');
  };

  /* ── manual submit ── */
  const handleManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    stopScanner();
    setScannedCode(manualCode.trim().toUpperCase());
    setStep('preview');
  };

  /* ── SLA display ── */
  const slaHours = tracking?.hoursRemaining;
  const slaColor = slaHours != null
    ? slaHours < 0   ? 'text-red-600'
    : slaHours < 24  ? 'text-amber-600'
    : 'text-green-700'
    : 'text-muted-foreground';

  return (
    <div className="min-h-screen bg-muted/10">
      {/* ── top nav ── */}
      <div className="sticky top-0 z-30 bg-background border-b border-border flex items-center gap-3 px-4 py-3">
        {step !== 'scan' && step !== 'success' && (
          <button
            onClick={() => { stopScanner(); stopFotoCamera(); setStep(step === 'foto' ? 'preview' : 'scan'); }}
            className="p-1.5 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1">
          <p className="font-serif font-bold text-lg leading-none">Penerimaan Cabang</p>
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
            {{scan:'Scan Barang', preview:'Verifikasi', foto:'Foto Dokumentasi', success:'Selesai'}[step]}
          </p>
        </div>
        {/* step dots */}
        <div className="flex items-center gap-1.5">
          {(['scan','preview','foto','success'] as Step[]).map((s, i) => (
            <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${
              step === s ? 'w-5 bg-primary' : (['scan','preview','foto','success'].indexOf(step) > i ? 'w-2 bg-primary/40' : 'w-2 bg-border')
            }`} />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ══════════════════════════════ STEP 1: SCAN ══════════════════════════════ */}
        {step === 'scan' && (
          <motion.div key="scan" variants={slide} initial="enter" animate="center" exit="exit"
            className="flex flex-col items-center p-4 pt-6 max-w-md mx-auto gap-4"
          >
            {/* Scanner viewfinder */}
            <div className="w-full aspect-square bg-black relative overflow-hidden shadow-xl">
              <video ref={videoScanRef} autoPlay playsInline className="w-full h-full object-cover" />

              {/* Scan overlay */}
              {scanActive && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* corner brackets */}
                  {['top-6 left-6','top-6 right-6','bottom-6 left-6','bottom-6 right-6'].map((pos, i) => (
                    <div key={i} className={`absolute w-8 h-8 border-white ${
                      i === 0 ? 'border-t-2 border-l-2' :
                      i === 1 ? 'border-t-2 border-r-2' :
                      i === 2 ? 'border-b-2 border-l-2' : 'border-b-2 border-r-2'
                    } ${pos}`} />
                  ))}
                  {/* scan line */}
                  <motion.div
                    className="absolute left-10 right-10 h-0.5 bg-primary/70"
                    animate={{ top: ['30%', '70%', '30%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <p className="font-mono text-[10px] text-white/70 uppercase tracking-wider">Arahkan ke QR / Barcode</p>
                  </div>
                </div>
              )}

              {!scanActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-4">
                  <ScanLine className="w-16 h-16 text-white/50" />
                  <p className="font-mono text-xs text-white/60 uppercase tracking-wider">Kamera tidak aktif</p>
                </div>
              )}
            </div>

            <Button
              onClick={scanActive ? stopScanner : startScanner}
              className={`w-full h-14 rounded-none font-mono uppercase tracking-widest text-sm font-bold ${
                scanActive ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'
              }`}
            >
              {scanActive
                ? <><X className="w-4 h-4 mr-2" /> Hentikan Scan</>
                : <><Camera className="w-4 h-4 mr-2" /> Mulai Scan Kamera</>
              }
            </Button>

            {/* Manual input toggle */}
            <button
              onClick={() => setShowManual(v => !v)}
              className="flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
            >
              <Keyboard className="w-3.5 h-3.5" />
              Input Manual
            </button>

            <AnimatePresence>
              {showManual && (
                <motion.form
                  key="manual"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="w-full overflow-hidden"
                  onSubmit={handleManual}
                >
                  <div className="flex gap-2 pt-1">
                    <Input
                      value={manualCode}
                      onChange={e => setManualCode(e.target.value.toUpperCase())}
                      placeholder="TRK-YYMMDD-XXXXXX"
                      className="rounded-none font-mono text-lg h-12 tracking-widest text-center border-border focus-visible:ring-0 focus-visible:border-primary bg-background"
                      autoFocus
                    />
                    <Button type="submit" disabled={!manualCode} className="h-12 rounded-none px-5">
                      OK
                    </Button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ══════════════════════════════ STEP 2: PREVIEW ══════════════════════════════ */}
        {step === 'preview' && (
          <motion.div key="preview" variants={slide} initial="enter" animate="center" exit="exit"
            className="p-4 pt-6 max-w-md mx-auto space-y-4"
          >
            {/* Scanned code chip */}
            <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 px-4 py-3">
              <ScanLine className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="font-mono font-bold text-primary tracking-widest flex-1 truncate">{scannedCode}</span>
              <button onClick={reset} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lookup state */}
            {isLookingUp ? (
              <div className="bg-background border border-border p-8 flex flex-col items-center gap-3">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <RefreshCw className="w-6 h-6 text-primary" />
                </motion.div>
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Mencari data...</p>
              </div>
            ) : lookupError ? (
              <div className="bg-red-50 border border-red-200 p-6 flex flex-col items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <p className="font-mono text-sm font-bold text-red-700">Kode tidak ditemukan</p>
                <p className="font-mono text-xs text-red-600">{scannedCode}</p>
                <Button onClick={reset} variant="outline" size="sm" className="rounded-none mt-2 font-mono text-xs uppercase">
                  Scan Ulang
                </Button>
              </div>
            ) : tracking ? (
              <>
                {/* Already received guard */}
                {tracking.status !== 'keluar_gudang' && (
                  <div className="bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <p className="font-mono text-xs text-amber-700">
                      Material ini sudah berstatus <strong>{tracking.status}</strong>.
                    </p>
                  </div>
                )}

                {/* Material card */}
                <div className="bg-background border border-border divide-y divide-border">
                  {/* header */}
                  <div className="bg-primary text-primary-foreground px-4 py-4">
                    <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1">Material</p>
                    <p className="font-serif text-2xl font-bold leading-tight">{tracking.materialName}</p>
                  </div>

                  <div className="px-4 divide-y divide-border">
                    <InfoRow label="Kode Tracking" value={<span className="font-mono text-primary font-bold">{tracking.trackingCode}</span>} />
                    <InfoRow label="Jumlah" value={`${tracking.qtyIssued} unit`} />
                    <InfoRow label="Cabang Tujuan" value={tracking.branchName || '—'} />
                    <InfoRow
                      label="SLA Tersisa"
                      value={slaHours != null
                        ? slaHours < 0
                          ? `Overdue ${Math.abs(Math.floor(slaHours))}j`
                          : `${Math.floor(slaHours)}j ${Math.floor((slaHours % 1) * 60)}m`
                        : '—'
                      }
                      accent={slaColor}
                    />
                    {tracking.isOverdue && (
                      <InfoRow label="Status SLA" value={
                        <span className="flex items-center gap-1 text-red-600 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" /> Overdue
                        </span>
                      } />
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Catatan (opsional)</label>
                  <Input
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Kondisi barang, catatan penerimaan..."
                    className="rounded-none border-border font-mono text-sm focus-visible:ring-0 focus-visible:border-primary"
                  />
                </div>

                <Button
                  onClick={() => setStep('foto')}
                  disabled={tracking.status !== 'keluar_gudang'}
                  className="w-full h-14 rounded-none font-mono uppercase tracking-widest text-sm font-bold"
                >
                  <Camera className="w-4 h-4 mr-2" /> Lanjut — Foto Dokumentasi
                </Button>
              </>
            ) : null}
          </motion.div>
        )}

        {/* ══════════════════════════════ STEP 3: FOTO ══════════════════════════════ */}
        {step === 'foto' && (
          <motion.div key="foto" variants={slide} initial="enter" animate="center" exit="exit"
            className="p-4 pt-6 max-w-md mx-auto space-y-4"
          >
            <div className="bg-muted/30 border border-border px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Foto Dokumentasi Barang Datang</p>
              <p className="text-sm text-muted-foreground">Ambil foto material yang diterima sebagai bukti visual penerimaan di cabang.</p>
            </div>

            {/* Camera / photo area */}
            <div className="w-full aspect-[4/3] bg-black relative overflow-hidden">
              {isCameraPhoto && (
                <>
                  <video ref={videoFotoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  {/* crosshair */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-3/4 h-3/4 border border-white/30" />
                  </div>
                  {/* GPS badge */}
                  {gps && (
                    <div className={`absolute top-3 left-3 flex items-center gap-1 text-[10px] font-mono px-2 py-1 ${gps.acc > 50 ? 'bg-amber-600' : 'bg-green-700'} text-white`}>
                      <MapPin className="w-2.5 h-2.5" /> {gps.acc.toFixed(0)}m
                    </div>
                  )}
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                    <button
                      onClick={takeFoto}
                      className="w-16 h-16 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 transition-colors backdrop-blur-sm"
                    />
                  </div>
                </>
              )}

              {photoDataUrl && !isCameraPhoto && (
                <>
                  <img src={photoDataUrl} alt="Foto dokumentasi" className="w-full h-full object-cover" />
                  {gps && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-white" />
                        <span className="font-mono text-[10px] text-white">{gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</span>
                      </div>
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={startFotoCamera}
                    className="absolute top-3 right-3 rounded-none font-mono text-xs shadow-lg"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Ulangi
                  </Button>
                </>
              )}

              {!isCameraPhoto && !photoDataUrl && (
                <div
                  onClick={startFotoCamera}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-black/80 transition-colors"
                >
                  <Camera className="w-12 h-12 text-white/50" />
                  <span className="font-mono text-xs text-white/60 uppercase tracking-wider">Ketuk untuk buka kamera</span>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {/* Skip photo option */}
            {!photoDataUrl && !isCameraPhoto && (
              <button
                onClick={() => handleConfirm()}
                className="w-full font-mono text-xs text-muted-foreground hover:text-foreground text-center py-2 transition-colors"
              >
                Lewati foto & konfirmasi langsung
              </button>
            )}

            {photoDataUrl && (
              <Button
                onClick={handleConfirm}
                disabled={receiveMutation.isPending}
                className="w-full h-14 rounded-none font-mono uppercase tracking-widest text-sm font-bold"
              >
                {receiveMutation.isPending
                  ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}><RefreshCw className="w-4 h-4 mr-2" /></motion.div> Memproses...</>
                  : <><CheckCircle2 className="w-4 h-4 mr-2" /> Konfirmasi Penerimaan</>
                }
              </Button>
            )}
          </motion.div>
        )}

        {/* ══════════════════════════════ STEP 4: SUCCESS ══════════════════════════════ */}
        {step === 'success' && (
          <motion.div key="success" variants={slide} initial="enter" animate="center" exit="exit"
            className="flex flex-col items-center justify-center p-8 max-w-md mx-auto min-h-[60vh] text-center gap-6"
          >
            <motion.div variants={pop} initial="hidden" animate="show">
              <div className="w-24 h-24 bg-green-100 border-2 border-green-300 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h2 className="font-serif text-3xl font-bold text-green-800">Diterima!</h2>
              <p className="font-mono text-sm text-muted-foreground mt-2">
                Material berhasil dicatat di cabang.
              </p>
            </motion.div>

            {tracking && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="w-full bg-green-50 border border-green-200 px-6 py-5 text-left space-y-2"
              >
                <p className="font-mono text-[10px] uppercase tracking-widest text-green-600">Ringkasan Penerimaan</p>
                <p className="font-serif text-xl font-bold">{tracking.materialName}</p>
                <p className="font-mono text-sm text-muted-foreground">{tracking.qtyIssued} unit · {tracking.trackingCode}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {format(new Date(), 'dd MMM yyyy, HH:mm', { locale: idLocale })}
                </p>
              </motion.div>
            )}

            {photoDataUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.55 }}
                className="w-full aspect-[4/3] overflow-hidden border border-green-200 shadow-sm"
              >
                <img src={photoDataUrl} alt="Dokumentasi" className="w-full h-full object-cover" />
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 }}
              className="w-full"
            >
              <Button onClick={reset} className="w-full h-14 rounded-none font-mono uppercase tracking-widest text-sm font-bold">
                <ScanLine className="w-4 h-4 mr-2" /> Scan Material Berikutnya
              </Button>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
