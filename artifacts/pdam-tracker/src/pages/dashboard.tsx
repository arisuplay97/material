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
  AlertOctagon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileSpreadsheet,
  Calendar,
  ShieldCheck,
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

  const currentKecName = filters.kecamatan === 'all' ? 'Semua Kecamatan' : kecamatanName(filters.kecamatan);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1440px] mx-auto text-foreground">
      {/* ── 1. Kumo Console Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
              Ringkasan Operasional &amp; Mutu Data
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-muted text-muted-foreground border border-border">
              {currentKecName}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Pemantauan sambungan pelanggan, validasi koordinat spasial, dan distribusi wilayah PDAM Tirta Ardhia Rinjani.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <div className="inline-flex items-center gap-1.5 h-8.5 px-3 rounded-md bg-card border border-border text-xs font-mono text-muted-foreground shadow-[0_1px_1px_rgba(0,0,0,0.02)]">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{formatDate(activeSnapshot?.uploaded_at || new Date().toISOString())}</span>
          </div>

          <Button onClick={() => handleOpenGis()}>
            <MapPin className="w-3.5 h-3.5" />
            <span>Buka Peta GIS</span>
          </Button>

          {canExport(user?.role) && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExportAudit}
                disabled={filteredList.length === 0}
                className="border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-700 dark:text-red-300"
                title="Unduh laporan audit lengkap dengan rincian anomali di sheet terdepan"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                <span>Laporan Audit (.xlsx)</span>
              </Button>

              <Button
                variant="outline"
                onClick={handleExportRaw}
                disabled={filteredList.length === 0}
                title="Unduh data pelanggan mentah"
              >
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Ekspor Data</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. Kumo Metric Grid (4 High-Density Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Pelanggan */}
        <div className="bg-card rounded-lg border border-border p-4 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Pelanggan</span>
              <div className="w-6.5 h-6.5 rounded-md bg-muted border border-border flex items-center justify-center text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-[28px] font-semibold tracking-tight text-foreground tabular font-mono">
                {formatNumber(stats.total)}
              </span>
            </div>
          </div>
          <div className="mt-3.5 pt-2.5 border-t border-border flex items-center justify-between text-xs">
            {totalDelta !== null && totalDelta !== 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                {totalDelta >= 0 ? `+${totalDelta}` : totalDelta} baris
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-muted text-muted-foreground border border-border">
                Stabil
              </span>
            )}
            <span className="text-[11px] font-mono text-muted-foreground">
              {wilayahDistribution.length} Wilayah
            </span>
          </div>
        </div>

        {/* Card 2: Sambungan Aktif */}
        <div className="bg-card rounded-lg border border-border p-4 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Sambungan Aktif</span>
              <div className="w-6.5 h-6.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-[28px] font-semibold tracking-tight text-foreground tabular font-mono">
                {formatNumber(stats.aktif)}
              </span>
            </div>
          </div>
          <div className="mt-3.5 pt-2.5 border-t border-border flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
              {stats.total ? ((stats.aktif / stats.total) * 100).toFixed(1) : 0}% aktif
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">
              Non: {stats.nonaktif} • Putus: {stats.putus}
            </span>
          </div>
        </div>

        {/* Card 3: Tingkat Validitas */}
        <div className="bg-card rounded-lg border border-border p-4 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Tingkat Validitas</span>
              <div className="w-6.5 h-6.5 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-[28px] font-semibold tracking-tight text-foreground tabular font-mono">
                {stats.validityPct.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="mt-3.5 pt-2.5 border-t border-border flex items-center justify-between text-xs">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border ${
                stats.validityPct >= VALIDITY_TARGET
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25'
              }`}
            >
              Target ≥{VALIDITY_TARGET}%
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">
              {formatNumber(stats.valid)} lolos
            </span>
          </div>
        </div>

        {/* Card 4: Perlu Verifikasi */}
        <div className="bg-card rounded-lg border border-border p-4 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Perlu Verifikasi</span>
              <div className="w-6.5 h-6.5 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-[28px] font-semibold tracking-tight text-foreground tabular font-mono">
                {formatNumber(stats.flagged)}
              </span>
            </div>
          </div>
          <div className="mt-3.5 pt-2.5 border-t border-border flex items-center justify-between text-xs flex-wrap gap-1">
            <div className="flex items-center gap-1 flex-wrap">
              {stats.anomaly > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-mono font-medium bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/25">
                  {stats.anomaly} Batas
                </span>
              )}
              {stats.colocation > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-mono font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/25">
                  {stats.colocation} Dobel
                </span>
              )}
              {stats.anomaly === 0 && stats.colocation === 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-muted text-muted-foreground border border-border">
                  0 Anomali
                </span>
              )}
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              {stats.total ? ((stats.flagged / stats.total) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Kumo Diagnostic Banner: Spatial Anomaly ── */}
      {stats.anomaly > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/[0.04] p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5 border border-red-500/25">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground text-xs sm:text-sm">
                  Terdeteksi {formatNumber(stats.anomaly)} Pelanggan dengan Koordinat di Luar Batas Wilayah
                </span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/25">
                  Anomali Spasial
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Titik GPS pelanggan tercatat melenceng dari poligon kecamatan/dekade acuan. Gunakan menu Koreksi Data atau tinjau di peta.
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
            >
              Filter Tabel
            </Button>
            <Button
              size="sm"
              onClick={() => setLocation('/gis?kual=anomaly')}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Tinjau di Peta</span>
            </Button>
          </div>
        </div>
      )}

      {/* ── Kumo Diagnostic Banner: Co-location Anomaly ── */}
      {stats.colocation > 0 && (
        <div className="rounded-lg border border-purple-500/30 bg-purple-500/[0.04] p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5 border border-purple-500/25">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground text-xs sm:text-sm">
                  Terdeteksi {formatNumber(stats.colocation)} Pelanggan dengan Titik Koordinat Sama Beda Wilayah
                </span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/25">
                  Titik Dobel
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Beberapa pelanggan menggunakan koordinat GPS identik padahal kode wilayah administrasinya berbeda.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                update({ quality: 'colocation' });
                setCurrentPage(1);
              }}
            >
              Filter Titik Dobel
            </Button>
            <Button
              size="sm"
              onClick={() => setLocation('/gis?kual=colocation')}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Tinjau di Peta</span>
            </Button>
          </div>
        </div>
      )}

      {/* ── 4. Kumo Data Table Card: Daftar Pelanggan ── */}
      <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
        {/* Kumo Structured Card Header */}
        <div className="px-4 sm:px-5 py-3 border-b border-border bg-muted/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              Daftar Pelanggan
            </h2>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-card text-muted-foreground border border-border">
              {formatNumber(filteredList.length)} baris
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span>Halaman {currentPage} / {totalPages}</span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-3.5 border-b border-border bg-card">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {/* Kecamatan selector */}
            <div>
              <Select
                value={filters.kecamatan}
                onValueChange={(val) => {
                  update({ kecamatan: val });
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Kecamatan" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">
                    Semua Kecamatan (13)
                  </SelectItem>
                  {KECAMATAN_LIST.map((kec) => (
                    <SelectItem key={kec.kode} value={kec.kode}>
                      <span className="font-mono font-semibold mr-1.5 text-muted-foreground">{kec.kode}</span>
                      <span>{kec.nama}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Wilayah selector */}
            <div>
              <Select
                value={filters.wilayah.includes(',') ? 'multiple' : filters.wilayah}
                onValueChange={(val) => {
                  update({ wilayah: val });
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua Wilayah">
                    {filters.wilayah.includes(',') ? `${filters.wilayah.split(',').filter(Boolean).length} Wilayah Terpilih` : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {filters.wilayah.includes(',') && (
                    <SelectItem value="multiple" disabled>
                      {filters.wilayah.split(',').filter(Boolean).length} Wilayah Terpilih
                    </SelectItem>
                  )}
                  <SelectItem value="all">
                    Semua Wilayah ({currentKecamatanWilayah.length})
                  </SelectItem>
                  {currentKecamatanWilayah.map((w) => (
                    <SelectItem key={w.kode} value={w.kode}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: w.warna }} />
                        <span className="font-mono text-muted-foreground">{w.kode}</span>
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
                <SelectTrigger>
                  <SelectValue placeholder="Semua Golongan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Semua Golongan
                  </SelectItem>
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

            {/* Status selector */}
            <div>
              <Select
                value={filters.status}
                onValueChange={(val) => {
                  update({ status: val });
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="Aktif">Aktif</SelectItem>
                  <SelectItem value="Nonaktif">Nonaktif</SelectItem>
                  <SelectItem value="Putus">Putus</SelectItem>
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
                <SelectTrigger>
                  <SelectValue placeholder="Kualitas Data" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kualitas</SelectItem>
                  <SelectItem value="valid">Data Valid</SelectItem>
                  <SelectItem value="flagged">Perlu Verifikasi</SelectItem>
                  <SelectItem value="anomaly">Anomali Batas</SelectItem>
                  <SelectItem value="colocation">Titik Dobel Beda Wilayah</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search + Reset */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="dashboard-search-input"
                  placeholder="Cari kode/nama..."
                  value={filters.q}
                  onChange={(e) => {
                    update({ q: e.target.value });
                    setCurrentPage(1);
                  }}
                  className="pl-8"
                />
              </div>

              {activeCount > 0 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={reset}
                  className="shrink-0"
                  title="Reset filter"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* High-Density Kumo Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/35 text-muted-foreground font-mono text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-4 sm:px-5 font-semibold">Kode</th>
                <th className="py-2.5 px-4 font-semibold">Nama Pelanggan</th>
                <th className="py-2.5 px-4 font-semibold">Wilayah</th>
                <th className="py-2.5 px-4 font-semibold">Gol</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
                <th className="py-2.5 px-4 font-semibold">Mutu Data</th>
                <th className="py-2.5 px-4 sm:px-5 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground text-xs">
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
                      className="hover:bg-muted/45 transition-colors cursor-pointer group"
                    >
                      <td className="py-2.5 px-4 sm:px-5 font-mono font-semibold text-foreground">
                        {item.kode_pelanggan}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-foreground">
                        {displayName(item.nama_pelanggan, user?.role)}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: wilayahColor }} />
                          <span className="font-mono text-muted-foreground text-[11px]">{item.kode_wilayah}</span>
                          <span className="truncate max-w-[130px] text-foreground/85">{item.nama_wilayah}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center font-mono text-[10.5px] py-0.5 px-1.5 rounded-md bg-muted border border-border text-foreground font-medium">
                          {item.golongan}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                            item.status_sambungan === 'Aktif'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                              : item.status_sambungan === 'Nonaktif'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25'
                              : 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/25'
                          }`}
                        >
                          {item.status_sambungan}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        {item.spatial_anomaly ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/25" title={item.spatial_anomaly}>
                            <AlertOctagon className="w-3 h-3" />
                            Anomali Batas
                          </span>
                        ) : item.colocation_anomaly ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/25" title={item.colocation_anomaly}>
                            <MapPin className="w-3 h-3" />
                            Titik Dobel
                          </span>
                        ) : item.is_flagged ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                            <AlertTriangle className="w-3 h-3" />
                            Bertanda
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-mono text-muted-foreground bg-muted/50 border border-border">
                            Valid
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 sm:px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDetail(item);
                            }}
                            className="px-2 py-1 rounded-md border border-border bg-card hover:bg-muted text-[11px] font-medium text-foreground transition-colors cursor-pointer"
                          >
                            Detail
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenGis(item.kode_pelanggan);
                            }}
                            className="px-2 py-1 rounded-md border border-border bg-card hover:bg-muted text-[11px] font-medium text-foreground transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Tampilkan titik di Peta GIS internal"
                          >
                            <MapPin className="w-3 h-3 text-primary" />
                            <span>Peta</span>
                          </button>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2 py-1 rounded-md border border-primary/25 bg-primary/5 hover:bg-primary/10 text-[11px] font-medium text-primary transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title={`Buka titik koordinat (${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}) di Google Maps`}
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Maps</span>
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

        {/* Kumo Table Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono text-[11px]">
            Menampilkan {filteredList.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(filteredList.length, currentPage * pageSize)} dari {formatNumber(filteredList.length)}
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="h-7.5 w-7.5 p-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="px-2 font-mono text-xs font-medium text-foreground tabular">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="h-7.5 w-7.5 p-0"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── 5. Lower Section: Sebaran Wilayah & Komposisi Data ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Wilayah Distribution Bars (2/3 width) */}
        <div className="lg:col-span-2 bg-card rounded-lg border border-border shadow-card overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-border bg-muted/25 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Sebaran Pelanggan per Wilayah</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Warna titik disinkronkan dengan acuan peta GIS. Klik baris untuk memfilter wilayah.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-card border border-border text-muted-foreground">
              {wilayahDistribution.length} Wilayah
            </span>
          </div>

          <div className="p-4 space-y-2 max-h-[380px] overflow-y-auto">
            {wilayahDistribution.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
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
                    className="p-2 rounded-md border border-transparent hover:border-border hover:bg-muted/40 cursor-pointer transition-colors text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: w.warna }} />
                        <span className="font-mono text-[11px] text-muted-foreground">{w.kode}</span>
                        <span className="font-medium text-foreground truncate">{w.nama}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px] tabular">
                        <span className="font-semibold text-foreground">{formatNumber(w.total)}</span>
                        {w.flagged > 0 && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            ({w.flagged} flag)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress track */}
                    <div className="h-1.5 w-full rounded-[3px] bg-muted overflow-hidden flex">
                      <div
                        className="h-full transition-all duration-300 rounded-[3px]"
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
        <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-3.5 border-b border-border bg-muted/25">
              <h3 className="text-sm font-semibold text-foreground">Komposisi Data</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Rincian kategori tarif dan status sambungan pelanggan.
              </p>
            </div>

            <div className="p-4 space-y-4">
              {/* Golongan breakdown */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block font-semibold">
                  Golongan Tarif
                </span>
                <div className="space-y-1.5">
                  {Object.entries(stats.golongan).length === 0 ? (
                    <div className="text-xs text-muted-foreground p-2">Tidak ada data golongan</div>
                  ) : (
                    Object.entries(stats.golongan)
                      .sort((a, b) => b[1] - a[1])
                      .map(([g, val], idx) => {
                        const pct = stats.total ? ((val / stats.total) * 100).toFixed(1) : '0';
                        const label = stats.golonganLabels?.[g] || GOLONGAN_META[g]?.label || '';
                        const color = GOLONGAN_META[g]?.color || DEFAULT_GOLONGAN_COLORS[idx % DEFAULT_GOLONGAN_COLORS.length];
                        return (
                          <div key={g} className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/35 border border-border">
                            <div className="flex items-center gap-2 truncate">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              <span className="font-semibold text-foreground font-mono">{g}</span>
                              {label && label !== g && (
                                <span className="text-[11px] text-muted-foreground truncate">{label}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-[11px] tabular">
                              <span className="font-semibold text-foreground">{formatNumber(val)}</span>
                              <span className="text-[10px] text-muted-foreground">({pct}%)</span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Status breakdown */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block font-semibold">
                  Status Sambungan
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['Aktif', 'Nonaktif', 'Putus'] as const).map((st) => (
                    <div key={st} className="p-2.5 rounded-md bg-muted/35 border border-border text-center">
                      <span className="text-[10px] text-muted-foreground block font-medium">{st}</span>
                      <span className="text-sm font-bold text-foreground font-mono tabular block mt-0.5">
                        {formatNumber(stats.status[st] || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Snapshot Info Footer */}
          <div className="px-4 py-3 border-t border-border bg-muted/20 text-[11px] text-muted-foreground space-y-1">
            <div className="flex items-center justify-between">
              <span>File Aktif:</span>
              <span className="font-mono text-foreground truncate max-w-[160px]">
                {activeSnapshot?.filename || '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Pengunggah:</span>
              <span className="text-foreground font-medium">{activeSnapshot?.uploader_name || 'Admin'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Slide-Over Customer Detail Sheet (Kumo Drawer Style) ── */}
      <Sheet open={Boolean(selectedDetail)} onOpenChange={(open) => !open && setSelectedDetail(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-card border-l border-border">
          {selectedDetail && (
            <>
              <SheetHeader className="px-5 py-4 border-b border-border bg-muted/25 space-y-1">
                <div className="flex items-center justify-between pr-6">
                  <span className="font-mono text-base font-bold text-foreground">
                    {selectedDetail.kode_pelanggan}
                  </span>
                  <span className="px-2 py-0.5 rounded-md font-mono text-xs font-semibold bg-muted border border-border text-foreground">
                    {selectedDetail.golongan}
                  </span>
                </div>
                <SheetTitle className="text-sm font-semibold text-foreground text-left">
                  {displayName(selectedDetail.nama_pelanggan, user?.role)}
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                {/* Anomaly Notice */}
                {selectedDetail.spatial_anomaly && (
                  <div className="p-3 rounded-md border border-red-500/25 bg-red-500/5 text-red-700 dark:text-red-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                      <span>Anomali Spasial Terdeteksi</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">{selectedDetail.spatial_anomaly}</p>
                  </div>
                )}

                {/* Co-location Anomaly Notice */}
                {selectedDetail.colocation_anomaly && (
                  <div className="p-3 rounded-md border border-purple-500/25 bg-purple-500/5 text-purple-700 dark:text-purple-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>Titik Koordinat Ganda (Multi-Wilayah)</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">{selectedDetail.colocation_anomaly}</p>
                  </div>
                )}

                {/* Flag reasons */}
                {!selectedDetail.spatial_anomaly && selectedDetail.is_flagged && (
                  <div className="p-3 rounded-md border border-amber-500/25 bg-amber-500/5 text-amber-800 dark:text-amber-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Perlu Verifikasi</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">{selectedDetail.flag_reasons.join(', ')}</p>
                  </div>
                )}

                {/* Detail Information Fields */}
                <div className="space-y-3 p-4 rounded-md bg-muted/30 border border-border">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-muted-foreground block font-semibold">Alamat</span>
                    <span className="text-xs text-foreground mt-0.5 block leading-relaxed font-medium">
                      {canSeePII(user?.role) ? selectedDetail.alamat : 'Tersensor (Hak Akses Terbatas)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-border">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-muted-foreground block font-semibold">Wilayah</span>
                      <span className="font-semibold text-foreground">{selectedDetail.nama_wilayah}</span>
                      <span className="text-[10px] font-mono text-muted-foreground block">{selectedDetail.kode_wilayah}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono text-muted-foreground block font-semibold">Kecamatan</span>
                      <span className="font-semibold text-foreground">{kecamatanName(selectedDetail.kode_kecamatan)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-border">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-muted-foreground block font-semibold">Status Sambungan</span>
                      <span className="font-semibold text-foreground">{selectedDetail.status_sambungan}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono text-muted-foreground block font-semibold">Nomor Meter</span>
                      <span className="font-mono text-foreground">{selectedDetail.nomor_meter || '-'}</span>
                    </div>
                  </div>

                  {canSeePII(user?.role) && (
                    <div className="pt-2.5 border-t border-border">
                      <span className="text-[10px] uppercase font-mono text-muted-foreground block font-semibold">Koordinat WGS84</span>
                      <span className="font-mono text-[11px] text-foreground">
                        {selectedDetail.latitude.toFixed(6)}, {selectedDetail.longitude.toFixed(6)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-border flex items-center gap-2 bg-muted/20">
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
                <Button
                  variant="outline"
                  onClick={() => setSelectedDetail(null)}
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
