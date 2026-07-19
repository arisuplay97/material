import { useGetBranchStatus, useListTrackings } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2, AlertTriangle, ChevronDown, CheckCircle2,
  Activity, Clock, ShieldAlert, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import TrackingTimeline from '@/components/TrackingTimeline';

/* ─── types ─── */
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/* ─── helpers ─── */
function riskMeta(score: number): { level: RiskLevel; label: string; color: string; bg: string; border: string } {
  if (score >= 80) return { level: 'critical', label: 'Kritis',  color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-300' };
  if (score >= 60) return { level: 'high',     label: 'Tinggi',  color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300' };
  if (score >= 40) return { level: 'medium',   label: 'Sedang',  color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-300' };
  return               { level: 'low',      label: 'Rendah',  color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-300' };
}

/* ─── animation variants ─── */
const pageVariants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.38, ease: 'easeOut' } },
};

const listVariants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.09 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show:   { opacity: 1, y: 0,  scale: 1, transition: { type: 'spring', stiffness: 220, damping: 22 } },
};

const timelineWrapVariants = {
  hidden: { opacity: 0, height: 0 },
  show:   { opacity: 1, height: 'auto', transition: { duration: 0.35, ease: 'easeOut' } },
  exit:   { opacity: 0, height: 0,      transition: { duration: 0.22 } },
};

const trackingRowVariants = {
  hidden: { opacity: 0, x: -12 },
  show:   { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 26 } },
};

/* ─── stat pill ─── */
function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`font-mono text-lg font-bold leading-none ${accent || 'text-foreground'}`}>{value}</span>
      <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}

/* ─── tracking row inside a branch ─── */
function TrackingRow({ tracking, branchId }: { tracking: any; branchId: string }) {
  const [open, setOpen] = useState(false);

  const statusMeta: Record<string, { label: string; color: string }> = {
    keluar_gudang:   { label: 'Keluar Gudang',   color: 'text-slate-600' },
    diterima_cabang: { label: 'Diterima Cabang', color: 'text-blue-600'  },
    dipasang:        { label: 'Dipasang',         color: 'text-amber-600' },
    selesai:         { label: 'Selesai',          color: 'text-green-600' },
  };
  const sm = statusMeta[tracking.status] ?? { label: tracking.status, color: 'text-muted-foreground' };

  return (
    <motion.div variants={trackingRowVariants} className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors text-left group"
      >
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs font-bold text-primary truncate">{tracking.code}</p>
          <p className="text-sm font-medium truncate">{tracking.materialName || '—'}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`font-mono text-[10px] uppercase tracking-wider font-bold ${sm.color}`}>
            {sm.label}
          </span>
          {tracking.isOverdue && (
            <motion.span
              className="font-mono text-[9px] uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Overdue
            </motion.span>
          )}
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="tl"
            variants={timelineWrapVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="overflow-hidden"
          >
            <div className="px-5 py-6 bg-muted/10 border-t border-border">
              <TrackingTimeline trackingId={tracking.id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── branch card (with lazy-loaded tracking list) ─── */
function BranchCard({ branch }: { branch: any }) {
  const [open, setOpen] = useState(false);
  const risk = riskMeta(branch.riskScore ?? 0);

  const { data: trackingData, isLoading: isLoadingTrackings } = useListTrackings(
    { branchId: branch.branchId, limit: 20 },
    { query: { enabled: open } }
  );

  const trackings = trackingData?.data ?? [];

  return (
    <motion.div variants={cardVariants} layout>
      <Card className={`rounded-none overflow-hidden border ${risk.border} shadow-sm`}>

        {/* ── Branch header banner ── */}
        <div className="bg-primary text-primary-foreground px-6 py-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-background/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-0.5">{branch.branchCode}</p>
              <p className="font-serif text-2xl font-bold leading-tight">{branch.branchName}</p>
            </div>
          </div>

          {/* Risk badge */}
          <motion.div
            className={`flex-shrink-0 px-3 py-1.5 border font-mono text-xs uppercase tracking-widest font-bold ${risk.bg} ${risk.border} ${risk.color}`}
            animate={risk.level === 'critical' ? { opacity: [1, 0.5, 1] } : {}}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            {risk.level === 'critical' && <AlertTriangle className="w-3 h-3 inline mr-1" />}
            Risiko {risk.label}
          </motion.div>
        </div>

        {/* ── Stat strip ── */}
        <div className="grid grid-cols-5 divide-x divide-border border-b border-border bg-muted/10">
          {[
            { label: 'Aktif',      value: branch.active,          accent: undefined },
            { label: 'Dikirim',    value: branch.dikirim,         accent: 'text-blue-600' },
            { label: 'Di Cabang',  value: branch.diterimaCabang,  accent: 'text-amber-600' },
            { label: 'Kritis',     value: branch.kritis,          accent: branch.kritis  > 0 ? 'text-red-600'   : undefined },
            { label: 'Verified',   value: branch.terverifikasi,   accent: 'text-green-700' },
          ].map(s => (
            <div key={s.label} className="flex justify-center py-4">
              <Stat label={s.label} value={s.value ?? 0} accent={s.accent} />
            </div>
          ))}
        </div>

        {/* ── Risk score bar ── */}
        <div className="px-6 py-3 flex items-center gap-3 bg-background border-b border-border">
          <div className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="font-mono text-[10px] uppercase tracking-wider">Risk Score</span>
          </div>
          <div className="flex-1 h-2 bg-muted rounded-none overflow-hidden">
            <motion.div
              className={`h-full ${risk.level === 'critical' ? 'bg-red-500' : risk.level === 'high' ? 'bg-orange-500' : risk.level === 'medium' ? 'bg-amber-500' : 'bg-green-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(branch.riskScore ?? 0, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            />
          </div>
          <span className={`font-mono text-sm font-bold ${risk.color}`}>{branch.riskScore ?? 0}</span>
        </div>

        {/* ── Toggle trackings ── */}
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors group"
        >
          <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
            <Activity className="w-4 h-4" />
            <span className="font-mono text-xs uppercase tracking-widest">
              {open ? 'Sembunyikan' : 'Lihat'} Tracking Material
              {branch.active > 0 && <span className="ml-2 font-bold text-primary">({branch.active} aktif)</span>}
            </span>
          </div>
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        </button>

        {/* ── Tracking list with timelines ── */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="list"
              variants={timelineWrapVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="overflow-hidden border-t border-border"
            >
              {isLoadingTrackings ? (
                <div className="flex flex-col gap-2 p-5">
                  {[1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="h-14 bg-muted/30"
                      animate={{ opacity: [0.4, 0.8, 0.4] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              ) : trackings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mb-3" />
                  <p className="font-mono text-sm text-muted-foreground">Tidak ada tracking aktif di cabang ini.</p>
                </div>
              ) : (
                <motion.div
                  variants={listVariants}
                  initial="hidden"
                  animate="show"
                >
                  {trackings.map((t: any) => (
                    <TrackingRow key={t.id} tracking={t} branchId={branch.branchId} />
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </Card>
    </motion.div>
  );
}

/* ─── main page ─── */
export default function Branches() {
  const { data: branches, isLoading } = useGetBranchStatus();

  const sorted = [...(branches ?? [])].sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));

  return (
    <motion.div
      className="p-6 md:p-8 max-w-[1280px] mx-auto space-y-8"
      variants={pageVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Status Cabang</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            Monitor risiko & tracking material per wilayah layanan secara real-time.
          </p>
        </div>
        {!isLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="flex gap-2"
          >
            {[
              { label: 'Kritis', count: sorted.filter(b => b.riskScore >= 80).length, color: 'bg-red-100 text-red-700 border-red-200' },
              { label: 'Cabang', count: sorted.length, color: 'bg-primary/10 text-primary border-primary/20' },
            ].map(s => s.count > 0 && (
              <div key={s.label} className={`border font-mono text-xs uppercase tracking-widest px-3 py-1.5 ${s.color}`}>
                {s.count} {s.label}
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Branch cards */}
      {isLoading ? (
        <div className="flex flex-col gap-5">
          {[1, 2, 3].map(i => (
            <motion.div
              key={i}
              className="h-48 bg-muted/30 border border-border"
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <Card className="rounded-none shadow-none border-border">
          <CardContent className="flex flex-col items-center justify-center p-16">
            <Building2 className="w-10 h-10 text-muted-foreground mb-4" />
            <p className="font-serif text-xl font-bold">Tidak ada data cabang</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          className="flex flex-col gap-5"
          variants={listVariants}
          initial="hidden"
          animate="show"
        >
          {sorted.map(branch => (
            <BranchCard key={branch.branchId} branch={branch} />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
