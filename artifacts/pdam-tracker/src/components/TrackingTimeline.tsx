import { useGetTrackingEvents, TrackingEvent, TrackingEventStep } from '@workspace/api-client-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Check, Clock, MapPin, Camera, Package, Truck, Wrench, ShieldCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS: TrackingEventStep[] = [
  'keluar_gudang',
  'diterima_cabang',
  'dipasang',
  'selesai'
];

const STEP_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  keluar_gudang:   { label: 'Keluar Gudang',   icon: Package,      color: 'text-slate-600' },
  diterima_cabang: { label: 'Diterima Cabang', icon: Truck,        color: 'text-blue-600'  },
  dipasang:        { label: 'Dipasang',         icon: Wrench,       color: 'text-amber-600' },
  selesai:         { label: 'Terverifikasi',    icon: ShieldCheck,  color: 'text-green-600' },
};

const containerVariants: any = {
  hidden: {},
  show: { transition: { staggerChildren: 0.18, delayChildren: 0.1 } },
};

const nodeVariants: any = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } },
};

const lineVariants: any = {
  hidden: { scaleX: 0 },
  show:   { scaleX: 1, transition: { duration: 0.6, ease: 'easeOut' } },
};

const detailVariants: any = {
  hidden: { opacity: 0, height: 0 },
  show:   { opacity: 1, height: 'auto', transition: { duration: 0.3, ease: 'easeOut' } },
};

export default function TrackingTimeline({ trackingId }: { trackingId: string }) {
  const { data: events, isLoading } = useGetTrackingEvents(trackingId, {
    query: { enabled: !!trackingId, queryKey: ['trackingEvents', trackingId] },
  });

  if (isLoading) {
    return (
      <div className="flex gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 flex-1 rounded-none" />)}
      </div>
    );
  }

  const eventsByStep = (events ?? []).reduce((acc, ev) => {
    acc[ev.step] = ev;
    return acc;
  }, {} as Record<string, TrackingEvent>);

  let activeStepIndex = STEPS.findIndex(s => !eventsByStep[s]);
  if (activeStepIndex === -1) activeStepIndex = STEPS.length;

  return (
    <div className="w-full select-none">
      <motion.div
        className="relative flex justify-between items-start"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Background rail */}
        <div className="absolute top-5 left-10 right-10 h-[2px] bg-border z-0" />

        {/* Animated fill rail — one segment per completed gap */}
        {STEPS.slice(0, -1).map((_, i) => {
          const bothDone = !!eventsByStep[STEPS[i]] && !!eventsByStep[STEPS[i + 1]];
          const segW = `calc((100% - 5rem) / ${STEPS.length - 1})`;
          const segLeft = `calc(2.5rem + ${i} * (100% - 5rem) / ${STEPS.length - 1})`;
          return (
            <motion.div
              key={i}
              className="absolute top-[19px] h-[2px] bg-primary origin-left z-0"
              style={{ left: segLeft, width: segW }}
              variants={lineVariants}
              custom={i}
              animate={bothDone ? 'show' : 'hidden'}
              initial="hidden"
            />
          );
        })}

        {STEPS.map((step, index) => {
          const event = eventsByStep[step];
          const isCompleted = !!event;
          const isActive = index === activeStepIndex;
          const isFuture = index > activeStepIndex;
          const { label, icon: Icon, color } = STEP_META[step];

          return (
            <motion.div
              key={step}
              className="relative z-10 flex flex-col items-center w-1/4"
              variants={nodeVariants}
            >
              {/* Step node */}
              <motion.div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center border-2 bg-background
                  transition-colors duration-500
                  ${isCompleted ? 'border-primary bg-primary text-primary-foreground shadow-md' : ''}
                  ${isActive   ? 'border-amber-500 text-amber-600 pulse-amber' : ''}
                  ${isFuture   ? 'border-border text-muted-foreground' : ''}
                `}
                whileHover={{ scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                {isCompleted
                  ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring' }}>
                      <Check className="h-5 w-5" />
                    </motion.span>
                  : <Icon className={`h-4 w-4 ${isActive ? 'text-amber-500' : ''}`} />
                }
              </motion.div>

              {/* Label */}
              <div className="mt-3 text-center px-1">
                <p className={`font-serif font-bold text-sm leading-tight
                  ${isCompleted ? 'text-foreground' : ''}
                  ${isActive    ? 'text-amber-700'  : ''}
                  ${isFuture    ? 'text-muted-foreground' : ''}
                `}>
                  {label}
                </p>

                {/* Completed details */}
                <AnimatePresence>
                  {isCompleted && event && (
                    <motion.div
                      className="mt-2 flex flex-col items-center gap-1"
                      variants={detailVariants}
                      initial="hidden"
                      animate="show"
                      exit="hidden"
                    >
                      <p className="font-mono text-[10px] uppercase text-muted-foreground">
                        {format(new Date(event.occurredAt), 'dd MMM HH:mm', { locale: id })}
                      </p>
                      {event.actorName && (
                        <p className="text-xs font-medium bg-secondary px-2 py-0.5 max-w-[90px] truncate">
                          {event.actorName}
                        </p>
                      )}

                      {step === 'diterima_cabang' && event.qrScannedCode && (
                        <div className="mt-1 text-[10px] font-mono border border-border px-1.5 py-1 bg-background text-center">
                          <span className="block uppercase text-[8px] text-muted-foreground">QR</span>
                          <span className="text-primary">{event.qrScannedCode}</span>
                        </div>
                      )}

                      {step === 'dipasang' && (
                        <div className="mt-1 flex gap-1.5">
                          {event.photoUrl && (
                            <motion.a
                              href={event.photoUrl} target="_blank" rel="noreferrer"
                              title="Lihat Foto"
                              className="flex items-center justify-center w-7 h-7 bg-muted hover:bg-primary hover:text-primary-foreground border border-border transition-colors"
                              whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.95 }}
                            >
                              <Camera className="h-3.5 w-3.5" />
                            </motion.a>
                          )}
                          {event.gpsLat && event.gpsLng && (
                            <motion.a
                              href={`https://maps.google.com/?q=${event.gpsLat},${event.gpsLng}`}
                              target="_blank" rel="noreferrer" title="Lihat Lokasi"
                              className="flex items-center justify-center w-7 h-7 bg-muted hover:bg-primary hover:text-primary-foreground border border-border transition-colors"
                              whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.95 }}
                            >
                              <MapPin className="h-3.5 w-3.5" />
                            </motion.a>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Active / pending indicator */}
                {isActive && (
                  <motion.div
                    className="mt-2 flex items-center justify-center text-amber-600 gap-1 font-mono text-[10px] uppercase tracking-wider"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                  >
                    <Clock className="h-3 w-3" /> Pending
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
