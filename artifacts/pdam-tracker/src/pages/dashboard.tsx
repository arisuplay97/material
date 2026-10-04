import React, { useState, useMemo } from 'react';
import { usePdamData } from '@/hooks/usePdamData';
import { useFilters, filterPelanggan, computeStats } from '@/lib/filters';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { KECAMATAN_LIST, pdamService, kecamatanName } from '@/services/pdamDataService';
import { Pelanggan } from '@/types/pdam';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Download,
  Search,
  MapPin,
  RotateCcw,
  Building2,
  ArrowRight,
  AlertOctagon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  FileSpreadsheet,
  Calendar,
  ShieldCheck,
  Layers,
  Eye,
  TrendingUp,
  Activity,
  SlidersHorizontal,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  GOLONGAN_LIST,
  GOLONGAN_META,
  STATUS_META,
  VALIDITY_TARGET,
  formatNumber,
  formatDate,
} from '@/lib/constants';
import { canSeePII, canExport, displayName } from '@/lib/privacy';

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
      .filter((w) => filters.wilayah === 'all' || filters.wilayah === w.kode)
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

  // Export handler
  const handleExport = async () => {
    const kecNama = filters.kecamatan === 'all' ? 'Semua_Kecamatan' : kecamatanName(filters.kecamatan);
    await pdamService.exportPelanggan(
      filteredList,
      `Data_Pelanggan_${kecNama.replace(/\s+/g, '_')}`,
      { includePII: canSeePII(user?.role) },
    );
  };

  const handleOpenGis = (kodePelanggan?: string) => {
    if (kodePelanggan) {
      setLocation(`/gis?search=${encodeURIComponent(kodePelanggan)}`);
    } else {
      setLocation('/gis');
    }
  };

  const currentKecName = filters.kecamatan === 'all' ? 'Semua Kecamatan' : kecamatanName(filters.kecamatan);
  const welcomeName = user?.name ? user.name.split(' ').slice(0, 2).join(' ') : 'Muh Sofiyan';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto text-neutral-900 dark:text-neutral-100">
      {/* ── 1. FlowAI-Style Welcome Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-neutral-900 dark:text-white">
            Welcome Back, {welcomeName}!
          </h1>
          <p className="text-xs sm:text-[13px] text-neutral-500 dark:text-neutral-400 mt-1 font-normal">
            Monitoring data sambungan, verifikasi mutu data, dan sebaran wilayah di {currentKecName}.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          {/* Date Chip (FlowAI Style) */}
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
            <span>{formatDate(activeSnapshot?.uploaded_at || new Date().toISOString())}</span>
          </div>

          {/* Primary Action Button (FlowAI Solid Charcoal "+ Created Workflow" Style) */}
          <Button
            onClick={() => handleOpenGis()}
            className="h-9 px-4 rounded-xl text-xs font-medium gap-2 bg-[#111827] hover:bg-[#1f2937] text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 shadow-2xs transition-all cursor-pointer border-0"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>+ Buka Peta GIS</span>
          </Button>

          {canExport(user?.role) && (
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={filteredList.length === 0}
              className="h-9 px-3.5 rounded-xl text-xs font-medium gap-1.5 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-neutral-400" />
              <span>Ekspor Excel</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── 2. Top Row: 4 Metric Cards (FlowAI 1:1 Grid Layout) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Pelanggan */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Total Pelanggan</span>
              </div>
            </div>
            <div className="mt-3.5">
              <span className="text-2xl sm:text-[32px] font-semibold tracking-tight text-neutral-900 dark:text-white tabular">
                {formatNumber(stats.total)}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
            {totalDelta !== null && totalDelta !== 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60">
                {totalDelta >= 0 ? `+${totalDelta}` : totalDelta} baris
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                Stabil
              </span>
            )}
            <span className="text-[11px] text-neutral-400 font-medium">
              {wilayahDistribution.length} Wilayah
            </span>
          </div>
        </div>

        {/* Card 2: Sambungan Aktif */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Sambungan Aktif</span>
              </div>
            </div>
            <div className="mt-3.5">
              <span className="text-2xl sm:text-[32px] font-semibold tracking-tight text-neutral-900 dark:text-white tabular">
                {formatNumber(stats.aktif)}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60">
              {stats.total ? ((stats.aktif / stats.total) * 100).toFixed(1) : 0}% aktif
            </span>
            <span className="text-[11px] text-neutral-400 font-medium">
              Non: {stats.nonaktif} • Putus: {stats.putus}
            </span>
          </div>
        </div>

        {/* Card 3: Mutu Validitas Data */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Tingkat Validitas</span>
              </div>
            </div>
            <div className="mt-3.5">
              <span className="text-2xl sm:text-[32px] font-semibold tracking-tight text-neutral-900 dark:text-white tabular">
                {stats.validityPct.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                stats.validityPct >= VALIDITY_TARGET
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60'
              }`}
            >
              Target ≥{VALIDITY_TARGET}%
            </span>
            <span className="text-[11px] text-neutral-400 font-medium">
              {formatNumber(stats.valid)} data lolos
            </span>
          </div>
        </div>

        {/* Card 4: Perlu Verifikasi */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Perlu Verifikasi</span>
              </div>
            </div>
            <div className="mt-3.5">
              <span className="text-2xl sm:text-[32px] font-semibold tracking-tight text-neutral-900 dark:text-white tabular">
                {formatNumber(stats.flagged)}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
            {stats.anomaly > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60">
                {stats.anomaly} Anomali Spasial
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                0 Anomali
              </span>
            )}
            <span className="text-[11px] text-neutral-400 font-medium">
              {stats.total ? ((stats.flagged / stats.total) * 100).toFixed(1) : 0}% total
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Spatial Anomaly Notice (Executive Style, Not Loud AI Slop) ── */}
      {stats.anomaly > 0 && (
        <div className="rounded-2xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0 mt-0.5 border border-rose-200/50">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-900 dark:text-white text-xs sm:text-sm">
                  Terdeteksi {stats.anomaly} Pelanggan dengan Koordinat di Luar Wilayah Kecamatan
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/70 dark:text-rose-200">
                  Anomali Spasial
                </span>
              </div>
              <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                Titik GPS pelanggan tercatat berada di kecamatan tetangga. Disarankan untuk verifikasi fisik di lapangan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                update({ quality: 'anomaly' });
                setCurrentPage(1);
              }}
              className="h-8 px-3 text-xs rounded-xl bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 shadow-2xs"
            >
              Filter Anomali Ini
            </Button>
            <Button
              size="sm"
              onClick={() => setLocation('/gis?kual=anomaly')}
              className="h-8 px-3 text-xs rounded-xl bg-[#111827] hover:bg-[#1f2937] text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 gap-1.5 shadow-2xs"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Tinjau di Peta</span>
            </Button>
          </div>
        </div>
      )}

      {/* ── 4. FlowAI-Style Main Section: "Active Workflows" -> "Daftar Pelanggan" ── */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 sm:p-6 shadow-2xs space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-white">
              Daftar Pelanggan
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
              {formatNumber(filteredList.length)} data
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
            <span>Halaman {currentPage} dari {totalPages}</span>
          </div>
        </div>

        {/* Filter Toolbar (Clean, Rounded-XL SaaS Controls) */}
        <div className="pt-2 pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* Kecamatan selector */}
            <div>
              <Select
                value={filters.kecamatan}
                onValueChange={(val) => {
                  update({ kecamatan: val });
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200 focus:ring-1 focus:ring-neutral-400">
                  <SelectValue placeholder="Pilih Kecamatan" />
                </SelectTrigger>
                <SelectContent className="max-h-72 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-xl">
                  <SelectItem value="all" className="text-xs">
                    Semua Kecamatan (13)
                  </SelectItem>
                  {KECAMATAN_LIST.map((kec) => (
                    <SelectItem key={kec.kode} value={kec.kode} className="text-xs">
                      <span className="font-mono font-semibold mr-1.5 text-neutral-400">{kec.kode}</span>
                      <span>{kec.nama}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Wilayah selector */}
            <div>
              <Select
                value={filters.wilayah}
                onValueChange={(val) => {
                  update({ wilayah: val });
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200 focus:ring-1 focus:ring-neutral-400">
                  <SelectValue placeholder="Semua Wilayah" />
                </SelectTrigger>
                <SelectContent className="max-h-72 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-xl">
                  <SelectItem value="all" className="text-xs">
                    Semua Wilayah ({currentKecamatanWilayah.length})
                  </SelectItem>
                  {currentKecamatanWilayah.map((w) => (
                    <SelectItem key={w.kode} value={w.kode} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: w.warna }} />
                        <span className="font-mono text-neutral-400">{w.kode}</span>
                        <span className="truncate">{w.nama}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Golongan selector */}
            <div>
              <Select
                value={filters.golongan}
                onValueChange={(val) => {
                  update({ golongan: val });
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200 focus:ring-1 focus:ring-neutral-400">
                  <SelectValue placeholder="Semua Golongan" />
                </SelectTrigger>
                <SelectContent className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-xl">
                  <SelectItem value="all" className="text-xs">
                    Semua Golongan
                  </SelectItem>
                  {GOLONGAN_LIST.map((g) => (
                    <SelectItem key={g} value={g} className="text-xs">
                      {g} — {GOLONGAN_META[g]?.label || g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status selector */}
            <div>
              <Select
                value={filters.status}
                onValueChange={(val) => {
                  update({ status: val });
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200 focus:ring-1 focus:ring-neutral-400">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-xl">
                  <SelectItem value="all" className="text-xs">
                    Semua Status
                  </SelectItem>
                  <SelectItem value="Aktif" className="text-xs">
                    Aktif
                  </SelectItem>
                  <SelectItem value="Nonaktif" className="text-xs">
                    Nonaktif
                  </SelectItem>
                  <SelectItem value="Putus" className="text-xs">
                    Putus
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Kualitas selector */}
            <div>
              <Select
                value={filters.quality}
                onValueChange={(val: any) => {
                  update({ quality: val });
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200 focus:ring-1 focus:ring-neutral-400">
                  <SelectValue placeholder="Kualitas Data" />
                </SelectTrigger>
                <SelectContent className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-xl">
                  <SelectItem value="all" className="text-xs">
                    Semua Kualitas
                  </SelectItem>
                  <SelectItem value="valid" className="text-xs">
                    Data Valid
                  </SelectItem>
                  <SelectItem value="flagged" className="text-xs">
                    Perlu Verifikasi
                  </SelectItem>
                  <SelectItem value="anomaly" className="text-xs">
                    Anomali Batas
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search + Reset */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <Input
                  id="dashboard-search-input"
                  placeholder="Cari kode/nama..."
                  value={filters.q}
                  onChange={(e) => {
                    update({ q: e.target.value });
                    setCurrentPage(1);
                  }}
                  className="pl-8.5 h-9 text-xs rounded-xl border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200 focus-visible:ring-1 focus-visible:ring-neutral-400"
                />
              </div>

              {activeCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  className="h-9 px-2 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white shrink-0 rounded-xl cursor-pointer"
                  title="Reset filter"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Clean FlowAI Table */}
        <div className="overflow-x-auto -mx-5 sm:-mx-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200/60 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-800/30 text-neutral-500 dark:text-neutral-400 text-[11px] font-medium">
                <th className="py-3 px-5 sm:px-6 font-semibold">Kode Pelanggan</th>
                <th className="py-3 px-4 font-semibold">Nama Pelanggan</th>
                <th className="py-3 px-4 font-semibold">Wilayah</th>
                <th className="py-3 px-4 font-semibold">Golongan</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Mutu Data</th>
                <th className="py-3 px-5 sm:px-6 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400 text-xs">
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
                      className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-5 sm:px-6 font-mono font-semibold text-neutral-900 dark:text-white">
                        {item.kode_pelanggan}
                      </td>
                      <td className="py-3 px-4 font-medium text-neutral-800 dark:text-neutral-200">
                        {displayName(item.nama_pelanggan, user?.role)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: wilayahColor }} />
                          <span className="font-mono text-neutral-400 text-[11px]">{item.kode_wilayah}</span>
                          <span className="truncate max-w-[130px] text-neutral-600 dark:text-neutral-300">{item.nama_wilayah}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center font-mono text-[10px] py-0.5 px-2 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium">
                          {item.golongan}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            item.status_sambungan === 'Aktif'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50'
                              : item.status_sambungan === 'Nonaktif'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/50'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/50'
                          }`}
                        >
                          {item.status_sambungan}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {item.spatial_anomaly ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60">
                            <AlertOctagon className="w-2.5 h-2.5" />
                            Anomali
                          </span>
                        ) : item.is_flagged ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Bertanda
                          </span>
                        ) : (
                          <span className="text-[11px] text-neutral-400 font-normal">Valid</span>
                        )}
                      </td>
                      <td className="py-3 px-5 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDetail(item);
                            }}
                            className="text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                          >
                            Detail
                          </button>
                          <span className="text-neutral-300 dark:text-neutral-700">•</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenGis(item.kode_pelanggan);
                            }}
                            className="text-xs font-medium text-neutral-900 dark:text-white hover:underline transition-colors flex items-center gap-1 cursor-pointer"
                            title="Tampilkan titik di Peta GIS internal"
                          >
                            <MapPin className="w-3 h-3 text-neutral-500" />
                            <span>Peta</span>
                          </button>
                          <span className="text-neutral-300 dark:text-neutral-700">•</span>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors flex items-center gap-1 cursor-pointer"
                            title={`Buka titik koordinat (${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}) di Google Maps`}
                          >
                            <ExternalLink className="w-3 h-3 text-blue-500" />
                            <span>G-Maps</span>
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

        {/* Micro-Tick / Dotted Divider (FlowAI Signature Detail) */}
        <div className="border-t border-dashed border-neutral-200 dark:border-neutral-800 pt-3 flex items-center justify-between text-xs text-neutral-500">
          <span>
            Menampilkan {filteredList.length ? (currentPage - 1) * pageSize + 1 : 0} –{' '}
            {Math.min(filteredList.length, currentPage * pageSize)} dari {formatNumber(filteredList.length)} data
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="h-8 px-2.5 rounded-xl border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="px-2 font-mono font-medium text-neutral-800 dark:text-neutral-200">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="h-8 px-2.5 rounded-xl border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── 5. Lower Section: "Recent Using Templates" -> Sebaran Wilayah & Komposisi Data ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-white">
            Analisis Wilayah & Komposisi Data
          </h2>
          <span className="text-xs text-neutral-400 font-mono">
            {wilayahDistribution.length} Wilayah Terdaftar
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Wilayah Distribution Bars (2/3 width) */}
          <div className="lg:col-span-2 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-2xs">
            <div className="flex items-center justify-between pb-3.5 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Sebaran Pelanggan per Wilayah</h3>
                <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Warna titik disinkronkan dengan acuan peta GIS. Klik baris untuk memfilter wilayah.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {wilayahDistribution.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-400">
                  Tidak ada data wilayah untuk filter saat ini.
                </div>
              ) : (
                wilayahDistribution.map((w) => {
                  const pct = (w.total / maxWilayahTotal) * 100;
                  return (
                    <div
                      key={w.kode}
                      onClick={() => update({ wilayah: filters.wilayah === w.kode ? 'all' : w.kode })}
                      className="p-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: w.warna }} />
                          <span className="font-mono text-[11px] text-neutral-400">{w.kode}</span>
                          <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate">{w.nama}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[11px] tabular">
                          <span className="font-semibold text-neutral-900 dark:text-white">{w.total}</span>
                          {w.flagged > 0 && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                              ({w.flagged} flag)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress track */}
                      <div className="h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex">
                        <div
                          className="h-full transition-all duration-300 rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: w.warna,
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
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-2xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Komposisi Data</h3>
              <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                Rincian kategori tarif dan status sambungan pelanggan aktif.
              </p>

              {/* Golongan breakdown */}
              <div className="mt-4 space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block font-semibold">
                  Golongan Tarif
                </span>
                <div className="space-y-1.5">
                  {GOLONGAN_LIST.map((g) => {
                    const val = stats.golongan[g] || 0;
                    const pct = stats.total ? ((val / stats.total) * 100).toFixed(1) : '0';
                    return (
                      <div key={g} className="flex items-center justify-between text-xs p-2 rounded-xl bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: GOLONGAN_META[g]?.color }} />
                          <span className="font-semibold text-neutral-900 dark:text-white font-mono">{g}</span>
                          <span className="text-[11px] text-neutral-400 truncate">{GOLONGAN_META[g]?.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] tabular">
                          <span className="font-semibold text-neutral-900 dark:text-white">{val}</span>
                          <span className="text-[10px] text-neutral-400">({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status breakdown */}
              <div className="mt-5 space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block font-semibold">
                  Status Sambungan
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['Aktif', 'Nonaktif', 'Putus'] as const).map((st) => (
                    <div key={st} className="p-2.5 rounded-xl bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 text-center">
                      <span className="text-[10px] text-neutral-400 block font-medium">{st}</span>
                      <span className="text-sm font-bold text-neutral-900 dark:text-white font-mono tabular block mt-0.5">
                        {stats.status[st] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Snapshot Info Footer */}
            <div className="mt-5 pt-3.5 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 space-y-1">
              <div className="flex items-center justify-between">
                <span>File Aktif:</span>
                <span className="font-mono text-neutral-800 dark:text-neutral-200 truncate max-w-[160px]">
                  {activeSnapshot?.filename || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Pengunggah:</span>
                <span className="text-neutral-800 dark:text-neutral-200 font-medium">{activeSnapshot?.uploader_name || 'Admin'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Slide-Over Customer Detail Sheet (Clean FlowAI Drawer Style) ── */}
      <Sheet open={Boolean(selectedDetail)} onOpenChange={(open) => !open && setSelectedDetail(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-white dark:bg-neutral-900 border-l border-neutral-200/80 dark:border-neutral-800">
          {selectedDetail && (
            <>
              <SheetHeader className="p-5 border-b border-neutral-100 dark:border-neutral-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-bold text-neutral-900 dark:text-white">
                    {selectedDetail.kode_pelanggan}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                    {selectedDetail.golongan}
                  </span>
                </div>
                <SheetTitle className="text-sm font-semibold text-neutral-900 dark:text-white text-left">
                  {displayName(selectedDetail.nama_pelanggan, user?.role)}
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                {/* Anomaly Notice */}
                {selectedDetail.spatial_anomaly && (
                  <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                      <span>Anomali Spasial Terdeteksi</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">{selectedDetail.spatial_anomaly}</p>
                  </div>
                )}

                {/* Flag reasons */}
                {!selectedDetail.spatial_anomaly && selectedDetail.is_flagged && (
                  <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Perlu Verifikasi</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">{selectedDetail.flag_reasons.join(', ')}</p>
                  </div>
                )}

                {/* Detail Information Fields */}
                <div className="space-y-3.5 p-4 rounded-xl bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-neutral-400 block font-semibold">Alamat</span>
                    <span className="text-xs text-neutral-800 dark:text-neutral-200 mt-0.5 block leading-relaxed font-medium">
                      {canSeePII(user?.role) ? selectedDetail.alamat : 'Tersensor (Hak Akses Terbatas)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-800">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-neutral-400 block font-semibold">Wilayah</span>
                      <span className="font-semibold text-neutral-900 dark:text-white">{selectedDetail.nama_wilayah}</span>
                      <span className="text-[10px] font-mono text-neutral-400 block">{selectedDetail.kode_wilayah}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono text-neutral-400 block font-semibold">Kecamatan</span>
                      <span className="font-semibold text-neutral-900 dark:text-white">{kecamatanName(selectedDetail.kode_kecamatan)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-800">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-neutral-400 block font-semibold">Status Sambungan</span>
                      <span className="font-semibold text-neutral-900 dark:text-white">{selectedDetail.status_sambungan}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono text-neutral-400 block font-semibold">Nomor Meter</span>
                      <span className="font-mono text-neutral-900 dark:text-white">{selectedDetail.nomor_meter || '-'}</span>
                    </div>
                  </div>

                  {canSeePII(user?.role) && (
                    <div className="pt-2.5 border-t border-neutral-200/60 dark:border-neutral-800">
                      <span className="text-[10px] uppercase font-mono text-neutral-400 block font-semibold">Koordinat WGS84</span>
                      <span className="font-mono text-[11px] text-neutral-800 dark:text-neutral-200">
                        {selectedDetail.latitude.toFixed(6)}, {selectedDetail.longitude.toFixed(6)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2.5 bg-white dark:bg-neutral-900">
                <Button
                  size="sm"
                  onClick={() => {
                    handleOpenGis(selectedDetail.kode_pelanggan);
                    setSelectedDetail(null);
                  }}
                  className="flex-1 rounded-xl text-xs gap-1.5 h-9 bg-[#111827] hover:bg-[#1f2937] text-white dark:bg-white dark:text-neutral-900 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Buka di Peta GIS</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDetail(null)}
                  className="rounded-xl text-xs h-9 border-neutral-200/80 dark:border-neutral-800 cursor-pointer"
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
