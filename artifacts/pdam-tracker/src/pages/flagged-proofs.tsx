import { useGetFlaggedProofs, useReviewProof, useListTrackings } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, MapPin, Check, X, Building2, ChevronDown, ChevronUp, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TrackingTimeline from '@/components/TrackingTimeline';

/* ─── animation variants ─── */
const pageVariants: any = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const listVariants: any = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.1 } },
};

const cardVariants: any = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  show:   { opacity: 1, y: 0,  scale: 1,    transition: { type: 'spring', stiffness: 220, damping: 24 } },
  exit:   { opacity: 0, x: -40, transition: { duration: 0.25 } },
};

const timelineWrapVariants: any = {
  hidden: { opacity: 0, height: 0 },
  show:   { opacity: 1, height: 'auto', transition: { duration: 0.35, ease: 'easeOut' } },
  exit:   { opacity: 0, height: 0,      transition: { duration: 0.2 } },
};

/* ─── flag reason pill ─── */
function FlagPill({ reason }: { reason: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider bg-red-50 border border-red-200 text-red-700 px-2 py-0.5"
    >
      <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
      {reason}
    </motion.span>
  );
}

/* ─── main page ─── */
export default function FlaggedProofs() {
  const { data: proofs, isLoading, refetch } = useGetFlaggedProofs({ reviewStatus: 'pending' });
  const reviewMutation = useReviewProof();
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [expandedTimeline, setExpandedTimeline] = useState<Record<string, boolean>>({});

  const toggleTimeline = (id: string) =>
    setExpandedTimeline(prev => ({ ...prev, [id]: !prev[id] }));

  const handleReview = (proofId: string, status: 'approved' | 'rejected') => {
    reviewMutation.mutate(
      { id: proofId, data: { reviewStatus: status, notes } },
      {
        onSuccess: () => {
          toast({
            title: status === 'approved' ? 'Bukti Disetujui' : 'Bukti Ditolak',
            description: status === 'approved'
              ? 'Tracking telah ditandai terverifikasi.'
              : 'Bukti ditolak dan petugas perlu mengulang.',
          });
          setNotes('');
          refetch();
        },
        onError: (err: any) => {
          toast({ variant: 'destructive', title: 'Gagal', description: err?.data?.error || 'Kesalahan sistem' });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col gap-4">
        {[1, 2].map(i => (
          <motion.div
            key={i}
            className="h-64 bg-muted/30 border border-border"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="p-6 md:p-8 max-w-[1280px] mx-auto space-y-8"
      variants={pageVariants}
      initial="hidden"
      animate="show"
    >
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Antrean Verifikasi SPI</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            Bukti instalasi dengan anomali geospasial yang memerlukan tinjauan manual.
          </p>
        </div>
        {(proofs?.length ?? 0) > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.3 }}
          >
            <Badge variant="destructive" className="rounded-none font-mono text-sm px-3 py-1.5 uppercase tracking-widest">
              {proofs!.length} Pending
            </Badge>
          </motion.div>
        )}
      </div>

      {/* Empty state */}
      {proofs?.length === 0 ? (
        <motion.div variants={cardVariants} initial="hidden" animate="show">
          <Card className="rounded-none border-border shadow-none bg-muted/10">
            <CardContent className="flex flex-col items-center justify-center p-16 text-center">
              <motion.div
                className="w-16 h-16 bg-green-50 border border-green-200 flex items-center justify-center mb-6"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Check className="w-8 h-8 text-green-600" />
              </motion.div>
              <h3 className="font-serif text-2xl font-bold">Semua Bersih</h3>
              <p className="text-muted-foreground font-mono text-sm mt-2 max-w-xs">
                Tidak ada bukti instalasi yang memerlukan tinjauan saat ini.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          className="flex flex-col gap-6"
          variants={listVariants}
          initial="hidden"
          animate="show"
        >
          <AnimatePresence mode="popLayout">
            {proofs?.map((proof) => (
              <motion.div
                key={proof.id}
                variants={cardVariants}
                layout
                exit="exit"
              >
                <Card className="rounded-none border-border shadow-sm overflow-hidden">

                  {/* ── Branch name banner ── */}
                  <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center gap-3">
                    <Building2 className="w-5 h-5 opacity-70 flex-shrink-0" />
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 leading-none mb-1">
                        Cabang Tujuan
                      </p>
                      <p className="font-serif text-xl font-bold leading-tight">
                        {proof.branchName || 'Cabang Tidak Diketahui'}
                      </p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 leading-none mb-1">
                        Kode Tracking
                      </p>
                      <p className="font-mono font-bold text-base tracking-tight">
                        {proof.trackingCode}
                      </p>
                    </div>
                  </div>

                  {/* ── Card header: material + submitter ── */}
                  <CardHeader className="bg-amber-50/60 border-b border-amber-100 px-6 py-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="font-serif text-lg font-bold text-foreground leading-tight">
                          {proof.materialName || 'Material'}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground mt-1">
                          Disubmit oleh{' '}
                          <span className="font-semibold text-foreground">{proof.submittedByName || '—'}</span>
                          {' · '}
                          {format(new Date(proof.submittedAt), "dd MMM yyyy, HH:mm", { locale: id })}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {(proof.flagReasons ?? []).map((r, i) => (
                            <FlagPill key={i} reason={r} />
                          ))}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="rounded-none border-amber-400 text-amber-700 bg-amber-50 font-mono text-[10px] uppercase tracking-widest px-2 py-1 flex-shrink-0"
                      >
                        Pending Review
                      </Badge>
                    </div>
                  </CardHeader>

                  {/* ── Photo + GPS data ── */}
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Photo */}
                      <div className="w-full md:w-2/5 aspect-[4/3] bg-black relative overflow-hidden">
                        <motion.img
                          src={proof.photoUrl || ''}
                          alt="Bukti instalasi"
                          className="w-full h-full object-cover"
                          initial={{ scale: 1.05, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.5 }}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                          <div className="flex items-center gap-1 text-white font-mono text-[10px]">
                            <Camera className="w-3 h-3" />
                            {format(new Date(proof.submittedAt), 'dd MMM yyyy HH:mm', { locale: id })}
                          </div>
                        </div>
                        {proof.isMockLocation && (
                          <div className="absolute top-2 right-2">
                            <motion.div
                              className="bg-red-600 text-white font-mono text-[9px] uppercase tracking-widest px-2 py-1 flex items-center gap-1"
                              animate={{ opacity: [1, 0.5, 1] }}
                              transition={{ duration: 1.2, repeat: Infinity }}
                            >
                              <AlertTriangle className="w-2.5 h-2.5" /> Mock GPS
                            </motion.div>
                          </div>
                        )}
                      </div>

                      {/* GPS metadata */}
                      <div className="flex-1 p-6 grid grid-cols-2 gap-4 content-start border-l border-border">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Koordinat</p>
                          <a
                            href={`https://maps.google.com/?q=${proof.gpsLat},${proof.gpsLng}`}
                            target="_blank" rel="noreferrer"
                            className="font-mono text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <MapPin className="w-3 h-3" />
                            {proof.gpsLat?.toFixed(5)}, {proof.gpsLng?.toFixed(5)}
                          </a>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Akurasi GPS</p>
                          <p className={`font-mono text-sm font-bold ${(proof.gpsAccuracyMeters ?? 0) > 50 ? 'text-red-600' : 'text-green-700'}`}>
                            {proof.gpsAccuracyMeters != null ? `${proof.gpsAccuracyMeters} m` : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Dalam Area Layanan</p>
                          <p className="font-mono text-sm">
                            {proof.withinServiceArea == null
                              ? '—'
                              : proof.withinServiceArea
                              ? <span className="text-green-700 font-bold">Ya</span>
                              : <span className="text-red-600 font-bold">Tidak</span>
                            }
                          </p>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Mock Location</p>
                          <p className={`font-mono text-sm font-bold ${proof.isMockLocation ? 'text-red-600' : 'text-green-700'}`}>
                            {proof.isMockLocation ? 'Terdeteksi' : 'Bersih'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ── Timeline toggle ── */}
                    <div className="border-t border-border">
                      <button
                        onClick={() => toggleTimeline(proof.id)}
                        className="w-full flex items-center justify-between px-6 py-3 bg-muted/20 hover:bg-muted/40 transition-colors text-left group"
                      >
                        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
                          Timeline Perjalanan Material
                        </span>
                        <motion.div
                          animate={{ rotate: expandedTimeline[proof.id] ? 180 : 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                        >
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </motion.div>
                      </button>

                      <AnimatePresence>
                        {expandedTimeline[proof.id] && (
                          <motion.div
                            key="timeline"
                            variants={timelineWrapVariants}
                            initial="hidden"
                            animate="show"
                            exit="exit"
                            className="overflow-hidden"
                          >
                            <div className="px-6 py-8 border-t border-border bg-background">
                              <TrackingTimeline trackingId={proof.trackingId} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </CardContent>

                  {/* ── Action buttons ── */}
                  <CardFooter className="p-0 border-t border-border grid grid-cols-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <motion.button
                          className="flex items-center justify-center gap-2 h-14 border-r border-border text-red-600 hover:bg-red-50 transition-colors font-mono text-xs uppercase tracking-wider"
                          whileHover={{ backgroundColor: 'rgba(254,242,242,1)' }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <X className="w-4 h-4" /> Tolak
                        </motion.button>
                      </DialogTrigger>
                      <DialogContent className="rounded-none sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="font-serif text-xl">Tolak Bukti Instalasi</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground font-mono">
                          Tracking: <span className="text-foreground font-bold">{proof.trackingCode}</span>
                        </p>
                        <Input
                          placeholder="Alasan penolakan..."
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          className="rounded-none border-border font-mono text-sm mt-2"
                        />
                        <Button
                          onClick={() => handleReview(proof.id, 'rejected')}
                          disabled={reviewMutation.isPending}
                          variant="destructive"
                          className="rounded-none uppercase tracking-widest font-mono text-xs h-12 w-full mt-2"
                        >
                          Konfirmasi Tolak
                        </Button>
                      </DialogContent>
                    </Dialog>

                    <motion.button
                      onClick={() => handleReview(proof.id, 'approved')}
                      disabled={reviewMutation.isPending}
                      className="flex items-center justify-center gap-2 h-14 bg-green-700 hover:bg-green-800 text-white transition-colors font-mono text-xs uppercase tracking-wider disabled:opacity-50"
                      whileHover={{ backgroundColor: '#166534' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Check className="w-4 h-4" /> Setujui
                    </motion.button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
