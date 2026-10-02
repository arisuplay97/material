import React, { useState, useEffect, useMemo } from 'react';
import { pdamService, KECAMATAN_LIST, KecamatanInfo } from '@/services/pdamDataService';
import { Pelanggan, WilayahAcuan, UploadSnapshot, GolonganTarif, StatusSambungan } from '@/types/pdam';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Download,
  Filter,
  Search,
  MapPin,
  RotateCcw,
  BarChart3,
  PieChart as PieIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Map as MapIcon,
  ShieldCheck,
  Building2,
  Layers,
  Clock,
  Sparkles,
  ArrowRight,
  AlertOctagon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [allPelanggan, setAllPelanggan] = useState<Pelanggan[]>([]);
  const [wilayahList, setWilayahList] = useState<WilayahAcuan[]>([]);
  const [activeSnapshot, setActiveSnapshot] = useState<UploadSnapshot | undefined>();

  // Filter States
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>('07'); // Default: 07 Praya Barat
  const [selectedWilayah, setSelectedWilayah] = useState<string>('all');
  const [selectedGolongan, setSelectedGolongan] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedQuality, setSelectedQuality] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Tab switch for donut chart (Golongan vs Status)
  const [chartMetricTab, setChartMetricTab] = useState<'golongan' | 'status'>('golongan');

  // Table pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  // Load and subscribe to data
  useEffect(() => {
    const loadData = () => {
      setAllPelanggan(pdamService.getPelangganList());
      setWilayahList(pdamService.getWilayahList());
      setActiveSnapshot(pdamService.getActiveSnapshot());
    };

    loadData();
    const unsub = pdamService.subscribe(loadData);
    return unsub;
  }, []);

  // Filter data by Kecamatan first
  const kecamatanData = useMemo(() => {
    if (selectedKecamatan === 'all') return allPelanggan;
    return allPelanggan.filter((p) => p.kode_kecamatan === selectedKecamatan);
  }, [allPelanggan, selectedKecamatan]);

  // Spatial Anomaly count in current kecamatan
  const spatialAnomalyCount = useMemo(() => {
    return kecamatanData.filter((p) => Boolean(p.spatial_anomaly)).length;
  }, [kecamatanData]);

  // Wilayah color lookup map
  const wilayahColorMap = useMemo(() => {
    const map = new Map<string, string>();
    wilayahList.forEach((w) => map.set(w.kode, w.warna));
    return map;
  }, [wilayahList]);

  // Filtered data for table and charts
  const filteredData = useMemo(() => {
    return kecamatanData.filter((item) => {
      if (selectedWilayah !== 'all' && item.kode_wilayah !== selectedWilayah) {
        return false;
      }
      if (selectedGolongan !== 'all' && item.golongan !== selectedGolongan) {
        return false;
      }
      if (selectedStatus !== 'all' && item.status_sambungan !== selectedStatus) {
        return false;
      }
      if (selectedQuality === 'flagged' && !item.is_flagged) {
        return false;
      }
      if (selectedQuality === 'valid' && item.is_flagged) {
        return false;
      }
      if (selectedQuality === 'anomaly' && !item.spatial_anomaly) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchKode = item.kode_pelanggan.toLowerCase().includes(q);
        const matchNama = item.nama_pelanggan.toLowerCase().includes(q);
        const matchAlamat = item.alamat.toLowerCase().includes(q);
        const matchWilayah = item.nama_wilayah.toLowerCase().includes(q);
        if (!matchKode && !matchNama && !matchAlamat && !matchWilayah) {
          return false;
        }
      }
      return true;
    });
  }, [kecamatanData, selectedWilayah, selectedGolongan, selectedStatus, selectedQuality, searchQuery]);

  // Statistics calculation
  const totalCount = filteredData.length;
  const totalActive = filteredData.filter((p) => p.status_sambungan === 'Aktif').length;
  const totalNonactive = filteredData.filter((p) => p.status_sambungan === 'Nonaktif').length;
  const totalPutus = filteredData.filter((p) => p.status_sambungan === 'Putus').length;

  const totalFlagged = filteredData.filter((p) => p.is_flagged).length;
  const totalValid = totalCount - totalFlagged;
  const validityPercentage = totalCount > 0 ? ((totalValid / totalCount) * 100).toFixed(1) : '100';
  const activePercentage = totalCount > 0 ? ((totalActive / totalCount) * 100).toFixed(1) : '0';

  // Golongan breakdown
  const golonganCounts = useMemo(() => {
    const counts: Record<string, number> = { R1: 0, R2: 0, B1: 0, S: 0, I: 0 };
    filteredData.forEach((p) => {
      if (counts[p.golongan] !== undefined) {
        counts[p.golongan]++;
      }
    });
    return counts;
  }, [filteredData]);

  // Chart data: Distribution per Wilayah
  const wilayahChartData = useMemo(() => {
    const map = new Map<string, { kode: string; nama: string; jumlah: number; warna: string }>();

    wilayahList.forEach((w) => {
      if (selectedWilayah === 'all' || selectedWilayah === w.kode) {
        map.set(w.kode, {
          kode: w.kode,
          nama: w.nama,
          jumlah: 0,
          warna: w.warna,
        });
      }
    });

    filteredData.forEach((p) => {
      const entry = map.get(p.kode_wilayah);
      if (entry) {
        entry.jumlah++;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.jumlah - a.jumlah);
  }, [wilayahList, filteredData, selectedWilayah]);

  // Chart data: Golongan Donut Chart
  const golonganChartData = useMemo(() => {
    const colors: Record<string, string> = {
      R1: '#3B82F6',
      R2: '#06B6D4',
      B1: '#F59E0B',
      S: '#10B981',
      I: '#8B5CF6',
    };

    return Object.entries(golonganCounts).map(([key, val]) => ({
      name: `Golongan ${key}`,
      code: key,
      value: val,
      color: colors[key] || '#94A3B8',
    }));
  }, [golonganCounts]);

  // Chart data: Status Sambungan Donut Chart
  const statusChartData = useMemo(() => {
    return [
      { name: 'Aktif', code: 'Aktif', value: totalActive, color: '#10B981' },
      { name: 'Nonaktif', code: 'Nonaktif', value: totalNonactive, color: '#F59E0B' },
      { name: 'Putus', code: 'Putus', value: totalPutus, color: '#EF4444' },
    ];
  }, [totalActive, totalNonactive, totalPutus]);

  // Pagination slice
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedPelanggan = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Reset filter
  const handleResetFilter = () => {
    setSelectedWilayah('all');
    setSelectedGolongan('all');
    setSelectedStatus('all');
    setSelectedQuality('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Export handler
  const handleExport = () => {
    const currentKecInfo = KECAMATAN_LIST.find((k) => k.kode === selectedKecamatan);
    const prefix = currentKecInfo ? `Data_Pelanggan_${currentKecInfo.nama.replace(/\s+/g, '_')}` : 'Data_Pelanggan_Filtered';
    pdamService.exportPelanggan(filteredData, prefix);
  };

  // Navigate to GIS with selected customer ID
  const handleViewOnMap = (kodePelanggan: string) => {
    setLocation(`/gis?search=${kodePelanggan}`);
  };

  // Masking personal info for Pimpinan role
  const isPimpinan = user?.role === 'pimpinan';
  const maskName = (name: string) => {
    if (!isPimpinan) return name;
    const parts = name.split(' ');
    return parts[0] + ' ' + '*'.repeat(Math.max(4, parts.slice(1).join(' ').length));
  };

  const selectedKecamatanObj = KECAMATAN_LIST.find((k) => k.kode === selectedKecamatan);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Breadcrumb & Top Bar (BoardUI Style) ── */}
      <div className="flex flex-col gap-4 border-b border-border/80 pb-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
          <span>PDAM Tirta Ardhia Rinjani</span>
          <span>/</span>
          <span>Data Pelanggan</span>
          <span>/</span>
          <span className="text-foreground font-semibold">Dashboard Ringkasan</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
              Dashboard Pelanggan
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Monitoring data sambungan, status verifikasi, dan sebaran wilayah se-Lombok Tengah.
            </p>
          </div>

          {/* Top Controls: Kecamatan Selector + Snapshot + Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Kecamatan Selector (PRD 13 Kecamatan Requirement) */}
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-2.5 py-1.5 shadow-xs">
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <Select
                value={selectedKecamatan}
                onValueChange={(val) => {
                  setSelectedKecamatan(val);
                  setSelectedWilayah('all');
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-7 border-0 bg-transparent text-xs font-semibold focus:ring-0 p-0 pr-1 w-[180px]">
                  <SelectValue placeholder="Pilih Kecamatan" />
                </SelectTrigger>
                <SelectContent className="max-h-80 border-border bg-card">
                  <SelectItem value="all" className="text-xs font-medium">
                    Semua Kecamatan (13)
                  </SelectItem>
                  {KECAMATAN_LIST.map((kec) => (
                    <SelectItem key={kec.kode} value={kec.kode} className="text-xs">
                      <span className="font-mono font-bold mr-1.5">{kec.kode}</span>
                      <span>{kec.nama}</span>
                      {kec.kode === '07' && (
                        <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                          Pilot (642)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Snapshot Indicator Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/60 border border-border text-xs">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">Snapshot:</span>
              <span className="font-mono font-medium text-foreground text-[11px]">
                {activeSnapshot
                  ? new Date(activeSnapshot.uploaded_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '1 Okt 2026'}
              </span>
            </div>

            {/* GIS Map Link */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation('/gis')}
              className="h-9 px-3 rounded-xl border-border gap-1.5 text-xs font-medium bg-card hover:bg-muted text-foreground shadow-xs"
            >
              <MapIcon className="w-3.5 h-3.5 text-primary" />
              <span>Buka Peta GIS</span>
            </Button>

            {/* Export Excel Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filteredData.length === 0}
              className="h-9 px-3 rounded-xl border-border gap-1.5 text-xs font-medium bg-card hover:bg-muted text-foreground shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Excel</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Empty State Notice if Selected Kecamatan has 0 Data ── */}
      {selectedKecamatan !== 'all' && selectedKecamatan !== '07' && (
        <Card className="rounded-2xl border border-dashed border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-6 text-center">
          <div className="flex flex-col items-center max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Data Kecamatan {selectedKecamatanObj?.nama || selectedKecamatan} Belum Tersedia
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Kecamatan ini telah terdaftar dalam sistem (13 Kecamatan se-Lombok Tengah). Tahap implementasi pilot saat ini aktif pada{' '}
                <strong>Kecamatan 07 Praya Barat</strong> dengan 20 wilayah acuan dan 642 pelanggan.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setSelectedKecamatan('07')}
              className="rounded-xl text-xs gap-1.5 shadow-xs"
            >
              <span>Beralih ke Kecamatan 07 Praya Barat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>
      )}

      {/* ── BoardUI Stat Cards Grid (Solid, High-Contrast, No Transparent Hover) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Pelanggan */}
        <Card className="card-solid rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Pelanggan</span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center shadow-xs">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground font-mono">
              {totalCount.toLocaleString('id-ID')}
            </span>
            <span className="text-xs text-muted-foreground">Pelanggan</span>
          </div>
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Cakupan Wilayah:</span>
            <span className="font-semibold text-foreground">
              {selectedKecamatan === '07' ? '20 Wilayah (07)' : selectedKecamatan === 'all' ? '13 Kecamatan' : '0 Wilayah Aktif'}
            </span>
          </div>
        </Card>

        {/* Card 2: Sambungan Aktif */}
        <Card className="card-solid rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Sambungan Aktif</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground font-mono">
              {totalActive.toLocaleString('id-ID')}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              {activePercentage}%
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Nonaktif / Putus:</span>
            <span className="font-semibold text-foreground font-mono">
              {totalNonactive} / {totalPutus}
            </span>
          </div>
        </Card>

        {/* Card 3: Integritas Validasi */}
        <Card className="card-solid rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Integritas Validasi (D-4)</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground font-mono">
              {validityPercentage}%
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              Target ≥95%
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Data Lolos Bersih:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
              {totalValid.toLocaleString('id-ID')} data
            </span>
          </div>
        </Card>

        {/* Card 4: Data Bertanda & Anomali */}
        <Card className="card-solid rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Data Bertanda & Anomali</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
              {totalFlagged.toLocaleString('id-ID')}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              Perlu Survei
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Anomali Batas:</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">
              {spatialAnomalyCount} titik
            </span>
          </div>
        </Card>
      </div>

      {/* ── Spatial Anomaly Warning Alert Banner (BoardUI Style) ── */}
      {spatialAnomalyCount > 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-foreground">
                  Terdeteksi {spatialAnomalyCount} Pelanggan dengan Koordinat di Luar Wilayah Kecamatan
                </h4>
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                  Anomali Spasial
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Terdapat data pelanggan dengan kode Kecamatan Praya Barat (07), namun titik koordinat GPS terdeteksi berada di kecamatan tetangga (Jonggat/Praya).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedQuality('anomaly');
                setCurrentPage(1);
              }}
              className="h-8 px-3 rounded-xl border-amber-300 dark:border-amber-800 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200"
            >
              Filter Data Ini
            </Button>
            <Button
              size="sm"
              onClick={() => setLocation('/gis')}
              className="h-8 px-3 rounded-xl text-xs gap-1 shadow-xs"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Tinjau di GIS</span>
            </Button>
          </div>
        </div>
      )}

      {/* ── Charts Grid (BoardUI Aesthetic) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart: Sebaran per Wilayah (2/3 width) */}
        <Card className="card-solid lg:col-span-2 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h3 className="text-sm sm:text-base font-semibold text-foreground font-heading">
                  Sebaran Pelanggan per Wilayah (D-2)
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Warna bar sinkron dengan warna titik di peta GIS (PRD ID: D-8).
              </p>
            </div>
            <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-muted text-xs font-mono font-medium text-muted-foreground">
              {wilayahChartData.length} Wilayah
            </div>
          </div>

          <div className="pt-6 h-72 w-full">
            {wilayahChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-mono">
                Tidak ada data wilayah untuk filter saat ini.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wilayahChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <XAxis
                    dataKey="nama"
                    stroke="currentColor"
                    className="text-[10px] text-muted-foreground font-mono"
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    height={60}
                    tick={{ fill: 'currentColor', fontSize: 10 }}
                  />
                  <YAxis
                    stroke="currentColor"
                    className="text-[10px] text-muted-foreground font-mono"
                    tick={{ fill: 'currentColor', fontSize: 10 }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: 'var(--card-foreground)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    }}
                    formatter={(value: any, name: any, item: any) => [
                      `${value} Pelanggan`,
                      `${item.payload.kode} - ${item.payload.nama}`,
                    ]}
                  />
                  <Bar dataKey="jumlah" radius={[4, 4, 0, 0]}>
                    {wilayahChartData.map((entry) => (
                      <Cell key={entry.kode} fill={entry.warna} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Donut Chart: Komposisi Golongan / Status (1/3 width) */}
        <Card className="card-solid rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-primary" />
                <h3 className="text-sm sm:text-base font-semibold text-foreground font-heading">
                  Komposisi Data (D-3)
                </h3>
              </div>
              {/* BoardUI Tab Pill Switcher */}
              <div className="flex items-center bg-muted/80 p-0.5 rounded-lg border border-border/60">
                <button
                  onClick={() => setChartMetricTab('golongan')}
                  className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all ${
                    chartMetricTab === 'golongan'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Tarif
                </button>
                <button
                  onClick={() => setChartMetricTab('status')}
                  className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all ${
                    chartMetricTab === 'status'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Status
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              {chartMetricTab === 'golongan'
                ? 'Distribusi kategori tarif R1, R2, B1, S, dan I.'
                : 'Proporsi sambungan Aktif, Nonaktif, dan Putus.'}
            </p>

            <div className="h-44 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartMetricTab === 'golongan' ? golonganChartData : statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {(chartMetricTab === 'golongan' ? golonganChartData : statusChartData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: 'var(--card-foreground)',
                    }}
                    formatter={(val: any) => [`${val} Pelanggan`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Breakdown List */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/60">
            {(chartMetricTab === 'golongan' ? golonganChartData : statusChartData).map((item) => (
              <div key={item.code} className="flex items-center justify-between text-xs p-2 rounded-xl bg-muted/40">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="font-mono font-medium truncate text-foreground">{item.code}</span>
                </div>
                <span className="font-mono font-bold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Table Section (BoardUI Style) ── */}
      <Card className="card-solid rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        {/* Table Header & Toolbar */}
        <div className="p-4 sm:p-5 border-b border-border/60 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-semibold text-foreground font-heading">
                Tabel Data Pelanggan
              </h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                {filteredData.length} Pelanggan
              </span>
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              Halaman {currentPage} dari {totalPages}
            </div>
          </div>

          {/* Filters Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* Search Input */}
            <div className="lg:col-span-2 relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari kode 9 digit, nama, alamat..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8.5 h-9 text-xs rounded-xl border-border bg-background"
              />
            </div>

            {/* Filter Wilayah */}
            <div>
              <Select
                value={selectedWilayah}
                onValueChange={(val) => {
                  setSelectedWilayah(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl border-border bg-background">
                  <SelectValue placeholder="Semua Wilayah" />
                </SelectTrigger>
                <SelectContent className="max-h-64 border-border bg-card">
                  <SelectItem value="all">Semua Wilayah ({wilayahList.length})</SelectItem>
                  {wilayahList.map((w) => (
                    <SelectItem key={w.kode} value={w.kode}>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: w.warna }} />
                        <span>{w.kode} - {w.nama}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter Golongan */}
            <div>
              <Select
                value={selectedGolongan}
                onValueChange={(val) => {
                  setSelectedGolongan(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl border-border bg-background">
                  <SelectValue placeholder="Semua Golongan" />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  <SelectItem value="all">Semua Golongan</SelectItem>
                  <SelectItem value="R1">R1 - Rumah Tangga 1</SelectItem>
                  <SelectItem value="R2">R2 - Rumah Tangga 2</SelectItem>
                  <SelectItem value="B1">B1 - Niaga / Bisnis</SelectItem>
                  <SelectItem value="S">S - Sosial</SelectItem>
                  <SelectItem value="I">I - Instansi Pemerintah</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter Status */}
            <div>
              <Select
                value={selectedStatus}
                onValueChange={(val) => {
                  setSelectedStatus(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl border-border bg-background">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="Aktif">Aktif</SelectItem>
                  <SelectItem value="Nonaktif">Nonaktif</SelectItem>
                  <SelectItem value="Putus">Putus</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter Kualitas & Reset */}
            <div className="flex items-center gap-1.5">
              <Select
                value={selectedQuality}
                onValueChange={(val) => {
                  setSelectedQuality(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl border-border bg-background flex-1">
                  <SelectValue placeholder="Kualitas Data" />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  <SelectItem value="all">Semua Data</SelectItem>
                  <SelectItem value="valid">Data Valid</SelectItem>
                  <SelectItem value="flagged">Data Bertanda</SelectItem>
                  <SelectItem value="anomaly">Anomali Batas Wilayah</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilter}
                className="h-9 w-9 p-0 rounded-xl hover:bg-muted text-muted-foreground shrink-0 border-border"
                title="Reset Semua Filter"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* BoardUI Styled Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4 font-semibold">Kode (9 Digit)</th>
                <th className="py-3.5 px-4 font-semibold">Nama Pelanggan</th>
                <th className="py-3.5 px-4 font-semibold">Wilayah</th>
                <th className="py-3.5 px-4 font-semibold">Golongan</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Koordinat (WGS84)</th>
                <th className="py-3.5 px-4 font-semibold">Kualitas Data</th>
                <th className="py-3.5 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedPelanggan.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground text-xs font-mono">
                    Tidak ada data pelanggan yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                paginatedPelanggan.map((item) => {
                  const wilayahColor = wilayahColorMap.get(item.kode_wilayah) || '#94A3B8';
                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        {item.kode_pelanggan}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        {maskName(item.nama_pelanggan)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: wilayahColor }}
                          />
                          <span className="font-mono text-xs">{item.kode_wilayah}</span>
                          <span className="text-muted-foreground text-[11px] truncate max-w-[120px]">
                            {item.nama_wilayah}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="font-mono text-[10px] py-0 px-2 border-border bg-background">
                          {item.golongan}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium font-mono ${
                            item.status_sambungan === 'Aktif'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40'
                              : item.status_sambungan === 'Nonaktif'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40'
                          }`}
                        >
                          {item.status_sambungan}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                        {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                      </td>
                      <td className="py-3.5 px-4">
                        {item.spatial_anomaly ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60"
                            title={item.spatial_anomaly}
                          >
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Anomali Batas
                          </span>
                        ) : item.is_flagged ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60"
                            title={item.flag_reasons.join(', ')}
                          >
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Bertanda
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60">
                            Valid
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewOnMap(item.kode_pelanggan)}
                          className="h-7 px-2.5 text-[11px] rounded-lg gap-1 border-border bg-card hover:bg-muted text-foreground shadow-xs"
                          title="Tampilkan titik di Peta GIS"
                        >
                          <MapPin className="w-3 h-3 text-primary" />
                          <span>Peta</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* BoardUI Pagination Footer */}
        <div className="p-3 sm:p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>
            Menampilkan {Math.min(filteredData.length, (currentPage - 1) * pageSize + 1)} -{' '}
            {Math.min(filteredData.length, currentPage * pageSize)} dari {filteredData.length} total
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-2.5 rounded-lg border-border bg-card hover:bg-muted"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="px-2 font-bold text-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="h-8 px-2.5 rounded-lg border-border bg-card hover:bg-muted"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
