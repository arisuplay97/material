import React, { useState, useMemo } from 'react';
import { usePdamData } from '@/hooks/usePdamData';
import { useFilters, filterPelanggan, computeStats } from '@/lib/filters';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { KECAMATAN_LIST, pdamService, kecamatanName } from '@/services/pdamDataService';
import { Pelanggan } from '@/types/pdam';
import {
  Download,
  Search,
  MapPin,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Calendar,
  Printer,
  Plus,
  Filter,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  GOLONGAN_LIST,
  GOLONGAN_META,
  DEFAULT_GOLONGAN_COLORS,
  VALIDITY_TARGET,
  formatNumber,
  formatDate,
} from '@/lib/constants';
import { canSeePII, canExport, displayName } from '@/lib/privacy';
import { toast } from 'sonner';

/**
 * Exact Cloudflare Dashboard Sparkline (matches Reference Image 3: "Traffic overview")
 * - When `empty` is true (value === 0): renders the light grey sine wave + centered "No data" pill
 * - When `empty` is false: renders the Cloudflare #1368f6 blue area chart with dashed tail
 */
function CloudflareSparkline({
  variant = 1,
  empty = false,
}: {
  variant?: 1 | 2 | 3 | 4;
  empty?: boolean;
}) {
  if (empty) {
    return (
      <div className="relative h-[52px] w-full mt-3 select-none">
        <svg
          viewBox="0 0 280 52"
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          <path
            d="M0,28 C18,24 32,32 50,28 C68,24 82,32 100,28 C118,24 132,32 150,28 C168,24 182,32 200,28 C218,24 232,32 250,28 C264,25 272,30 280,28"
            fill="none"
            stroke="#e4e4e7"
            strokeWidth="1.25"
            className="dark:stroke-zinc-800"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-full border border-[#e4e4e7] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-0.5 text-[11px] font-normal text-[#71717a] dark:text-zinc-400">
            No data
          </span>
        </div>
      </div>
    );
  }

  const paths: Record<1 | 2 | 3 | 4, { line: string; area: string; tail: string }> = {
    1: {
      line: 'M0,50 L6,26 L12,30 L18,24 L24,50 L30,25 L36,38 L42,27 L48,50 L54,50 L60,24 L66,29 L72,26 L78,31 L84,27 L90,33 L96,28 L102,32 L108,24 L114,30 L120,26 L126,31 L132,50 L138,50 L144,44 L150,50 L156,50 L162,27 L168,26 L174,40 L180,50 L186,42 L192,50 L198,28 L204,44 L210,36 L216,50 L222,31 L228,48 L234,36 L240,29 L246,10 L252,26 L258,24 L264,29 L270,29',
      area: 'M0,52 L0,50 L6,26 L12,30 L18,24 L24,50 L30,25 L36,38 L42,27 L48,50 L54,50 L60,24 L66,29 L72,26 L78,31 L84,27 L90,33 L96,28 L102,32 L108,24 L114,30 L120,26 L126,31 L132,50 L138,50 L144,44 L150,50 L156,50 L162,27 L168,26 L174,40 L180,50 L186,42 L192,50 L198,28 L204,44 L210,36 L216,50 L222,31 L228,48 L234,36 L240,29 L246,10 L252,26 L258,24 L264,29 L270,29 L270,52 Z',
      tail: 'M270,29 L275,50 L280,27',
    },
    2: {
      line: 'M0,48 L8,24 L16,28 L24,22 L32,48 L40,25 L48,34 L56,24 L64,48 L72,26 L80,23 L88,28 L96,25 L104,30 L112,24 L120,28 L128,22 L136,27 L144,24 L152,48 L160,42 L168,26 L176,24 L184,36 L192,46 L200,27 L208,38 L216,32 L224,29 L232,42 L240,28 L248,12 L256,24 L264,23 L270,28',
      area: 'M0,52 L0,48 L8,24 L16,28 L24,22 L32,48 L40,25 L48,34 L56,24 L64,48 L72,26 L80,23 L88,28 L96,25 L104,30 L112,24 L120,28 L128,22 L136,27 L144,24 L152,48 L160,42 L168,26 L176,24 L184,36 L192,46 L200,27 L208,38 L216,32 L224,29 L232,42 L240,28 L248,12 L256,24 L264,23 L270,28 L270,52 Z',
      tail: 'M270,28 L275,48 L280,25',
    },
    3: {
      line: 'M0,32 L12,28 L24,29 L36,25 L48,27 L60,24 L72,26 L84,23 L96,25 L108,22 L120,24 L132,23 L144,26 L156,22 L168,24 L180,21 L192,23 L204,20 L216,22 L228,19 L240,21 L252,16 L264,19 L270,18',
      area: 'M0,52 L0,32 L12,28 L24,29 L36,25 L48,27 L60,24 L72,26 L84,23 L96,25 L108,22 L120,24 L132,23 L144,26 L156,22 L168,24 L180,21 L192,23 L204,20 L216,22 L228,19 L240,21 L252,16 L264,19 L270,18 L270,52 Z',
      tail: 'M270,18 L276,24 L280,17',
    },
    4: {
      line: 'M0,50 L6,25 L12,29 L18,24 L24,50 L30,24 L36,39 L42,27 L48,50 L54,50 L60,23 L66,28 L72,25 L78,30 L84,26 L90,32 L96,27 L102,31 L108,24 L114,29 L120,25 L126,30 L132,50 L138,50 L144,43 L150,50 L156,50 L162,26 L168,25 L174,39 L180,50 L186,41 L192,50 L198,27 L204,43 L210,35 L216,50 L222,30 L228,47 L234,35 L240,28 L246,8 L252,25 L258,23 L264,28 L270,28',
      area: 'M0,52 L0,50 L6,25 L12,29 L18,24 L24,50 L30,24 L36,39 L42,27 L48,50 L54,50 L60,23 L66,28 L72,25 L78,30 L84,26 L90,32 L96,27 L102,31 L108,24 L114,29 L120,25 L126,30 L132,50 L138,50 L144,43 L150,50 L156,50 L162,26 L168,25 L174,39 L180,50 L186,41 L192,50 L198,27 L204,43 L210,35 L216,50 L222,30 L228,47 L234,35 L240,28 L246,8 L252,25 L258,23 L264,28 L270,28 L270,52 Z',
      tail: 'M270,28 L275,50 L280,26',
    },
  };

  const p = paths[variant];

  return (
    <div className="relative h-[52px] w-full mt-3 select-none">
      <svg
        viewBox="0 0 280 52"
        preserveAspectRatio="none"
        className="w-full h-full block"
      >
        <path d={p.area} fill="rgba(19, 104, 246, 0.13)" />
        <path
          d={p.line}
          fill="none"
          stroke="#1368f6"
          strokeWidth="1.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={p.tail}
          fill="none"
          stroke="#1368f6"
          strokeWidth="1.4"
          strokeDasharray="2.5 2.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { pelanggan, wilayah, activeSnapshot, previousSnapshot } = usePdamData();
  const { filters, update, reset, activeCount } = useFilters();

  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Selected customer for detail sheet
  const [selectedDetail, setSelectedDetail] = useState<Pelanggan | null>(null);

  // Filtered customer list
  const filteredList = useMemo(() => {
    return filterPelanggan(pelanggan, filters, { searchPII: canSeePII(user?.role) });
  }, [pelanggan, filters, user?.role]);

  // Aggregate stats in a single pass
  const stats = useMemo(() => computeStats(filteredList), [filteredList]);

  // Previous snapshot delta calculation
  const totalDelta = useMemo(() => {
    if (!previousSnapshot) return null;
    return activeSnapshot ? activeSnapshot.total_rows - previousSnapshot.total_rows : null;
  }, [activeSnapshot, previousSnapshot]);

  // Wilayah lookup map
  const wilayahColorMap = useMemo(() => {
    const map = new Map<string, string>();
    wilayah.forEach((w) => map.set(w.kode, w.warna));
    return map;
  }, [wilayah]);

  // Dynamic Golongan list for filter dropdown
  const availableGolongan = useMemo(() => {
    const set = new Set<string>();
    pelanggan.forEach((p) => {
      if (p.golongan) set.add(p.golongan);
    });
    GOLONGAN_LIST.forEach((g) => set.add(g));
    return Array.from(set).filter(Boolean);
  }, [pelanggan]);

  const golonganLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    pelanggan.forEach((p) => {
      if (p.golongan && p.uraian_golongan && !map[p.golongan]) {
        map[p.golongan] = p.uraian_golongan;
      }
    });
    return map;
  }, [pelanggan]);

  // Wilayah filtered for current kecamatan
  const currentKecamatanWilayah = useMemo(() => {
    if (filters.kecamatan === 'all') return wilayah;
    return wilayah.filter((w) => w.kodeKecamatan === filters.kecamatan);
  }, [wilayah, filters.kecamatan]);

  // Sorted list of wilayah for horizontal distribution bar
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
      .filter((w) => {
        if (filters.wilayah === 'all') return true;
        const allowed = new Set(filters.wilayah.split(',').map((s) => s.trim()).filter(Boolean));
        return allowed.has(w.kode);
      })
      .sort((a, b) => b.total - a.total);
  }, [currentKecamatanWilayah, stats, filters.wilayah]);

  const maxWilayahTotal = useMemo(() => {
    return Math.max(...wilayahDistribution.map((w) => w.total), 1);
  }, [wilayahDistribution]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const paginatedList = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, totalPages, pageSize]);

  // Export handlers
  const handleExportAudit = async () => {
    try {
      await pdamService.exportAuditReport(
        filteredList,
        filters.kecamatan,
        { includePII: canSeePII(user?.role) },
      );
      toast.success('Laporan audit & anomali pelanggan berhasil diunduh (Excel Multi-Sheet).');
    } catch (e: any) {
      toast.error(e.message || 'Gagal mengekspor laporan audit.');
    }
  };

  const handleExportRaw = async () => {
    try {
      const kecNama = filters.kecamatan === 'all' ? 'Semua_Kecamatan' : kecamatanName(filters.kecamatan);
      await pdamService.exportPelanggan(
        filteredList,
        `Data_Pelanggan_${kecNama.replace(/\s+/g, '_')}`,
        { includePII: canSeePII(user?.role) },
      );
      toast.success('Data pelanggan mentah berhasil diekspor ke Excel.');
    } catch (e: any) {
      toast.error(e.message || 'Gagal mengekspor data.');
    }
  };

  const handleOpenGis = (kodePelanggan?: string) => {
    if (kodePelanggan) {
      setLocation(`/gis?search=${encodeURIComponent(kodePelanggan)}`);
    } else {
      setLocation('/gis');
    }
  };

  const activePct = stats.total ? ((stats.aktif / stats.total) * 100).toFixed(1) : '0.0';
  const flaggedPct = stats.total ? ((stats.flagged / stats.total) * 100).toFixed(1) : '0.0';

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1440px] mx-auto text-[#18181b] dark:text-zinc-100">
      {/* ── 1. Cloudflare "Traffic overview" Section Card (1:1 with Reference Image 3) ── */}
      <div className="rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900">
        {/* Row 1: Title on Left, Action Buttons on Right (Print / Copy link / + Add a chart) */}
        <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[16px] font-semibold text-[#18181b] dark:text-zinc-100 tracking-[-0.01em]">
            Ringkasan pelanggan
          </h1>

          <div className="flex items-center gap-2 flex-wrap">
            {canExport(user?.role) && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportAudit}
                  disabled={filteredList.length === 0}
                  title="Unduh laporan audit lengkap dengan rincian anomali"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Audit anomali</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportRaw}
                  disabled={filteredList.length === 0}
                  title="Unduh data pelanggan mentah (.xlsx)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor Excel</span>
                </Button>
              </>
            )}

            <Button size="sm" onClick={() => handleOpenGis()}>
              <Plus className="w-3.5 h-3.5" />
              <span>Buka Peta GIS</span>
            </Button>
          </div>
        </div>

        {/* Row 2: Filter Bar on Left ("Add filter" style), Live refresh & Date on Right */}
        <div className="px-5 py-3 border-t border-[#e5e7eb] dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#e4e4e7] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[13px] text-[#18181b] dark:text-zinc-100">
              <Filter className="w-3.5 h-3.5 text-[#52525b] dark:text-zinc-400" />
              <span>Filter</span>
            </div>

            {/* Kecamatan */}
            <div className="w-[180px]">
              <Select
                value={filters.kecamatan}
                onValueChange={(val) => {
                  update({ kecamatan: val });
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kecamatan" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">Semua kecamatan (13)</SelectItem>
                  {KECAMATAN_LIST.map((kec) => (
                    <SelectItem key={kec.kode} value={kec.kode}>
                      {kec.kode} — {kec.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Wilayah */}
            <div className="w-[175px]">
              <Select
                value={filters.wilayah.includes(',') ? 'multiple' : filters.wilayah}
                onValueChange={(val) => {
                  update({ wilayah: val });
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua wilayah">
                    {filters.wilayah.includes(',')
                      ? `${filters.wilayah.split(',').filter(Boolean).length} wilayah`
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {filters.wilayah.includes(',') && (
                    <SelectItem value="multiple" disabled>
                      {filters.wilayah.split(',').filter(Boolean).length} wilayah terpilih
                    </SelectItem>
                  )}
                  <SelectItem value="all">Semua wilayah ({currentKecamatanWilayah.length})</SelectItem>
                  {currentKecamatanWilayah.map((w) => (
                    <SelectItem key={w.kode} value={w.kode}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: w.warna }} />
                        <span>{w.kode}</span>
                        <span className="truncate">{w.nama}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Golongan */}
            <div className="w-[155px]">
              <Select
                value={filters.golongan}
                onValueChange={(val) => {
                  update({ golongan: val });
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua golongan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua golongan</SelectItem>
                  {availableGolongan.map((g) => {
                    const label = golonganLabelMap[g] || GOLONGAN_META[g]?.label || '';
                    return (
                      <SelectItem key={g} value={g}>
                        {g} {label && label !== g ? `— ${label}` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Kualitas */}
            <div className="w-[165px]">
              <Select
                value={filters.quality}
                onValueChange={(val: any) => {
                  update({ quality: val });
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua kualitas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua kualitas</SelectItem>
                  <SelectItem value="valid">Data valid</SelectItem>
                  <SelectItem value="flagged">Perlu verifikasi</SelectItem>
                  <SelectItem value="anomaly">Anomali batas</SelectItem>
                  <SelectItem value="colocation">Titik dobel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {activeCount > 0 && (
              <Button
                variant="outline"
                onClick={reset}
                title="Reset semua filter"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </Button>
            )}
          </div>

          {/* Right: Live refresh & Date pill */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                const res = await pdamService.syncFromCloud(true);
                if (res.ok) {
                  toast.success(res.message || 'Data berhasil disinkronkan dari Cloud.');
                } else {
                  toast.info(res.message || 'Data lokal sudah paling mutakhir.');
                }
              }}
            >
              <Play className="w-3 h-3" />
              <span>Live refresh</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => setLocation('/settings')}
              title="Kelola snapshot database"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(activeSnapshot?.uploaded_at || new Date().toISOString())}</span>
            </Button>
          </div>
        </div>

        {/* Row 3: 4 Cloudflare Sparkline Metric Cards (1:1 with Reference Image 3) */}
        <div className="px-5 pb-5 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total pelanggan */}
          <div
            onClick={() => {
              update({ status: 'all', quality: 'all' });
              setCurrentPage(1);
            }}
            className="rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900 pt-4 overflow-hidden flex flex-col justify-between cursor-pointer hover:border-[#d4d4d8] dark:hover:border-zinc-700 transition-colors"
          >
            <div className="px-4">
              <div className="text-[12px] font-normal text-[#71717a] dark:text-zinc-400">
                Total pelanggan
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[24px] leading-tight font-semibold text-[#18181b] dark:text-zinc-100 tabular-nums tracking-tight">
                  {formatNumber(stats.total)}
                </span>
                <span className="text-[12px] font-normal text-[#71717a] dark:text-zinc-400">
                  {totalDelta !== null && totalDelta !== 0
                    ? `↗ ${totalDelta > 0 ? `+${totalDelta}` : totalDelta}`
                    : `↗ ${wilayahDistribution.length} wilayah`}
                </span>
              </div>
            </div>
            <CloudflareSparkline variant={1} empty={stats.total === 0} />
          </div>

          {/* Card 2: Sambungan aktif */}
          <div
            onClick={() => {
              update({ status: filters.status === 'Aktif' ? 'all' : 'Aktif' });
              setCurrentPage(1);
            }}
            className="rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900 pt-4 overflow-hidden flex flex-col justify-between cursor-pointer hover:border-[#d4d4d8] dark:hover:border-zinc-700 transition-colors"
          >
            <div className="px-4">
              <div className="text-[12px] font-normal text-[#71717a] dark:text-zinc-400">
                Sambungan aktif
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[24px] leading-tight font-semibold text-[#18181b] dark:text-zinc-100 tabular-nums tracking-tight">
                  {formatNumber(stats.aktif)}
                </span>
                <span className="text-[12px] font-normal text-[#71717a] dark:text-zinc-400">
                  ↗ {activePct}%
                </span>
              </div>
            </div>
            <CloudflareSparkline variant={2} empty={stats.aktif === 0} />
          </div>

          {/* Card 3: Tingkat validitas */}
          <div
            onClick={() => {
              update({ quality: filters.quality === 'valid' ? 'all' : 'valid' });
              setCurrentPage(1);
            }}
            className="rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900 pt-4 overflow-hidden flex flex-col justify-between cursor-pointer hover:border-[#d4d4d8] dark:hover:border-zinc-700 transition-colors"
          >
            <div className="px-4">
              <div className="text-[12px] font-normal text-[#71717a] dark:text-zinc-400">
                Tingkat validitas
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[24px] leading-tight font-semibold text-[#18181b] dark:text-zinc-100 tabular-nums tracking-tight">
                  {stats.validityPct.toFixed(2)}%
                </span>
                <span className="text-[12px] font-normal text-[#71717a] dark:text-zinc-400">
                  ↗ {formatNumber(stats.valid)} valid
                </span>
              </div>
            </div>
            <CloudflareSparkline variant={3} empty={stats.valid === 0} />
          </div>

          {/* Card 4: Anomali & verifikasi */}
          <div
            onClick={() => {
              update({ quality: filters.quality === 'flagged' ? 'all' : 'flagged' });
              setCurrentPage(1);
            }}
            className="rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900 pt-4 overflow-hidden flex flex-col justify-between cursor-pointer hover:border-[#d4d4d8] dark:hover:border-zinc-700 transition-colors"
          >
            <div className="px-4">
              <div className="text-[12px] font-normal text-[#71717a] dark:text-zinc-400">
                Perlu verifikasi
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[24px] leading-tight font-semibold text-[#18181b] dark:text-zinc-100 tabular-nums tracking-tight">
                  {formatNumber(stats.flagged)}
                </span>
                {stats.flagged > 0 && (
                  <span className="text-[12px] font-normal text-[#71717a] dark:text-zinc-400">
                    ↗ {flaggedPct}%
                  </span>
                )}
              </div>
            </div>
            <CloudflareSparkline variant={4} empty={stats.flagged === 0} />
          </div>
        </div>
      </div>

      {/* ── 2. Clean Cloudflare Notice Bar for Spatial / Co-location Anomalies ── */}
      {(stats.anomaly > 0 || stats.colocation > 0) && (
        <div className="rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap text-[13px]">
            <span className="w-2 h-2 rounded-full bg-[#1368f6] shrink-0" />
            <span className="font-medium text-[#18181b] dark:text-zinc-100">
              Audit koordinat otomatis:
            </span>
            {stats.anomaly > 0 && (
              <span className="text-[#52525b] dark:text-zinc-400">
                <strong className="font-semibold text-[#18181b] dark:text-zinc-100">{formatNumber(stats.anomaly)}</strong> titik di luar batas wilayah
              </span>
            )}
            {stats.anomaly > 0 && stats.colocation > 0 && (
              <span className="text-[#d4d4d8] dark:text-zinc-700">•</span>
            )}
            {stats.colocation > 0 && (
              <span className="text-[#52525b] dark:text-zinc-400">
                <strong className="font-semibold text-[#18181b] dark:text-zinc-100">{formatNumber(stats.colocation)}</strong> titik koordinat ganda beda wilayah
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {stats.anomaly > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  update({ quality: 'anomaly' });
                  setCurrentPage(1);
                }}
              >
                Filter anomali batas
              </Button>
            )}
            {stats.colocation > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  update({ quality: 'colocation' });
                  setCurrentPage(1);
                }}
              >
                Filter titik dobel
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setLocation(stats.anomaly > 0 ? '/gis?kual=anomaly' : '/gis?kual=colocation')}
            >
              Tinjau di peta
            </Button>
          </div>
        </div>
      )}

      {/* ── 3. Cloudflare Data Table Card: Daftar pelanggan ── */}
      <div className="rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        {/* Card Header */}
        <div className="px-5 py-3.5 border-b border-[#e5e7eb] dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[15px] font-semibold text-[#18181b] dark:text-zinc-100">
              Daftar pelanggan
            </h2>
            <span className="rounded-full border border-dashed border-[#d4d4d8] dark:border-zinc-700 px-2.5 py-0.5 text-[11px] font-medium text-[#52525b] dark:text-zinc-300 tabular-nums">
              {formatNumber(filteredList.length)}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Status quick filter */}
            <div className="w-[140px]">
              <Select
                value={filters.status}
                onValueChange={(val) => {
                  update({ status: val });
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-[12.5px]">
                  <SelectValue placeholder="Semua status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  <SelectItem value="Aktif">Aktif</SelectItem>
                  <SelectItem value="Nonaktif">Nonaktif</SelectItem>
                  <SelectItem value="Putus">Putus</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="relative flex-1 sm:w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
              <Input
                id="dashboard-search-input"
                placeholder="Cari kode atau nama..."
                value={filters.q}
                onChange={(e) => {
                  update({ q: e.target.value });
                  setCurrentPage(1);
                }}
                className="pl-8 h-8 text-[12.5px]"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-[#e5e7eb] dark:border-zinc-800 bg-[#fafafa] dark:bg-zinc-900/50 text-[#71717a] dark:text-zinc-400 text-[12px]">
                <th className="py-2.5 px-5 font-medium">Kode pelanggan</th>
                <th className="py-2.5 px-4 font-medium">Nama pelanggan</th>
                <th className="py-2.5 px-4 font-medium">Wilayah</th>
                <th className="py-2.5 px-4 font-medium">Golongan</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium">Validasi koordinat</th>
                <th className="py-2.5 px-5 font-medium text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e7eb] dark:divide-zinc-800">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#71717a] text-[13px]">
                    Tidak ada data pelanggan yang cocok dengan filter yang dipilih.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item) => {
                  const wilayahColor = wilayahColorMap.get(item.kode_wilayah) || '#94A3B8';
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedDetail(item)}
                      className="hover:bg-[#fafafa] dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-5 font-medium text-[#18181b] dark:text-zinc-100 tabular-nums">
                        {item.kode_pelanggan}
                      </td>
                      <td className="py-3 px-4 text-[#18181b] dark:text-zinc-100">
                        {displayName(item.nama_pelanggan, user?.role)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: wilayahColor }} />
                          <span className="text-[#71717a] dark:text-zinc-400 text-[12px] tabular-nums">{item.kode_wilayah}</span>
                          <span className="truncate max-w-[140px] text-[#18181b] dark:text-zinc-200">{item.nama_wilayah}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center rounded-full border border-[#e4e4e7] dark:border-zinc-700 bg-[#fafafa] dark:bg-zinc-800 px-2.5 py-0.5 text-[11.5px] font-medium text-[#18181b] dark:text-zinc-200">
                          {item.golongan}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[#18181b] dark:text-zinc-200">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status_sambungan === 'Aktif'
                                ? 'bg-emerald-500'
                                : item.status_sambungan === 'Nonaktif'
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                          />
                          {item.status_sambungan}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {item.spatial_anomaly ? (
                          <span
                            className="inline-flex items-center rounded-full border border-dashed border-red-300 dark:border-red-800 bg-red-50/60 dark:bg-red-950/30 px-2.5 py-0.5 text-[11.5px] text-red-700 dark:text-red-300"
                            title={item.spatial_anomaly}
                          >
                            Anomali batas
                          </span>
                        ) : item.colocation_anomaly ? (
                          <span
                            className="inline-flex items-center rounded-full border border-dashed border-[#d4d4d8] dark:border-zinc-700 bg-[#f4f4f5] dark:bg-zinc-800 px-2.5 py-0.5 text-[11.5px] text-[#18181b] dark:text-zinc-200"
                            title={item.colocation_anomaly}
                          >
                            Titik dobel
                          </span>
                        ) : item.is_flagged ? (
                          <span className="inline-flex items-center rounded-full border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 px-2.5 py-0.5 text-[11.5px] text-amber-800 dark:text-amber-300">
                            Perlu verifikasi
                          </span>
                        ) : (
                          <span className="text-[12.5px] text-[#71717a] dark:text-zinc-400">
                            Valid
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDetail(item);
                            }}
                            className="h-7 px-2.5 text-[12px]"
                          >
                            Detail
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenGis(item.kode_pelanggan);
                            }}
                            className="h-7 px-2.5 text-[12px]"
                            title="Tampilkan titik di Peta GIS internal"
                          >
                            Peta
                          </Button>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-[#e4e4e7] dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-[#f4f4f5] dark:hover:bg-zinc-800 text-[12px] text-[#18181b] dark:text-zinc-100 transition-colors"
                            title={`Buka koordinat (${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}) di Google Maps`}
                          >
                            <span>Maps</span>
                            <ExternalLink className="w-3 h-3 text-[#71717a]" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-5 py-3 border-t border-[#e5e7eb] dark:border-zinc-800 flex items-center justify-between text-[12.5px] text-[#71717a] dark:text-zinc-400">
          <span className="tabular-nums">
            Menampilkan {filteredList.length ? (currentPage - 1) * pageSize + 1 : 0}–
            {Math.min(filteredList.length, currentPage * pageSize)} dari {formatNumber(filteredList.length)}
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="px-2.5 text-[12.5px] font-medium text-[#18181b] dark:text-zinc-100 tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── 4. Lower Section: Sebaran wilayah & Komposisi data ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Wilayah Distribution Bars (2/3 width) */}
        <div className="lg:col-span-2 rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-[#e5e7eb] dark:border-zinc-800 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#18181b] dark:text-zinc-100">
              Sebaran pelanggan per wilayah
            </h3>
            <span className="rounded-full border border-dashed border-[#d4d4d8] dark:border-zinc-700 px-2.5 py-0.5 text-[11px] font-medium text-[#52525b] dark:text-zinc-300">
              {wilayahDistribution.length} wilayah
            </span>
          </div>

          <div className="p-4 space-y-1.5 max-h-[380px] overflow-y-auto">
            {wilayahDistribution.length === 0 ? (
              <div className="py-12 text-center text-[13px] text-[#71717a]">
                Tidak ada data wilayah untuk filter saat ini.
              </div>
            ) : (
              wilayahDistribution.map((w) => {
                const pct = (w.total / maxWilayahTotal) * 100;
                return (
                  <div
                    key={w.kode}
                    onClick={() => {
                      if (filters.wilayah === 'all' || !filters.wilayah) {
                        update({ wilayah: w.kode });
                      } else {
                        const list = filters.wilayah.split(',').map((s) => s.trim()).filter(Boolean);
                        const next = list.includes(w.kode) ? list.filter((k) => k !== w.kode) : [...list, w.kode];
                        update({ wilayah: next.length === 0 ? 'all' : next.join(',') });
                      }
                    }}
                    className="p-2.5 rounded-lg hover:bg-[#f4f4f5]/70 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors text-[13px] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: w.warna }} />
                        <span className="text-[12px] text-[#71717a] dark:text-zinc-400 tabular-nums">{w.kode}</span>
                        <span className="font-medium text-[#18181b] dark:text-zinc-100 truncate">{w.nama}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[12.5px] tabular-nums">
                        <span className="font-semibold text-[#18181b] dark:text-zinc-100">{formatNumber(w.total)}</span>
                        {w.flagged > 0 && (
                          <span className="text-[11.5px] text-[#71717a] dark:text-zinc-400">
                            ({w.flagged} anomali)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-[#f4f4f5] dark:bg-zinc-800 overflow-hidden flex">
                      <div
                        className="h-full transition-all duration-300 rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: '#1368f6',
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Composition Summary (1/3 width) */}
        <div className="rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-3.5 border-b border-[#e5e7eb] dark:border-zinc-800">
              <h3 className="text-[15px] font-semibold text-[#18181b] dark:text-zinc-100">
                Komposisi golongan &amp; status
              </h3>
            </div>

            <div className="p-5 space-y-5">
              {/* Golongan breakdown */}
              <div className="space-y-2">
                <span className="text-[12px] font-normal text-[#71717a] dark:text-zinc-400 block">
                  Golongan tarif
                </span>
                <div className="divide-y divide-[#e5e7eb] dark:divide-zinc-800 border border-[#e5e7eb] dark:border-zinc-800 rounded-lg overflow-hidden">
                  {Object.entries(stats.golongan).length === 0 ? (
                    <div className="text-[12.5px] text-[#71717a] p-3">Tidak ada data golongan</div>
                  ) : (
                    Object.entries(stats.golongan)
                      .sort((a, b) => b[1] - a[1])
                      .map(([g, val], idx) => {
                        const pct = stats.total ? ((val / stats.total) * 100).toFixed(1) : '0';
                        const label = stats.golonganLabels?.[g] || GOLONGAN_META[g]?.label || '';
                        const color = GOLONGAN_META[g]?.color || DEFAULT_GOLONGAN_COLORS[idx % DEFAULT_GOLONGAN_COLORS.length];
                        return (
                          <div key={g} className="flex items-center justify-between text-[12.5px] px-3 py-2 bg-white dark:bg-zinc-900">
                            <div className="flex items-center gap-2 truncate">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              <span className="font-medium text-[#18181b] dark:text-zinc-100">{g}</span>
                              {label && label !== g && (
                                <span className="text-[12px] text-[#71717a] dark:text-zinc-400 truncate">{label}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[12px] tabular-nums">
                              <span className="font-medium text-[#18181b] dark:text-zinc-100">{formatNumber(val)}</span>
                              <span className="text-[#71717a] dark:text-zinc-400">({pct}%)</span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Status breakdown */}
              <div className="space-y-2">
                <span className="text-[12px] font-normal text-[#71717a] dark:text-zinc-400 block">
                  Status sambungan
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  {(['Aktif', 'Nonaktif', 'Putus'] as const).map((st) => (
                    <div key={st} className="p-3 rounded-lg border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900">
                      <span className="text-[11.5px] text-[#71717a] dark:text-zinc-400 block">{st}</span>
                      <span className="text-[16px] font-semibold text-[#18181b] dark:text-zinc-100 tabular-nums block mt-0.5">
                        {formatNumber(stats.status[st] || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Snapshot Info Footer */}
          <div className="px-5 py-3 border-t border-[#e5e7eb] dark:border-zinc-800 text-[12px] text-[#71717a] dark:text-zinc-400 flex items-center justify-between">
            <span className="truncate max-w-[180px]" title={activeSnapshot?.filename}>
              {activeSnapshot?.filename || 'Snapshot aktif'}
            </span>
            <span className="text-[#18181b] dark:text-zinc-200 font-medium">
              {activeSnapshot?.uploader_name || 'Admin'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Slide-Over Customer Detail Sheet ── */}
      <Sheet open={Boolean(selectedDetail)} onOpenChange={(open) => !open && setSelectedDetail(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-white dark:bg-zinc-900 border-l border-[#e5e7eb] dark:border-zinc-800">
          {selectedDetail && (
            <>
              <SheetHeader className="px-5 py-4 border-b border-[#e5e7eb] dark:border-zinc-800 space-y-1">
                <div className="flex items-center justify-between pr-6">
                  <span className="text-[15px] font-semibold text-[#18181b] dark:text-zinc-100 tabular-nums">
                    {selectedDetail.kode_pelanggan}
                  </span>
                  <span className="rounded-full border border-[#e4e4e7] dark:border-zinc-700 px-2.5 py-0.5 text-[11.5px] font-medium text-[#18181b] dark:text-zinc-200">
                    {selectedDetail.golongan}
                  </span>
                </div>
                <SheetTitle className="text-[14px] font-medium text-[#52525b] dark:text-zinc-300 text-left">
                  {displayName(selectedDetail.nama_pelanggan, user?.role)}
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-[13px]">
                {selectedDetail.spatial_anomaly && (
                  <div className="p-3.5 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-red-800 dark:text-red-300 space-y-1">
                    <div className="font-semibold text-[12.5px]">Anomali spasial terdeteksi</div>
                    <p className="text-[12px] leading-relaxed">{selectedDetail.spatial_anomaly}</p>
                  </div>
                )}

                {selectedDetail.colocation_anomaly && (
                  <div className="p-3.5 rounded-lg border border-[#e4e4e7] dark:border-zinc-700 bg-[#fafafa] dark:bg-zinc-800/50 text-[#18181b] dark:text-zinc-200 space-y-1">
                    <div className="font-semibold text-[12.5px]">Titik koordinat ganda (multi-wilayah)</div>
                    <p className="text-[12px] text-[#52525b] dark:text-zinc-400 leading-relaxed">
                      {selectedDetail.colocation_anomaly}
                    </p>
                  </div>
                )}

                {!selectedDetail.spatial_anomaly && selectedDetail.is_flagged && (
                  <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 space-y-1">
                    <div className="font-semibold text-[12.5px]">Perlu verifikasi</div>
                    <p className="text-[12px] leading-relaxed">{selectedDetail.flag_reasons.join(', ')}</p>
                  </div>
                )}

                <div className="divide-y divide-[#e5e7eb] dark:divide-zinc-800 rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <div className="p-3.5">
                    <span className="text-[12px] text-[#71717a] dark:text-zinc-400 block">Alamat</span>
                    <span className="text-[13px] text-[#18181b] dark:text-zinc-100 mt-0.5 block leading-relaxed">
                      {canSeePII(user?.role) ? selectedDetail.alamat : 'Tersensor (hak akses terbatas)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3.5">
                    <div>
                      <span className="text-[12px] text-[#71717a] dark:text-zinc-400 block">Wilayah</span>
                      <span className="font-medium text-[#18181b] dark:text-zinc-100">{selectedDetail.nama_wilayah}</span>
                      <span className="text-[11.5px] text-[#71717a] block">{selectedDetail.kode_wilayah}</span>
                    </div>
                    <div>
                      <span className="text-[12px] text-[#71717a] dark:text-zinc-400 block">Kecamatan</span>
                      <span className="font-medium text-[#18181b] dark:text-zinc-100">
                        {kecamatanName(selectedDetail.kode_kecamatan)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3.5">
                    <div>
                      <span className="text-[12px] text-[#71717a] dark:text-zinc-400 block">Status sambungan</span>
                      <span className="font-medium text-[#18181b] dark:text-zinc-100">
                        {selectedDetail.status_sambungan}
                      </span>
                    </div>
                    <div>
                      <span className="text-[12px] text-[#71717a] dark:text-zinc-400 block">Nomor meter</span>
                      <span className="text-[#18181b] dark:text-zinc-100 tabular-nums">
                        {selectedDetail.nomor_meter || '-'}
                      </span>
                    </div>
                  </div>

                  {canSeePII(user?.role) && (
                    <div className="p-3.5">
                      <span className="text-[12px] text-[#71717a] dark:text-zinc-400 block">Koordinat WGS84</span>
                      <span className="text-[13px] text-[#18181b] dark:text-zinc-100 tabular-nums">
                        {selectedDetail.latitude.toFixed(6)}, {selectedDetail.longitude.toFixed(6)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-[#e5e7eb] dark:border-zinc-800 flex items-center gap-2">
                <Button
                  onClick={() => {
                    handleOpenGis(selectedDetail.kode_pelanggan);
                    setSelectedDetail(null);
                  }}
                  className="flex-1"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Buka di Peta GIS</span>
                </Button>
                <Button variant="outline" onClick={() => setSelectedDetail(null)}>
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
