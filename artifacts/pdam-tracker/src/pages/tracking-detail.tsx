// I'll import just the tracking by id hook.
import { useGetTracking } from '@workspace/api-client-react'; // Let me check api.ts

import { useParams, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import TrackingTimeline from '@/components/TrackingTimeline';
import { ArrowLeft, MapPin, Camera, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

export default function TrackingDetail() {
  const params = useParams();
  const trackingId = params.id;
  
  // Note: API schema actually generates useGetTracking but the detailed endpoint might return the full tracking detail.
  const { data: tracking, isLoading } = useGetTracking(trackingId as string, {
    query: {
      enabled: !!trackingId,
      queryKey: ['tracking', trackingId as string]
    }
  });

  if (isLoading) {
    return <div className="p-8 font-mono animate-pulse">Memuat data tracking...</div>;
  }

  if (!tracking) {
    return <div className="p-8 font-mono">Tracking tidak ditemukan.</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="rounded-none border-border">
          <Link href="/trackings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground tracking-tight">Detail Material</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">{tracking.trackingCode}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2 rounded-none border-border shadow-sm">
          <CardHeader className="border-b border-border bg-muted/10 pb-4">
            <CardTitle className="font-serif text-xl">Timeline Perjalanan</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <TrackingTimeline trackingId={tracking.id} />
          </CardContent>
        </Card>

        <Card className="col-span-1 rounded-none border-border shadow-sm">
          <CardHeader className="border-b border-border bg-primary text-primary-foreground pb-4">
            <CardTitle className="font-serif text-xl flex items-center justify-between">
              Informasi Utama
              <Badge variant="outline" className="rounded-none border-primary-foreground text-primary-foreground bg-transparent uppercase font-mono text-[10px]">
                {tracking.status.replace('_', ' ')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border text-sm">
              <div className="p-4 grid grid-cols-3 gap-2">
                <span className="col-span-1 text-muted-foreground font-mono uppercase text-[10px] tracking-wider mt-0.5">Material</span>
                <span className="col-span-2 font-bold">{tracking.materialName}</span>
              </div>
              <div className="p-4 grid grid-cols-3 gap-2">
                <span className="col-span-1 text-muted-foreground font-mono uppercase text-[10px] tracking-wider mt-0.5">Jumlah</span>
                <span className="col-span-2">{tracking.qtyIssued} Unit</span>
              </div>
              <div className="p-4 grid grid-cols-3 gap-2">
                <span className="col-span-1 text-muted-foreground font-mono uppercase text-[10px] tracking-wider mt-0.5">Cabang</span>
                <span className="col-span-2">{tracking.branchName || '-'}</span>
              </div>
              <div className="p-4 grid grid-cols-3 gap-2 bg-amber-50/50">
                <span className="col-span-1 text-amber-700 font-mono uppercase text-[10px] tracking-wider mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> SLA
                </span>
                <span className="col-span-2 text-amber-900 font-mono">
                  {format(new Date(tracking.slaDeadline), 'dd MMM yyyy HH:mm', { locale: id })}
                </span>
              </div>
              <div className="p-4 grid grid-cols-3 gap-2">
                <span className="col-span-1 text-muted-foreground font-mono uppercase text-[10px] tracking-wider mt-0.5">QR Code</span>
                <div className="col-span-2">
                  {tracking.qrCodeUrl ? (
                     <img src={tracking.qrCodeUrl} alt="QR Code" className="w-32 h-32 border border-border p-1 bg-white" />
                  ) : (
                    <span className="text-muted-foreground italic text-xs">Belum di-generate</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* If we had proof data, we could show it here. Assuming detailed endpoint returns proof if available based on schemas. */}
        {/* The schema TrackingDetail includes `proof`. Let's cast it or assert it. */}
        {(tracking as any).proof && (
          <Card className="col-span-1 md:col-span-3 rounded-none border-border shadow-sm border-t-4 border-t-primary">
            <CardHeader className="border-b border-border bg-muted/10 pb-4">
              <CardTitle className="font-serif text-xl flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Bukti Pemasangan
                {((tracking as any).proof.flaggedForReview) && (
                  <Badge variant="destructive" className="ml-auto rounded-none font-mono text-[10px] uppercase">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Perlu Ditinjau
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                   <div className="aspect-video bg-muted border border-border flex items-center justify-center overflow-hidden relative group">
                     <img src={(tracking as any).proof.photoUrl} alt="Bukti Pemasangan" className="object-cover w-full h-full" />
                   </div>
                </div>
                <div className="space-y-6">
                   <div>
                     <h4 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Data Geospasial</h4>
                     <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 border border-border">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Koordinat</p>
                          <p className="font-mono text-sm">{(tracking as any).proof.gpsLat.toFixed(5)}, {(tracking as any).proof.gpsLng.toFixed(5)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Akurasi</p>
                          <p className="font-mono text-sm">{(tracking as any).proof.gpsAccuracyMeters} meter</p>
                        </div>
                     </div>
                   </div>

                   <div>
                     <h4 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Data Pemakaian</h4>
                     <div className="flex gap-8">
                       <div>
                         <p className="text-xs text-muted-foreground mb-1">Digunakan</p>
                         <p className="font-bold text-2xl font-serif">{(tracking as any).proof.qtyUsed}</p>
                       </div>
                       <div>
                         <p className="text-xs text-muted-foreground mb-1">Dikembalikan</p>
                         <p className="font-bold text-2xl font-serif text-amber-700">{(tracking as any).proof.qtyReturned}</p>
                       </div>
                     </div>
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
