import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useGetTracking, useSubmitInstallationProof, useUploadPhoto } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, MapPin, AlertTriangle, ArrowLeft, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function LapanganUpload() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: tracking, isLoading: isLoadingTracking } = useGetTracking(params.id as string, {
    query: { enabled: !!params.id, queryKey: ['tracking', params.id as string] }
  });

  const { user } = useAuth();

  const [qtyUsed, setQtyUsed] = useState<string>('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [gps, setGps] = useState<{ lat: number, lng: number, acc: number, address: string, isMock: boolean } | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const submitMutation = useSubmitInstallationProof();
  const uploadMutation = useUploadPhoto();

  const startCamera = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const isDev = import.meta.env.DEV;
      if (isDev) {
        // Mock GPS specifically for Development overrides in Lombok Tengah
        setGps({
          lat: -8.70,
          lng: 116.27,
          acc: 5,
          address: 'Praya, Lombok Tengah (Mock Dev)',
          isMock: true
        });
      } else if ('geolocation' in navigator) {
        // Production: Force Real GPS High Accuracy
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            let address = "Sedang mengambil data lokasi...";

            setGps({ lat: latitude, lng: longitude, acc: accuracy, address, isMock: false });

            // Attempt basic Reverse Geocoding via Nominatim
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
              const data = await res.json();
              address = data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
              setGps({ lat: latitude, lng: longitude, acc: accuracy, address, isMock: false });
            } catch (e) {
              address = "Alamat tidak tersedia";
              setGps({ lat: latitude, lng: longitude, acc: accuracy, address, isMock: false });
            }

            if (accuracy > 50) {
              toast({
                variant: 'destructive',
                title: 'Akurasi GPS Rendah',
                description: `Akurasi saat ini ${accuracy.toFixed(0)}m. Pastikan berada di luar ruangan.`,
              });
            }
          },
          (err) => {
            toast({ variant: 'destructive', title: 'Gagal Akses Lokasi', description: err.message });
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Kamera Gagal', description: 'Tidak dapat mengakses kamera: ' + err.message });
      setIsCapturing(false);
    }
  };

  const drawWatermark = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    if (!gps || !tracking || !user) return;

    const pad = 20;
    const boxWidth = Math.min(600, canvasWidth - pad * 2);
    const boxHeight = 280;

    // Bottom-Left position
    const startX = pad;
    const startY = canvasHeight - boxHeight - pad;

    // Background Panel
    ctx.fillStyle = 'rgba(11, 25, 44, 0.75)'; // Navy/Dark 75% opacity
    ctx.beginPath();
    ctx.roundRect(startX, startY, boxWidth, boxHeight, 8);
    ctx.fill();

    // Text Setup
    ctx.fillStyle = '#ffffff';
    let currentY = startY + 35;

    // Header
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('PDAM TIARA', startX + 20, currentY);
    currentY += 24;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#60a5fa'; // Blue-400
    ctx.fillText('BUKTI PEMASANGAN', startX + 20, currentY);

    currentY += 35;

    // Content lines
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px monospace';
    const lines = [
      { label: 'Kode Tracking', val: tracking.trackingCode },
      { label: 'Material', val: tracking.materialName },
      { label: 'Koordinat', val: `${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}` },
      { label: 'Akurasi GPS', val: `±${gps.acc.toFixed(0)} Meter ${gps.isMock ? '(MOCK)' : ''}` },
      { label: 'Lokasi', val: gps.address },
      { label: 'Tanggal', val: format(new Date(), 'dd MMMM yyyy', { locale: idLocale }) },
      { label: 'Waktu', val: format(new Date(), 'HH:mm:ss') + ' WITA' },
      { label: 'Petugas', val: user.name || 'Unknown' },
    ];

    lines.forEach(line => {
      // Draw Label
      ctx.fillText(line.label.padEnd(15, ' ') + ' : ' + line.val, startX + 20, currentY);
      currentY += 22;
    });
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current && gps) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw actual photo
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Draw permanent watermark
        drawWatermark(ctx, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85); // HQ JPEG
        setPhotoDataUrl(dataUrl);
        stopCamera();
      }
    } else {
      if (!gps) {
        toast({ variant: 'destructive', title: 'Tunggu GPS', description: 'Menunggu akurasi lokasi GPS terlebih dahulu.' });
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCapturing(false);
  };

  const handleSubmit = async () => {
    if (!qtyUsed || !photoDataUrl || !gps) {
      toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'Pastikan jumlah, foto, dan lokasi sudah terisi.' });
      return;
    }

    const used = parseInt(qtyUsed);
    if (used < 0 || used > (tracking?.qtyIssued || 0)) {
      toast({ variant: 'destructive', title: 'Jumlah Tidak Valid', description: 'Jumlah pemakaian melebihi yang dikeluarkan.' });
      return;
    }

    try {
      // 1. Upload photo (base64 string normally, but using the mocked hook)
      // The API takes base64 in photo string field. Let's assume uploadPhoto returns a URL
      // Actually API schema for InstallationProofInput expects `photoUrl`, so we upload first.
      const uploadRes = await uploadMutation.mutateAsync({ data: { photo: photoDataUrl.split(',')[1] } });

      // 2. Submit Proof
      await submitMutation.mutateAsync({
        id: params.id as string,
        data: {
          qtyUsed: used,
          qtyReturned: (tracking?.qtyIssued || 0) - used,
          photoUrl: uploadRes.url,
          photoTakenAt: new Date().toISOString(),
          gpsLat: gps.lat,
          gpsLng: gps.lng,
          gpsAccuracyMeters: gps.acc,
          isMockLocation: gps.isMock,
        }
      });

      toast({
        title: 'Berhasil',
        description: 'Bukti pemasangan terkirim.'
      });
      setLocation('/lapangan');

    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Pengiriman Gagal',
        description: err?.data?.error || err.message,
      });
    }
  };

  if (isLoadingTracking) return <div className="p-8">Memuat...</div>;

  return (
    <div className="bg-background min-h-screen">
      <div className="sticky top-0 z-10 bg-background border-b border-border p-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-none border-none" asChild onClick={stopCamera}>
          <Link href="/lapangan"><ArrowLeft /></Link>
        </Button>
        <div>
          <h2 className="font-serif font-bold text-lg leading-none">Upload Bukti</h2>
          <p className="font-mono text-[10px] text-muted-foreground uppercase">{tracking?.trackingCode}</p>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-md mx-auto space-y-6 pb-24">
        <div className="bg-primary/5 border border-primary/20 p-4 font-mono text-sm">
          <p className="font-bold text-primary mb-1">Material:</p>
          <p>{tracking?.materialName}</p>
          <p className="text-muted-foreground mt-1">Dikeluarkan: {tracking?.qtyIssued} unit</p>
        </div>

        <div className="space-y-3">
          <Label className="font-mono text-xs font-bold uppercase tracking-wider">Jumlah Terpasang</Label>
          <Input
            type="number"
            min="0"
            max={tracking?.qtyIssued}
            value={qtyUsed}
            onChange={e => setQtyUsed(e.target.value)}
            className="rounded-none font-mono text-xl h-14 border-border focus-visible:ring-0 focus-visible:border-primary text-center"
            placeholder="0"
          />
        </div>

        <div className="space-y-3">
          <Label className="font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            Foto Kamera Langsung
            {gps && (
              <span className={`text - [10px] flex items - center gap - 1 ${gps.acc > 50 ? 'text-amber-600' : 'text-green-600'}`}>
                <MapPin className="w-3 h-3" /> {gps.acc.toFixed(0)}m
              </span>
            )}
          </Label>

          {!photoDataUrl && !isCapturing && (
            <div
              onClick={startCamera}
              className="w-full aspect-[3/4] bg-muted/30 border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <Camera className="w-12 h-12 text-muted-foreground mb-4" />
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground font-bold">Buka Kamera</span>
            </div>
          )}

          {isCapturing && (
            <div className="relative w-full aspect-[3/4] bg-black">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />

              <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                <button
                  onClick={takePhoto}
                  className="w-16 h-16 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 transition-colors backdrop-blur-sm"
                />
              </div>
            </div>
          )}

          {photoDataUrl && !isCapturing && (
            <div className="relative w-full aspect-[3/4] border-4 border-white shadow-md">
              <img src={photoDataUrl} alt="Preview" className="w-full h-full object-cover" />
              <Button
                variant="secondary"
                size="sm"
                onClick={startCamera}
                className="absolute bottom-4 right-4 rounded-none font-mono text-xs shadow-lg"
              >
                Ulangi Foto
              </Button>
            </div>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!qtyUsed || !photoDataUrl || !gps || submitMutation.isPending || uploadMutation.isPending}
          className="w-full h-14 rounded-none font-bold uppercase tracking-widest text-sm"
        >
          {submitMutation.isPending ? 'Mengirim Data...' : (
            <><UploadCloud className="w-4 h-4 mr-2" /> Kirim Laporan</>
          )}
        </Button>
      </div>
    </div>
  );
}
