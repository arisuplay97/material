import { useListTrackings } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Clock, MapPin, ChevronRight, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function Lapangan() {
  // Assume API filters by assignedTo / branch implicitly for petugas_lapangan via auth context in real app,
  // or we pass parameters if available. Schema has 'status' parameter.
  const { data: response, isLoading } = useListTrackings({ status: 'diterima_cabang' });
  const trackings = response?.data || [];

  return (
    <div className="bg-muted/10 min-h-[calc(100vh-4rem)] p-4 md:p-6 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-foreground">Tugas Lapangan</h1>
        <p className="text-muted-foreground font-mono text-xs mt-1 uppercase tracking-widest">Daftar Material Siap Pasang</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-none" />)}
        </div>
      ) : trackings.length === 0 ? (
        <div className="text-center p-12 bg-card border border-border">
          <p className="font-mono text-sm text-muted-foreground">Tidak ada tugas aktif.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trackings.map((track) => (
            <Link key={track.id} href={`/lapangan/upload/${track.id}`}>
              <Card className="rounded-none border-border shadow-sm hover:border-primary hover:shadow-md transition-all cursor-pointer bg-card group overflow-hidden relative">
                {/* Accent border based on time */}
                <div className={`absolute top-0 bottom-0 left-0 w-1 ${track.hoursRemaining && track.hoursRemaining < 24 ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                
                <CardContent className="p-5 pl-6">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-mono font-bold text-primary group-hover:underline">
                      {track.trackingCode}
                    </span>
                    {track.hoursRemaining && track.hoursRemaining < 24 && (
                      <Badge variant="destructive" className="rounded-none font-mono text-[10px] uppercase tracking-wider bg-amber-100 text-amber-800 border-none shadow-none flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Mendesak
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="font-serif font-bold text-lg leading-tight mb-2 pr-6">
                    {track.materialName} <span className="text-muted-foreground text-sm font-normal">x{track.qtyIssued}</span>
                  </h3>
                  
                  <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground mt-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 
                      {track.hoursRemaining ? `${Math.floor(track.hoursRemaining)}j tersisa` : 'SLA N/A'}
                    </div>
                  </div>
                  
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                    <ChevronRight className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
