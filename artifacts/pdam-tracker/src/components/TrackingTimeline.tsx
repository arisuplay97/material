import { useGetTrackingEvents, TrackingEvent, TrackingEventStep } from '@workspace/api-client-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Check, Clock, MapPin, Camera, AlertTriangle, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const STEPS: TrackingEventStep[] = [
  'keluar_gudang',
  'diterima_cabang',
  'dipasang',
  'selesai'
];

const STEP_LABELS: Record<string, string> = {
  keluar_gudang: 'Keluar Gudang',
  diterima_cabang: 'Diterima Cabang',
  dipasang: 'Dipasang',
  selesai: 'Terverifikasi'
};

export default function TrackingTimeline({ trackingId }: { trackingId: string }) {
  const { data: events, isLoading } = useGetTrackingEvents(trackingId, {
    query: {
      enabled: !!trackingId
    }
  });

  if (isLoading) {
    return (
      <div className="flex gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 flex-1 rounded-none" />)}
      </div>
    );
  }

  const eventsByStep = events?.reduce((acc, ev) => {
    acc[ev.step] = ev;
    return acc;
  }, {} as Record<string, TrackingEvent>) || {};

  // Determine current active step (first step without an event)
  let activeStepIndex = STEPS.findIndex(s => !eventsByStep[s]);
  if (activeStepIndex === -1) activeStepIndex = STEPS.length; // all done

  return (
    <div className="w-full">
      <div className="relative flex justify-between items-start">
        {/* Connecting Lines Background */}
        <div className="absolute top-5 left-10 right-10 h-[2px] bg-border z-0"></div>
        
        {/* Connecting Lines Foreground (Animated Fill) */}
        <div 
          className="absolute top-5 left-10 h-[2px] bg-primary z-0 transition-all duration-1000 ease-out"
          style={{ width: `calc(${(activeStepIndex > 0 ? activeStepIndex - 1 : 0) / (STEPS.length - 1)} * (100% - 5rem))` }}
        ></div>

        {STEPS.map((step, index) => {
          const event = eventsByStep[step];
          const isCompleted = !!event;
          const isActive = index === activeStepIndex;
          const isFuture = index > activeStepIndex;

          return (
            <div key={step} className="relative z-10 flex flex-col items-center w-1/4">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-mono text-sm border-2 bg-background transition-colors duration-500
                  ${isCompleted ? 'border-primary bg-primary text-primary-foreground' : ''}
                  ${isActive ? 'border-amber-500 text-amber-600 pulse-amber' : ''}
                  ${isFuture ? 'border-border text-muted-foreground' : ''}
                `}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : index + 1}
              </div>
              
              <div className="mt-4 text-center">
                <p className={`font-serif font-bold text-sm ${isActive ? 'text-amber-700' : isFuture ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {STEP_LABELS[step]}
                </p>
                
                {isCompleted && event && (
                  <div className="mt-2 flex flex-col items-center gap-1">
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      {format(new Date(event.occurredAt), 'dd MMM HH:mm', { locale: id })}
                    </p>
                    <p className="text-xs font-medium bg-secondary px-2 py-0.5">
                      {event.actorName}
                    </p>
                    
                    {/* Render extra details based on step */}
                    {step === 'diterima_cabang' && event.qrScannedCode && (
                      <div className="mt-2 text-[10px] font-mono border border-border p-1 bg-background text-muted-foreground flex flex-col items-center">
                        <span className="uppercase text-[8px]">QR Scanned</span>
                        <span className="text-primary">{event.qrScannedCode}</span>
                      </div>
                    )}
                    
                    {step === 'dipasang' && (
                      <div className="mt-2 flex gap-2">
                        {event.photoUrl && (
                          <a href={event.photoUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center w-8 h-8 bg-muted hover:bg-primary hover:text-primary-foreground transition-colors border border-border" title="Lihat Foto">
                            <Camera className="h-4 w-4" />
                          </a>
                        )}
                        {event.gpsLat && event.gpsLng && (
                          <a href={`https://maps.google.com/?q=${event.gpsLat},${event.gpsLng}`} target="_blank" rel="noreferrer" className="flex items-center justify-center w-8 h-8 bg-muted hover:bg-primary hover:text-primary-foreground transition-colors border border-border" title="Lihat Lokasi">
                            <MapPin className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {isActive && (
                  <div className="mt-2 flex items-center justify-center text-amber-600 gap-1 font-mono text-[10px] uppercase tracking-wider">
                    <Clock className="h-3 w-3" /> Pending
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
