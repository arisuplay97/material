import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePdamData } from '@/hooks/usePdamData';
import { useFilters, filterPelanggan, computeStats } from '@/lib/filters';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { KECAMATAN_LIST, pdamService, kecamatanName } from '@/services/pdamDataService';
import { Pelanggan } from '@/types/pdam';
import {
  Users,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Download,
  Search,
  MapPin,
  RotateCcw,
  AlertOctagon,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  GOLONGAN_LIST,
  GOLONGAN_META,
  VALIDITY_TARGET,
  formatNumber,
  formatDate,
  type QualityFilter,
} from '@/lib/constants';
import { canSeePII, canExport, displayName } from '@/lib/privacy';
import { cn } from '@/lib/utils';

/* ───────────────────────── helpers ───────────────────────── */

const rise = (i: number): React.CSSProperties => ({ ['--i' as string]: i }) as React.CSSProperties;

/** Eased count-up; skipped for reduced-motion users. */
function useCountUp(target: number, duration = 750): number {
  const [val, setVal] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      fromRef.current = target;
      setVal(target);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (target - from) * eased;
      fromRef.current = v;
      setVal(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return val;
}

/** True one frame after mount, so width/stroke transitions play on first paint. */
function useReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return ready;
}

function Ring({
  pct,
  size = 64,
  stroke = 6,
  color,
  children,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color: string;
  children?: React.ReactNode;
}) {
  const ready = useReady();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = ready ? Math.min(100, Math.max(0, pct)) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p / 100)}
          style={{ transition: 'stroke-dashoffset 1000ms cubic-bezier(0.22, 0.8, 0.24, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

function FilterPill({
  label,
  display,
  value,
  onChange,
  active,
  children,
}: {
  label: string;
  display: string;
  value: string;
  onChange: (v: string) => void;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          'h-9 w-auto justify-start gap-2 rounded-full border-0 px-3.5 text-[12.5px] font-medium shadow-none outline-none transition-colors',
          'focus:ring-2 focus:ring-ring/40 [&>svg:last-child]:ml-0.5 [&>svg:last-child]:h-3.5 [&>svg:last-child]:w-3.5 [&>svg:last-child]:opacity-60',
          active
            ? 'bg-primary/10 text-primary hover:bg-primary/15'
            : 'bg-muted/70 text-foreground hover:bg-muted',
        )}
      >
        <span className={cn('text-[11.5px] font-normal', active ? 'text-primary/70' : 'text-muted-foreground')}>
          {label}
        </span>
        <SelectValue>{display}</SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-72 rounded-xl border-border/60 p-1 shadow-xl">{children}</SelectContent>
    </Select>
  );
}

const STATUS_STYLE: Record<string, { dot: string; text: string }> = {
  Aktif: { dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' },
  Nonaktif: { dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300' },
  Putus: { dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-300' },
};

const CARD =
  'group relative overflow-hidden rounded-2xl bg-card p-5 ring-1 ring-border/60 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-18px_hsl(222_30%_20%/0.3)]';

/* ───────────────────────── page ───────────────────────── */

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { pelanggan, wilayah, activeSnapshot, previousSnapshot } = usePdamData();
  const { filters, update, reset, activeCount } = useFilters();
  const ready = useReady();

  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;
  const [selectedDetail, setSelectedDetail] = useState<Pelanggan | null>(null);

  const filteredList = useMemo(
    () => filterPelanggan(pelanggan, filters, { searchPII: canSeePII(user?.role) }),
    [pelanggan, filters, user?.role],
  );
  const stats = useMemo(() => computeStats(filteredList), [filteredList]);

  const totalDelta = useMemo(() => {
    if (!previousSnapshot) return null;
    return activeSnapshot ? activeSnapshot.total_rows - previousSnapshot.total_rows : null;
  }, [activeSnapshot, previousSnapshot]);

  const wilayahColorMap = useMemo(() => {
    const map = new Map<string, string>();
    wilayah.forEach((w) => map.set(w.kode, w.warna));
    return map;
  }, [wilayah]);

  const currentKecamatanWilayah = useMemo(() => {
    if (filters.kecamatan === 'all') return wilayah;
    return wilayah.filter((w) => w.kodeKecamatan === filters.kecamatan);
  }, [wilayah, filters.kecamatan]);

  const wilayahDistribution = useMemo(() => {
    return currentKecamatanWilayah
      .map((w) => {
        const item = stats.perWilayah.get(w.kode) || { total: 0, flagged: 0 };
        return {
          kode: w.kode,
          nama: w.nama,
          warna: w.warna,
          total: item.total,
          flagged: item.flagged,
          valid: item.total - item.flagged,
        };
      })
      .filter((w) => filters.wilayah === 'all' || filters.wilayah === w.kode)
      .sort((a, b) => b.total - a.total);
  }, [currentKecamatanWilayah, stats, filters.wilayah]);

  const maxWilayahTotal = useMemo(
    () => Math.max(...wilayahDistribution.map((w) => w.total), 1),
    [wilayahDistribution],
  );

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedList = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, safePage, pageSize]);

  const handleExport = async () => {
    const kecNama = filters.kecamatan === 'all' ? 'Semua_Kecamatan' : kecamatanName(filters.kecamatan);
    await pdamService.exportPelanggan(filteredList, `Data_Pelanggan_${kecNama.replace(/\s+/g, '_')}`, {
      includePII: canSeePII(user?.role),
    });
  };

  const handleOpenGis = (kodePelanggan?: string) => {
    setLocation(kodePelanggan ? `/gis?search=${encodeURIComponent(kodePelanggan)}` : '/gis');
  };

  const setFilter = (patch: Parameters<typeof update>[0]) => {
    update(patch);
    setCurrentPage(1);
  };

  const currentKecName = filters.kecamatan === 'all' ? 'Semua Kecamatan' : kecamatanName(filters.kecamatan);

  // Animated KPI numbers
  const nTotal = useCountUp(stats.total);
  const nAktif = useCountUp(stats.aktif);
  const nFlagged = useCountUp(stats.flagged);
  const nValidity = useCountUp(stats.validityPct);

  const aktifPct = stats.total ? (stats.aktif / stats.total) * 100 : 0;
  const flaggedPct = stats.total ? (stats.flagged / stats.total) * 100 : 0;
  const meetsTarget = stats.validityPct >= VALIDITY_TARGET;

  const wilayahDisplay =
    filters.wilayah === 'all' ? 'Semua' : currentKecamatanWilayah.find((w) => w.kode === filters.wilayah)?.nama || filters.wilayah;
  const qualityDisplay: Record<QualityFilter, string> = {
    all: 'Semua',
    valid: 'Valid',
    flagged: 'Perlu verifikasi',
    anomaly: 'Anomali batas',
    colocation: 'Titik sama beda wilayah',
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-7 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {/* ── Header ── */}
      <header className="d-rise flex flex-col justify-between gap-4 sm:flex-row sm:items-end" style={rise(0)}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Ringkasan</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
            Data Pelanggan
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Mutu data, status sambungan, dan sebaran wilayah di{' '}
            <span className="font-medium text-foreground">{currentKecName}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            id="dash-open-gis"
            onClick={() => handleOpenGis()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-muted/70 px-4 text-[13px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MapPin className="h-4 w-4 text-primary" />
            Buka Peta GIS
          </button>
          {canExport(user?.role) && (
            <button
              type="button"
              id="dash-export"
              onClick={handleExport}
              disabled={filteredList.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-[0_8px_20px_-10px_hsl(213_80%_35%/0.8)] transition-all hover:-translate-y-px hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Ekspor Excel
            </button>
          )}
        </div>
      </header>

      {/* ── Filters ── */}
      <section className="d-rise flex flex-wrap items-center gap-2" style={rise(1)} aria-label="Filter data">
        <div className="relative w-full sm:w-[260px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="dash-search"
            value={filters.q}
            onChange={(e) => setFilter({ q: e.target.value })}
            placeholder="Cari kode atau nama…"
            className="h-9 w-full rounded-full bg-muted/70 pl-10 pr-4 text-[12.5px] text-foreground outline-none transition-all placeholder:text-muted-foreground/70 hover:bg-muted focus:bg-card focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <span className="mx-1 hidden h-5 w-px bg-border sm:block" />

        <FilterPill
          label="Kecamatan"
          display={filters.kecamatan === 'all' ? 'Semua' : kecamatanName(filters.kecamatan)}
          value={filters.kecamatan}
          onChange={(v) => setFilter({ kecamatan: v })}
          active={filters.kecamatan !== 'all'}
        >
          <SelectItem value="all" className="rounded-lg text-xs">
            Semua Kecamatan
          </SelectItem>
          {KECAMATAN_LIST.map((kec) => (
            <SelectItem key={kec.kode} value={kec.kode} className="rounded-lg text-xs">
              <span className="mr-1.5 font-mono font-semibold text-muted-foreground">{kec.kode}</span>
              {kec.nama}
            </SelectItem>
          ))}
        </FilterPill>

        <FilterPill
          label="Wilayah"
          display={wilayahDisplay}
          value={filters.wilayah}
          onChange={(v) => setFilter({ wilayah: v })}
          active={filters.wilayah !== 'all'}
        >
          <SelectItem value="all" className="rounded-lg text-xs">
            Semua Wilayah ({currentKecamatanWilayah.length})
          </SelectItem>
          {currentKecamatanWilayah.map((w) => (
            <SelectItem key={w.kode} value={w.kode} className="rounded-lg text-xs">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: w.warna }} />
                <span className="font-mono text-muted-foreground">{w.kode}</span>
                <span className="truncate">{w.nama}</span>
              </span>
            </SelectItem>
          ))}
        </FilterPill>

        <FilterPill
          label="Golongan"
          display={filters.golongan === 'all' ? 'Semua' : filters.golongan}
          value={filters.golongan}
          onChange={(v) => setFilter({ golongan: v })}
          active={filters.golongan !== 'all'}
        >
          <SelectItem value="all" className="rounded-lg text-xs">
            Semua Golongan
          </SelectItem>
          {GOLONGAN_LIST.map((g) => (
            <SelectItem key={g} value={g} className="rounded-lg text-xs">
              <span className="mr-1.5 font-mono font-semibold">{g}</span>
              <span className="text-muted-foreground">{GOLONGAN_META[g]?.label}</span>
            </SelectItem>
          ))}
        </FilterPill>

        <FilterPill
          label="Status"
          display={filters.status === 'all' ? 'Semua' : filters.status}
          value={filters.status}
          onChange={(v) => setFilter({ status: v })}
          active={filters.status !== 'all'}
        >
          <SelectItem value="all" className="rounded-lg text-xs">
            Semua Status
          </SelectItem>
          {(['Aktif', 'Nonaktif', 'Putus'] as const).map((s) => (
            <SelectItem key={s} value={s} className="rounded-lg text-xs">
              <span className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', STATUS_STYLE[s].dot)} />
                {s}
              </span>
            </SelectItem>
          ))}
        </FilterPill>

        <FilterPill
          label="Kualitas"
          display={qualityDisplay[filters.quality]}
          value={filters.quality}
          onChange={(v) => setFilter({ quality: v as QualityFilter })}
          active={filters.quality !== 'all'}
        >
          <SelectItem value="all" className="rounded-lg text-xs">
            Semua Kualitas
          </SelectItem>
          <SelectItem value="valid" className="rounded-lg text-xs">
            Data valid
          </SelectItem>
          <SelectItem value="flagged" className="rounded-lg text-xs">
            Perlu verifikasi
          </SelectItem>
          <SelectItem value="anomaly" className="rounded-lg text-xs">
            Anomali batas
          </SelectItem>
        </FilterPill>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => {
              reset();
              setCurrentPage(1);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {activeCount}
            </span>
          </button>
        )}
      </section>

      {/* ── Anomaly banner ── */}
      {stats.anomaly > 0 && (
        <section
          className="d-rise flex flex-col justify-between gap-3 rounded-2xl bg-gradient-to-r from-rose-500/[0.10] via-rose-500/[0.05] to-transparent p-4 ring-1 ring-rose-500/20 sm:flex-row sm:items-center"
          style={rise(2)}
        >
          <div className="flex items-start gap-3.5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
              <AlertOctagon className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-foreground">
                {formatNumber(stats.anomaly)} pelanggan berada di luar batas kecamatannya
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                Titik GPS tercatat di kecamatan lain. Disarankan verifikasi lapangan sebelum data dipakai.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setFilter({ quality: 'anomaly' })}
              className="h-9 rounded-xl px-3.5 text-[12.5px] font-medium text-rose-700 transition-colors hover:bg-rose-500/10 dark:text-rose-300"
            >
              Filter anomali
            </button>
            <button
              type="button"
              onClick={() => setLocation('/gis?kual=anomaly')}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 text-[12.5px] font-semibold text-white transition-all hover:-translate-y-px hover:bg-rose-500"
            >
              Tinjau di peta
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      )}

      {/* ── KPI cards ── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan angka">
        {/* Hero: total */}
        <article
          className="d-rise group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(213_65%_27%)] via-[hsl(210_68%_33%)] to-[hsl(195_72%_36%)] p-5 text-white shadow-[0_18px_36px_-20px_hsl(213_75%_28%/0.85)] transition-all duration-300 hover:-translate-y-0.5"
          style={rise(3)}
        >
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 left-10 h-36 w-36 rounded-full bg-cyan-300/10 blur-2xl" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage: 'radial-gradient(white 1px, transparent 1.2px)',
              backgroundSize: '18px 18px',
              maskImage: 'linear-gradient(120deg, transparent 35%, black)',
              WebkitMaskImage: 'linear-gradient(120deg, transparent 35%, black)',
            }}
          />
          <div className="relative flex items-center justify-between">
            <span className="text-[12.5px] font-medium text-white/75">Total Pelanggan</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
              <Users className="h-[18px] w-[18px]" />
            </span>
          </div>
          <p className="relative mt-5 text-[40px] font-semibold leading-none tracking-tight tabular">
            {formatNumber(Math.round(nTotal))}
          </p>
          <div className="relative mt-4 flex flex-wrap items-center gap-2 text-[11.5px]">
            {totalDelta !== null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 font-medium">
                {totalDelta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {totalDelta >= 0 ? `+${formatNumber(totalDelta)}` : formatNumber(totalDelta)}
                <span className="font-normal text-white/70">vs snapshot lalu</span>
              </span>
            )}
            <span className="rounded-full bg-white/10 px-2 py-1 text-white/80">{wilayahDistribution.length} wilayah</span>
          </div>
        </article>

        {/* Active */}
        <article className={cn(CARD, 'd-rise')} style={rise(4)}>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[12.5px] font-medium text-muted-foreground">Sambungan Aktif</span>
              <p className="mt-4 text-[34px] font-semibold leading-none tracking-tight text-foreground tabular">
                {formatNumber(Math.round(nAktif))}
              </p>
            </div>
            <Ring pct={aktifPct} color="hsl(var(--success))" size={62} stroke={6}>
              <span className="text-[12px] font-semibold text-foreground tabular">{aktifPct.toFixed(0)}%</span>
            </Ring>
          </div>
          <div className="mt-5 flex items-center gap-3 text-[11.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Nonaktif <b className="font-semibold text-foreground tabular">{formatNumber(stats.nonaktif)}</b>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Putus <b className="font-semibold text-foreground tabular">{formatNumber(stats.putus)}</b>
            </span>
          </div>
          <CheckCircle2 className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-16 text-emerald-500/[0.07]" />
        </article>

        {/* Validity */}
        <article className={cn(CARD, 'd-rise')} style={rise(5)}>
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-medium text-muted-foreground">Validitas Data</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10.5px] font-semibold',
                meetsTarget
                  ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
              )}
            >
              {meetsTarget ? 'Memenuhi target' : 'Perlu perapian'}
            </span>
          </div>
          <p className="mt-4 text-[34px] font-semibold leading-none tracking-tight text-foreground tabular">
            {nValidity.toFixed(1)}
            <span className="ml-0.5 text-xl text-muted-foreground">%</span>
          </p>
          <div className="mt-5">
            <div className="relative h-2 rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full',
                  meetsTarget ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-amber-500 to-orange-400',
                )}
                style={{
                  width: ready ? `${Math.min(100, stats.validityPct)}%` : '0%',
                  transition: 'width 1000ms cubic-bezier(0.22, 0.8, 0.24, 1)',
                }}
              />
              <span
                className="absolute -top-1 h-4 w-0.5 rounded-full bg-foreground/50"
                style={{ left: `${VALIDITY_TARGET}%` }}
                title={`Target ${VALIDITY_TARGET}%`}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
              <span>
                <b className="font-semibold text-foreground tabular">{formatNumber(stats.valid)}</b> baris bersih
              </span>
              <span>Target ≥{VALIDITY_TARGET}%</span>
            </div>
          </div>
          <ShieldCheck className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-16 text-primary/[0.06]" />
        </article>

        {/* Needs verification */}
        <article className={cn(CARD, 'd-rise')} style={rise(6)}>
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-medium text-muted-foreground">Perlu Verifikasi</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/12 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-[18px] w-[18px]" />
            </span>
          </div>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="text-[34px] font-semibold leading-none tracking-tight text-amber-600 tabular dark:text-amber-400">
              {formatNumber(Math.round(nFlagged))}
            </span>
            <span className="text-[11.5px] text-muted-foreground">{flaggedPct.toFixed(1)}% dari total</span>
          </p>
          <div className="mt-5 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Anomali spasial <b className="font-semibold text-foreground tabular">{formatNumber(stats.anomaly)}</b>
            </span>
            <button
              type="button"
              onClick={() => setFilter({ quality: 'flagged' })}
              className="inline-flex items-center gap-0.5 text-[11.5px] font-semibold text-primary transition-colors hover:text-primary/70"
            >
              Tinjau
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </article>
      </section>

      {/* ── Distribution + composition ── */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <article className={cn(CARD, 'd-rise p-0 hover:translate-y-0 lg:col-span-2')} style={rise(7)}>
          <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-6">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Sebaran per Wilayah</h2>
              <p className="mt-1 text-[12px] text-muted-foreground">Klik wilayah untuk memfilter seluruh halaman.</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-4 rounded-full bg-primary/70" /> Valid
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-4 rounded-full bg-amber-400" /> Perlu verifikasi
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
                {wilayahDistribution.length} wilayah
              </span>
            </div>
          </div>

          <div className="mt-4 max-h-[440px] overflow-y-auto px-3 pb-4">
            {wilayahDistribution.length === 0 ? (
              <div className="py-14 text-center text-[12.5px] text-muted-foreground">
                Tidak ada data wilayah untuk filter saat ini.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-x-2 md:grid-cols-2">
                {wilayahDistribution.map((w) => {
                  const selected = filters.wilayah === w.kode;
                  return (
                    <button
                      key={w.kode}
                      type="button"
                      onClick={() => setFilter({ wilayah: selected ? 'all' : w.kode })}
                      className={cn(
                        'flex w-full flex-col gap-2 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selected ? 'bg-primary/[0.07] ring-1 ring-primary/25' : 'hover:bg-muted/60',
                      )}
                    >
                      <div className="flex items-center justify-between gap-3 text-[12.5px]">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: w.warna }} />
                          <span className="truncate font-medium text-foreground">{w.nama}</span>
                          <span className="font-mono text-[10.5px] text-muted-foreground">{w.kode}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 tabular">
                          {w.flagged > 0 && (
                            <span className="rounded-full bg-amber-500/12 px-1.5 py-px text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                              {w.flagged}
                            </span>
                          )}
                          <span className="font-semibold text-foreground">{formatNumber(w.total)}</span>
                        </span>
                      </div>
                      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full"
                          style={{
                            width: ready ? `${(w.valid / maxWilayahTotal) * 100}%` : '0%',
                            backgroundColor: w.warna,
                            transition: 'width 800ms cubic-bezier(0.22, 0.8, 0.24, 1)',
                          }}
                        />
                        <div
                          className="h-full bg-amber-400"
                          style={{
                            width: ready ? `${(w.flagged / maxWilayahTotal) * 100}%` : '0%',
                            transition: 'width 800ms cubic-bezier(0.22, 0.8, 0.24, 1)',
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </article>

        <article className={cn(CARD, 'd-rise flex flex-col justify-between p-6 hover:translate-y-0')} style={rise(8)}>
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Komposisi</h2>
            <p className="mt-1 text-[12px] text-muted-foreground">Golongan tarif dan status sambungan.</p>

            <div className="mt-5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Golongan</p>
              <div className="mt-2.5 flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
                {GOLONGAN_LIST.map((g) => {
                  const val = stats.golongan[g] || 0;
                  if (!val || !stats.total) return null;
                  return (
                    <div
                      key={g}
                      title={`${g}: ${val}`}
                      className="h-full first:rounded-l-full last:rounded-r-full"
                      style={{
                        width: ready ? `${(val / stats.total) * 100}%` : '0%',
                        backgroundColor: GOLONGAN_META[g]?.color,
                        transition: 'width 900ms cubic-bezier(0.22, 0.8, 0.24, 1)',
                      }}
                    />
                  );
                })}
              </div>
              <ul className="mt-3.5 space-y-1">
                {GOLONGAN_LIST.map((g) => {
                  const val = stats.golongan[g] || 0;
                  const pct = stats.total ? ((val / stats.total) * 100).toFixed(1) : '0.0';
                  return (
                    <li key={g} className="flex items-center justify-between rounded-lg px-1.5 py-1 text-[12px]">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: GOLONGAN_META[g]?.color }} />
                        <span className="font-mono font-semibold text-foreground">{g}</span>
                        <span className="truncate text-muted-foreground">{GOLONGAN_META[g]?.label}</span>
                      </span>
                      <span className="flex shrink-0 items-baseline gap-1.5 tabular">
                        <span className="font-semibold text-foreground">{formatNumber(val)}</span>
                        <span className="w-10 text-right text-[10.5px] text-muted-foreground">{pct}%</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Status</p>
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                {(['Aktif', 'Nonaktif', 'Putus'] as const).map((st) => (
                  <div key={st} className="rounded-xl bg-muted/50 px-3 py-2.5">
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_STYLE[st].dot)} />
                      {st}
                    </span>
                    <span className="mt-1 block text-[17px] font-semibold leading-none text-foreground tabular">
                      {formatNumber(stats.status[st] || 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 rounded-xl bg-muted/50 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card text-primary ring-1 ring-border/60">
              <FileSpreadsheet className="h-4 w-4" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[12px] font-medium text-foreground">{activeSnapshot?.filename || '-'}</p>
              <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
                oleh {activeSnapshot?.uploader_name || 'Admin'}
              </p>
            </div>
          </div>
        </article>
      </section>

      {/* ── Customer table ── */}
      <section className={cn(CARD, 'd-rise overflow-hidden p-0 hover:translate-y-0')} style={rise(9)}>
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Daftar Pelanggan</h2>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-foreground tabular">
              {formatNumber(filteredList.length)}
            </span>
          </div>
          <span className="text-[11.5px] text-muted-foreground">
            Halaman {safePage} dari {totalPages}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[12.5px]">
            <thead>
              <tr className="border-y border-border/60 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-6 py-3">Kode</th>
                <th className="px-3 py-3">Nama</th>
                <th className="px-3 py-3">Wilayah</th>
                <th className="px-3 py-3">Gol.</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Mutu</th>
                <th className="px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-[12.5px] text-muted-foreground">
                    Tidak ada pelanggan yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item) => {
                  const wilayahColor = wilayahColorMap.get(item.kode_wilayah) || '#94A3B8';
                  const st = STATUS_STYLE[item.status_sambungan] || STATUS_STYLE.Aktif;
                  return (
                    <tr
                      key={item.id}
                      tabIndex={0}
                      onClick={() => setSelectedDetail(item)}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedDetail(item)}
                      className="group/row cursor-pointer outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/50"
                    >
                      <td className="px-6 py-3 font-mono text-[12px] font-semibold text-foreground">
                        {item.kode_pelanggan}
                      </td>
                      <td className="px-3 py-3 font-medium text-foreground">
                        {displayName(item.nama_pelanggan, user?.role)}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: wilayahColor }} />
                          <span className="max-w-[140px] truncate text-foreground">{item.nama_wilayah}</span>
                          <span className="font-mono text-[10.5px] text-muted-foreground">{item.kode_wilayah}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-foreground">
                          {item.golongan}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn('inline-flex items-center gap-1.5 text-[12px] font-medium', st.text)}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />
                          {item.status_sambungan}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {item.spatial_anomaly ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/12 px-2 py-0.5 text-[10.5px] font-semibold text-rose-700 dark:text-rose-300">
                            <AlertOctagon className="h-3 w-3" />
                            Anomali
                          </span>
                        ) : item.is_flagged ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="h-3 w-3" />
                            Bertanda
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            Valid
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenGis(item.kode_pelanggan);
                          }}
                          title="Tampilkan titik di Peta GIS"
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11.5px] font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary group-hover/row:text-primary"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          Peta
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-6 py-3.5 text-[11.5px] text-muted-foreground">
          <span>
            Menampilkan{' '}
            <b className="font-semibold text-foreground tabular">
              {filteredList.length ? (safePage - 1) * pageSize + 1 : 0}–{Math.min(filteredList.length, safePage * pageSize)}
            </b>{' '}
            dari <b className="font-semibold text-foreground tabular">{formatNumber(filteredList.length)}</b> data
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
              disabled={safePage <= 1}
              aria-label="Halaman sebelumnya"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[56px] text-center font-mono text-[12px] font-semibold text-foreground tabular">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
              disabled={safePage >= totalPages}
              aria-label="Halaman berikutnya"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-35"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Customer detail sheet ── */}
      <Sheet open={Boolean(selectedDetail)} onOpenChange={(open) => !open && setSelectedDetail(null)}>
        <SheetContent side="right" className="flex w-full flex-col border-l-0 bg-card p-0 shadow-2xl sm:max-w-md">
          {selectedDetail && (
            <>
              <SheetHeader className="space-y-0 bg-gradient-to-br from-[hsl(213_65%_27%)] via-[hsl(210_68%_33%)] to-[hsl(195_72%_36%)] p-6 pr-12 text-left text-white">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full ring-2 ring-white/40"
                    style={{ backgroundColor: wilayahColorMap.get(selectedDetail.kode_wilayah) || '#94A3B8' }}
                  />
                  <span className="font-mono text-[12px] font-medium text-white/75">{selectedDetail.kode_pelanggan}</span>
                  <span className="ml-auto rounded-md bg-white/15 px-2 py-0.5 font-mono text-[10.5px] font-semibold">
                    {selectedDetail.golongan}
                  </span>
                </div>
                <SheetTitle className="mt-3 flex items-center gap-2 text-left text-xl font-semibold tracking-tight text-white">
                  <UserRound className="h-5 w-5 shrink-0 text-white/70" />
                  <span className="truncate">{displayName(selectedDetail.nama_pelanggan, user?.role)}</span>
                </SheetTitle>
                <p className="mt-1 text-[12px] text-white/70">
                  {selectedDetail.nama_wilayah} · {kecamatanName(selectedDetail.kode_kecamatan)}
                </p>
              </SheetHeader>

              <div className="flex-1 space-y-4 overflow-y-auto p-5 text-[12.5px]">
                {selectedDetail.spatial_anomaly && (
                  <div className="space-y-1.5 rounded-2xl bg-rose-500/[0.08] p-4 ring-1 ring-rose-500/20">
                    <div className="flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-300">
                      <AlertOctagon className="h-4 w-4 shrink-0" />
                      Anomali spasial terdeteksi
                    </div>
                    <p className="text-[12px] leading-relaxed text-foreground/80">{selectedDetail.spatial_anomaly}</p>
                  </div>
                )}

                {!selectedDetail.spatial_anomaly && selectedDetail.is_flagged && (
                  <div className="space-y-1.5 rounded-2xl bg-amber-500/[0.09] p-4 ring-1 ring-amber-500/25">
                    <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Perlu verifikasi
                    </div>
                    <p className="text-[12px] leading-relaxed text-foreground/80">
                      {selectedDetail.flag_reasons.join(', ')}
                    </p>
                  </div>
                )}

                <dl className="divide-y divide-border/60 rounded-2xl bg-muted/40 px-4">
                  <div className="py-3">
                    <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Alamat</dt>
                    <dd className="mt-1 leading-relaxed text-foreground">
                      {canSeePII(user?.role) ? selectedDetail.alamat : 'Tersensor (hak akses terbatas)'}
                    </dd>
                  </div>
                  <div className="grid grid-cols-2 gap-3 py-3">
                    <div>
                      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Wilayah</dt>
                      <dd className="mt-1 font-medium text-foreground">{selectedDetail.nama_wilayah}</dd>
                      <dd className="font-mono text-[10.5px] text-muted-foreground">{selectedDetail.kode_wilayah}</dd>
                    </div>
                    <div>
                      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Kecamatan</dt>
                      <dd className="mt-1 font-medium text-foreground">{kecamatanName(selectedDetail.kode_kecamatan)}</dd>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 py-3">
                    <div>
                      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Status</dt>
                      <dd
                        className={cn(
                          'mt-1 inline-flex items-center gap-1.5 font-semibold',
                          (STATUS_STYLE[selectedDetail.status_sambungan] || STATUS_STYLE.Aktif).text,
                        )}
                      >
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            (STATUS_STYLE[selectedDetail.status_sambungan] || STATUS_STYLE.Aktif).dot,
                          )}
                        />
                        {selectedDetail.status_sambungan}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">No. Meter</dt>
                      <dd className="mt-1 font-mono text-foreground">{selectedDetail.nomor_meter || '-'}</dd>
                    </div>
                  </div>
                  {canSeePII(user?.role) && (
                    <div className="py-3">
                      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Koordinat WGS84
                      </dt>
                      <dd className="mt-1 font-mono text-[12px] text-foreground">
                        {selectedDetail.latitude.toFixed(6)}, {selectedDetail.longitude.toFixed(6)}
                      </dd>
                    </div>
                  )}
                </dl>
                {selectedDetail.tanggal_pasang && (
                  <p className="px-1 text-[11px] text-muted-foreground">
                    Terpasang {formatDate(selectedDetail.tanggal_pasang)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 border-t border-border/60 bg-card p-4">
                <Button
                  onClick={() => {
                    handleOpenGis(selectedDetail.kode_pelanggan);
                    setSelectedDetail(null);
                  }}
                  className="h-10 flex-1 gap-2 rounded-xl text-[13px] font-semibold"
                >
                  <MapPin className="h-4 w-4" />
                  Buka di Peta GIS
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedDetail(null)}
                  className="h-10 rounded-xl bg-muted/70 px-4 text-[13px] hover:bg-muted"
                >
                  Tutup
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
