import { useListTrackings } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  Clock, ChevronRight, AlertTriangle, Package,
  CheckCircle2, Wrench, ScanLine, MapPin
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── workflow steps ─── */
const STEPS = [
  { key: 'keluar_gudang',   label: 'Keluar Gudang',   Icon: Package,      color: 'text-slate-500' },
  { key: 'diterima_cabang', label: 'Di Cabang',        Icon: ScanLine,     color: 'text-blue-500'  },
  { key: 'dipasang',        label: 'Dipasang',         Icon: Wrench,       color: 'text-amber-500' },
  { key: 'selesai',         label: 'Selesai',          Icon: CheckCircle2, color: 'text-green-500' },
];

/* ─── mini step strip ─── */
function MiniTimeline({ status }: { status: string }) {
  const activeIdx = STEPS.findIndex(s => s.key === status);
  return (
    <div className="flex items-center gap-0 mt-4">
      {STEPS.map((step, i) => {
        const done    = i < activeIdx;
        const current = i === activeIdx;
        const future  = i > activeIdx;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 relative">
              <div className={`w-7 h-7 flex items-center justify-center border transition-colors
                ${done    ? 'bg-primary border-primary text-primary-foreground' : ''}
                ${current ? 'border-amber-500 text-amber-600 bg-amber-50'       : ''}
                ${future  ? 'border-border text-muted-foreground'               : ''}
              `}>
                <step.Icon className="w-3.5 h-3.5" />
              </div>
              <span className={`font-mono text-[8px] uppercase tracking-tight whitespace-nowrap
                ${done    ? 'text-primary'           : ''}
                ${current ? 'text-amber-700 font-bold' : ''}
                ${future  ? 'text-muted-foreground'   : ''}
              `}>{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-1 mb-4 transition-colors ${i < activeIdx ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── card variants ─── */
const listVariants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 240, damping: 24 } },
};

/* ─── main page ─── */
export default function Lapangan() {
  const { data: response, isLoading } = useListTrackings({ status: 'diterima_cabang' });
  const { data: allResponse }          = useListTrackings({ limit: 50 });

  const tasks    = response?.data || [];
  const allTasks = allResponse?.data || [];

  /* stats */
  const countByStatus = (s: string) => allTasks.filter(t => t.status === s).length;
  const overdueCount  = tasks.filter(t => t.isOverdue).length;

  return (
    <motion.div
      className="bg-muted/10 min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* ── header ── */}
      <div className="bg-background border-b border-border px-4 pt-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-serif font-bold">Tugas Lapangan</h1>
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
              Material siap pasang di cabang
            </p>
          </div>
          {overdueCount > 0 && (
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            >
              <Badge variant="destructive" className="rounded-none font-mono text-xs px-2.5 py-1 uppercase tracking-widest flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {overdueCount} Overdue
              </Badge>
            </motion.div>
          )}
        </div>

        {/* workflow stat strip */}
        <div className="grid grid-cols-4 gap-2">
          {STEPS.map(s => (
            <div key={s.key} className={`border border-border px-2 py-2 text-center ${s.key === 'diterima_cabang' ? 'bg-amber-50 border-amber-200' : 'bg-background'}`}>
              <p className={`font-mono text-xl font-bold ${s.key === 'diterima_cabang' ? 'text-amber-700' : 'text-foreground'}`}>
                {countByStatus(s.key)}
              </p>
              <p className={`font-mono text-[8px] uppercase tracking-wider mt-0.5 ${s.key === 'diterima_cabang' ? 'text-amber-600' : 'text-muted-foreground'}`}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* scan shortcut banner */}
        <Link href="/receive">
          <motion.div
            className="mt-4 flex items-center gap-3 bg-primary text-primary-foreground px-4 py-3 cursor-pointer"
            whileHover={{ opacity: 0.9 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-9 h-9 bg-background/15 flex items-center justify-center flex-shrink-0">
              <ScanLine className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-mono text-xs uppercase tracking-widest font-bold">Scan Barang Baru Datang</p>
              <p className="font-mono text-[10px] opacity-70 mt-0.5">Buka kamera untuk scan QR / barcode</p>
            </div>
            <ChevronRight className="w-4 h-4 opacity-60" />
          </motion.div>
        </Link>
      </div>

      {/* ── task list ── */}
      <div className="p-4 pb-24 space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground px-1">
          {tasks.length} tugas menunggu pemasangan
        </p>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                className="h-36 bg-muted/40 border border-border"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 1.3, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center bg-background border border-border"
          >
            <CheckCircle2 className="w-10 h-10 text-green-500 mb-3" />
            <p className="font-serif text-xl font-bold">Semua Selesai</p>
            <p className="font-mono text-xs text-muted-foreground mt-1">Tidak ada material yang menunggu pemasangan.</p>
          </motion.div>
        ) : (
          <motion.div
            className="space-y-3"
            variants={listVariants}
            initial="hidden"
            animate="show"
          >
            <AnimatePresence>
              {tasks.map(track => {
                const urgent = track.hoursRemaining != null && track.hoursRemaining < 24;
                const overdue = track.isOverdue;

                return (
                  <motion.div key={track.id} variants={cardVariants} layout>
                    <Link href={`/lapangan/upload/${track.id}`}>
                      <motion.div
                        className={`bg-background border cursor-pointer relative overflow-hidden
                          ${overdue  ? 'border-red-300 shadow-red-50 shadow-sm' :
                            urgent   ? 'border-amber-300 shadow-amber-50 shadow-sm' :
                                       'border-border'}
                        `}
                        whileHover={{ translateX: 2 }}
                        whileTap={{ scale: 0.99 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      >
                        {/* left accent bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1
                          ${overdue ? 'bg-red-500' : urgent ? 'bg-amber-500' : 'bg-blue-500'}
                        `} />

                        <div className="pl-5 pr-4 pt-4 pb-4">
                          {/* top row */}
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-primary">{track.trackingCode}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {overdue && (
                                <motion.span
                                  className="font-mono text-[9px] uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 flex items-center gap-1"
                                  animate={{ opacity: [1, 0.4, 1] }}
                                  transition={{ duration: 1.4, repeat: Infinity }}
                                >
                                  <AlertTriangle className="w-2.5 h-2.5" /> Overdue
                                </motion.span>
                              )}
                              {!overdue && urgent && (
                                <span className="font-mono text-[9px] uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5">
                                  Mendesak
                                </span>
                              )}
                            </div>
                          </div>

                          {/* material info */}
                          <h3 className="font-serif font-bold text-lg leading-snug mt-1">
                            {track.materialName}
                            <span className="text-muted-foreground text-sm font-normal ml-1.5">×{track.qtyIssued}</span>
                          </h3>

                          {/* branch + sla */}
                          <div className="flex items-center gap-3 mt-2">
                            {track.branchName && (
                              <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                                <MapPin className="w-3 h-3" /> {track.branchName}
                              </div>
                            )}
                            <div className={`flex items-center gap-1 font-mono text-[10px] font-bold ml-auto
                              ${overdue ? 'text-red-600' : urgent ? 'text-amber-600' : 'text-green-700'}
                            `}>
                              <Clock className="w-3 h-3" />
                              {track.hoursRemaining != null
                                ? track.hoursRemaining < 0
                                  ? `${Math.abs(Math.floor(track.hoursRemaining))}j lewat`
                                  : `${Math.floor(track.hoursRemaining)}j tersisa`
                                : 'SLA N/A'
                              }
                            </div>
                          </div>

                          {/* mini timeline */}
                          <MiniTimeline status={track.status} />
                        </div>

                        {/* arrow indicator */}
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
