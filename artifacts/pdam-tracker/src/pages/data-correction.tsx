import React, { useState, useMemo, useCallback } from 'react';
import { usePdamData } from '@/hooks/usePdamData';
import { useAuth } from '@/contexts/AuthContext';
import { Pelanggan, WilayahAcuan } from '@/types/pdam';
import {
  pdamService,
  kecamatanName,
  KECAMATAN_LIST,
  KECAMATAN_BOUNDS,
  boundsCenter,
} from '@/services/pdamDataService';
import {
  generateOutlierPdfReport,
  PelangganOutlierItem,
} from '@/services/pdfReportService';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  SearchCheck,
  AlertTriangle,
  MapPin,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Filter,
  Info,
  Crosshair,
  CheckCircle2,
  Ruler,
  BarChart3,
  Eye,
  Map as MapIcon,
  FileText,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

// ── Haversine distance formula (returns distance in meters) ──
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('id-ID');
}

type SortField = 'distance' | 'kode' | 'nama' | 'wilayah';
type SortDir = 'asc' | 'desc';

export default function DataCorrection() {
  const { user } = useAuth();
  const { pelanggan, wilayah } = usePdamData();

  // ── Filter State ──
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>('all');
  const [selectedWilayah, setSelectedWilayah] = useState<string>('all');
  const [distanceThreshold, setDistanceThreshold] = useState<number>(500); // meters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('distance');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showOnlyEstimated, setShowOnlyEstimated] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // ── Build wilayah map for fast lookup ──
  const wilayahMap = useMemo(() => {
    const map = new Map<string, WilayahAcuan>();
    for (const w of wilayah) map.set(w.kode, w);
    return map;
  }, [wilayah]);

  // ── Compute distance for every customer ──
  const enrichedData = useMemo(() => {
    const result: PelangganOutlierItem[] = [];
    for (const p of pelanggan) {
      if (
        !Number.isFinite(p.latitude) ||
        !Number.isFinite(p.longitude) ||
        (p.latitude === 0 && p.longitude === 0)
      ) {
        continue; // Skip completely invalid coordinates
      }

      const wRef = wilayahMap.get(p.kode_wilayah);
      let distanceToCenter = 0;
      let wilayahCenter: { lat: number; lng: number } | null = null;
      let wilayahNamaAcuan = p.nama_wilayah || `Wilayah ${p.kode_wilayah}`;

      if (wRef && Number.isFinite(wRef.centerLat) && Number.isFinite(wRef.centerLng)) {
        wilayahCenter = { lat: wRef.centerLat, lng: wRef.centerLng };
        wilayahNamaAcuan = wRef.nama;
        distanceToCenter = haversineDistance(
          p.latitude,
          p.longitude,
          wRef.centerLat,
          wRef.centerLng,
        );
      } else if (p.kode_kecamatan && KECAMATAN_BOUNDS[p.kode_kecamatan]) {
        // Fallback to kecamatan centroid if dekadi is not registered
        const [cLat, cLng] = boundsCenter(KECAMATAN_BOUNDS[p.kode_kecamatan]);
        wilayahCenter = { lat: cLat, lng: cLng };
        wilayahNamaAcuan = `Kec. ${kecamatanName(p.kode_kecamatan)} (Estimasi Pusat)`;
        distanceToCenter = haversineDistance(p.latitude, p.longitude, cLat, cLng);
      }

      result.push({
        ...p,
        distanceToCenter,
        wilayahCenter,
        wilayahNamaAcuan,
      });
    }
    return result;
  }, [pelanggan, wilayahMap]);

  // ── Scoped data based on selected kecamatan and wilayah ──
  const scopedData = useMemo(() => {
    let list = enrichedData;
    if (selectedKecamatan !== 'all') {
      list = list.filter((p) => p.kode_kecamatan === selectedKecamatan);
    }
    if (selectedWilayah !== 'all') {
      list = list.filter((p) => p.kode_wilayah === selectedWilayah);
    }
    return list;
  }, [enrichedData, selectedKecamatan, selectedWilayah]);

  // ── Wilayah list filtered by selected kecamatan ──
  const filteredWilayahOptions = useMemo(() => {
    if (selectedKecamatan === 'all') return wilayah;
    return wilayah.filter((w) => w.kodeKecamatan === selectedKecamatan);
  }, [wilayah, selectedKecamatan]);

  // ── Apply filters and sort ──
  const outliers = useMemo(() => {
    let filtered = scopedData;

    if (showOnlyEstimated) {
      // If user checks "Hanya koordinat estimasi", show records with fallback flag (distance around 0)
      filtered = filtered.filter((p) =>
        (p.flag_reasons || []).some(
          (r) =>
            r.toLowerCase().includes('belum ada titik gps') ||
            r.toLowerCase().includes('estimasi'),
        ),
      );
    } else {
      // Normal outlier mode: distance to center >= threshold
      filtered = filtered.filter((p) => p.distanceToCenter >= distanceThreshold);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.kode_pelanggan.toLowerCase().includes(q) ||
          p.nama_pelanggan.toLowerCase().includes(q) ||
          p.alamat.toLowerCase().includes(q) ||
          p.nama_wilayah.toLowerCase().includes(q) ||
          p.wilayahNamaAcuan.toLowerCase().includes(q),
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'distance':
          cmp = a.distanceToCenter - b.distanceToCenter;
          break;
        case 'kode':
          cmp = a.kode_pelanggan.localeCompare(b.kode_pelanggan);
          break;
        case 'nama':
          cmp = a.nama_pelanggan.localeCompare(b.nama_pelanggan);
          break;
        case 'wilayah':
          cmp = a.kode_wilayah.localeCompare(b.kode_wilayah);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [
    scopedData,
    distanceThreshold,
    searchQuery,
    sortField,
    sortDir,
    showOnlyEstimated,
  ]);

  // ── Statistics (scoped to current selection) ──
  const stats = useMemo(() => {
    const totalWithCoords = scopedData.length;
    const totalOutliers = scopedData.filter((p) => p.distanceToCenter >= distanceThreshold).length;
    const totalEstimated = scopedData.filter((p) =>
      (p.flag_reasons || []).some(
        (r) =>
          r.toLowerCase().includes('belum ada titik gps') ||
          r.toLowerCase().includes('estimasi'),
      ),
    ).length;

    // Per-wilayah breakdown of outliers
    const perWilayah = new Map<
      string,
      { count: number; avgDist: number; totalDist: number; nama: string }
    >();

    for (const p of outliers) {
      const entry = perWilayah.get(p.kode_wilayah) || {
        count: 0,
        avgDist: 0,
        totalDist: 0,
        nama: p.wilayahNamaAcuan,
      };
      entry.count++;
      entry.totalDist += p.distanceToCenter;
      entry.avgDist = entry.totalDist / entry.count;
      perWilayah.set(p.kode_wilayah, entry);
    }

    // Distance buckets
    const buckets = {
      near: scopedData.filter((p) => p.distanceToCenter < 200).length,
      medium: scopedData.filter(
        (p) => p.distanceToCenter >= 200 && p.distanceToCenter < 500,
      ).length,
      far: scopedData.filter(
        (p) => p.distanceToCenter >= 500 && p.distanceToCenter < 1000,
      ).length,
      veryFar: scopedData.filter(
        (p) => p.distanceToCenter >= 1000 && p.distanceToCenter < 2000,
      ).length,
      extreme: scopedData.filter((p) => p.distanceToCenter >= 2000).length,
    };

    return { totalWithCoords, totalOutliers, totalEstimated, perWilayah, buckets };
  }, [scopedData, outliers, distanceThreshold]);

  // ── Sort toggle ──
  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDir(field === 'distance' ? 'desc' : 'asc');
      }
    },
    [sortField],
  );

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3 text-primary" />
    ) : (
      <ChevronDown className="w-3 h-3 text-primary" />
    );
  };

  // ── Export to Excel (.xlsx) ──
  const handleExportExcel = useCallback(async () => {
    if (outliers.length === 0) {
      toast.error('Tidak ada data anomali untuk diekspor.');
      return;
    }
    try {
      const XLSX = await import('xlsx');
      const rows = outliers.map((p, idx) => ({
        No: idx + 1,
        Kode_Pelanggan: p.kode_pelanggan,
        Nama_Pelanggan: p.nama_pelanggan,
        Alamat: p.alamat,
        Kode_Wilayah: p.kode_wilayah,
        Nama_Wilayah: p.wilayahNamaAcuan,
        Kecamatan: kecamatanName(p.kode_kecamatan),
        Latitude: p.latitude,
        Longitude: p.longitude,
        Lat_Pusat_Dekadi: p.wilayahCenter?.lat ?? '',
        Lng_Pusat_Dekadi: p.wilayahCenter?.lng ?? '',
        Jarak_Meter: Math.round(p.distanceToCenter),
        Jarak_Km: (p.distanceToCenter / 1000).toFixed(3),
        Status: p.status_sambungan,
        Golongan: p.golongan,
        Anomali_Spasial: p.spatial_anomaly ?? '',
        Catatan_Flag: (p.flag_reasons || []).join('; '),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Koreksi Data');

      // Auto column widths
      const colWidths = Object.keys(rows[0] || {}).map((key) => ({
        wch: Math.max(key.length, 14),
      }));
      ws['!cols'] = colWidths;

      const filename = `Koreksi_Data_PDAM_${selectedKecamatan === 'all' ? 'Semua' : `Kec_${selectedKecamatan}`}_Jarak_${distanceThreshold}m_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success(`Berhasil mengunduh Excel berisi ${formatNumber(outliers.length)} data.`);
    } catch (e: any) {
      toast.error(e.message || 'Gagal mengekspor file Excel.');
    }
  }, [outliers, selectedKecamatan, distanceThreshold]);

  // ── Export to PDF Resmi ──
  const handleExportPdf = useCallback(() => {
    if (outliers.length === 0) {
      toast.error('Tidak ada data anomali untuk diekspor ke PDF.');
      return;
    }

    try {
      setIsExportingPdf(true);
      toast.info('Menyiapkan dokumen Laporan Audit Spasial PDF resmi...');

      setTimeout(() => {
        try {
          generateOutlierPdfReport({
            outliers,
            totalPelangganScoped: scopedData.length,
            selectedKecamatan,
            selectedWilayah,
            distanceThreshold,
            auditorName: user?.name || 'Petugas GIS PDAM',
            auditorRole: user?.role === 'admin' ? 'Administrator IT & GIS' : 'Petugas Verifikasi',
            wilayahList: wilayah,
          });
          toast.success(`Laporan PDF resmi (${formatNumber(outliers.length)} data) berhasil diunduh!`);
        } catch (err: any) {
          toast.error(err.message || 'Gagal membuat dokumen PDF.');
        } finally {
          setIsExportingPdf(false);
        }
      }, 100);
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengekspor PDF.');
      setIsExportingPdf(false);
    }
  }, [
    outliers,
    scopedData,
    selectedKecamatan,
    selectedWilayah,
    distanceThreshold,
    user,
    wilayah,
  ]);

  // ── Distance severity styling ──
  const distanceSeverity = (meters: number) => {
    if (meters < 200) return 'good';
    if (meters < 500) return 'ok';
    if (meters < 1000) return 'warning';
    if (meters < 2000) return 'bad';
    return 'critical';
  };

  const severityColor = (sev: string) => {
    switch (sev) {
      case 'good':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-900';
      case 'ok':
        return 'text-sky-600 bg-sky-50 border-sky-200 dark:text-sky-400 dark:bg-sky-950/40 dark:border-sky-900';
      case 'warning':
        return 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-900';
      case 'bad':
        return 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950/40 dark:border-orange-900';
      case 'critical':
        return 'text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/40 dark:border-rose-900';
      default:
        return '';
    }
  };

  const severityLabel = (sev: string) => {
    switch (sev) {
      case 'good':
        return 'Dekat (<200m)';
      case 'ok':
        return 'Wajar (200-500m)';
      case 'warning':
        return 'Agak Jauh (0.5-1km)';
      case 'bad':
        return 'Jauh (1-2km)';
      case 'critical':
        return 'Sangat Jauh (>2km)';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50/60 dark:bg-neutral-950 px-4 sm:px-6 md:px-8 py-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
              Koreksi Data Lokasi
            </h1>
            <Badge
              variant="outline"
              className="font-mono text-xs text-primary border-primary/30 bg-primary/5"
            >
              Audit Jarak Spasial
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Deteksi otomatis pelanggan yang letak koordinat GPS-nya tidak dekat dengan titik pusat dekade/wilayahnya.
            Bantu tim lapangan menemukan pelanggan yang salah kode dekadi atau koordinatnya salah survey.
          </p>
        </div>

        {/* Action Buttons: PDF & Excel */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          <Button
            variant="default"
            size="sm"
            onClick={handleExportPdf}
            disabled={outliers.length === 0 || isExportingPdf}
            className="h-9 px-3.5 rounded-xl gap-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer transition-all"
          >
            {isExportingPdf ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            <span>Cetak / Ekspor PDF ({formatNumber(outliers.length)})</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={outliers.length === 0}
            className="h-9 px-3 rounded-xl border-border gap-2 text-xs font-medium hover:bg-muted cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Ekspor Excel (.xlsx)</span>
          </Button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="rounded-2xl border border-border bg-card shadow-sm">
          <CardContent className="p-4 text-center">
            <span className="text-[10px] font-mono uppercase text-muted-foreground block">
              Pelanggan Teranalisis
            </span>
            <span className="text-2xl font-mono font-bold text-foreground">
              {formatNumber(stats.totalWithCoords)}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              {selectedKecamatan === 'all' ? 'Seluruh Kabupaten' : `Kec. ${selectedKecamatan}`}
            </span>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border bg-card shadow-sm">
          <CardContent className="p-4 text-center">
            <span className="text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400 block">
              Outlier (≥{formatDistance(distanceThreshold)})
            </span>
            <span className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400">
              {formatNumber(stats.totalOutliers)}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              {stats.totalWithCoords
                ? `${((stats.totalOutliers / stats.totalWithCoords) * 100).toFixed(1)}% dari data`
                : '0%'}
            </span>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border bg-card shadow-sm">
          <CardContent className="p-4 text-center">
            <span className="text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400 block">
              {'< 200m (Sangat Dekat)'}
            </span>
            <span className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {formatNumber(stats.buckets.near)}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Posisi sangat akurat</span>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border bg-card shadow-sm">
          <CardContent className="p-4 text-center">
            <span className="text-[10px] font-mono uppercase text-orange-600 dark:text-orange-400 block">
              1–2 km (Jauh)
            </span>
            <span className="text-2xl font-mono font-bold text-orange-600 dark:text-orange-400">
              {formatNumber(stats.buckets.veryFar)}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Perlu verifikasi</span>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border bg-card shadow-sm">
          <CardContent className="p-4 text-center">
            <span className="text-[10px] font-mono uppercase text-rose-600 dark:text-rose-400 block">
              {'> 2 km (Kritis)'}
            </span>
            <span className="text-2xl font-mono font-bold text-rose-600 dark:text-rose-400">
              {formatNumber(stats.buckets.extreme)}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Prioritas mutasi kode</span>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ── Left Panel: Filters & Thresholds ── */}
        <Card className="rounded-2xl border border-border bg-card shadow-sm lg:col-span-1">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base font-heading font-semibold text-foreground flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              Filter & Ambang Batas
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Sesuaikan radius toleransi jarak antar titik
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-5">
            {/* Distance Threshold Slider */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-primary" />
                  Batas Toleransi Jarak
                </Label>
                <span className="font-mono text-xs font-bold text-foreground px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                  {formatDistance(distanceThreshold)}
                </span>
              </div>
              <Slider
                value={[distanceThreshold]}
                onValueChange={([v]) => setDistanceThreshold(v)}
                min={50}
                max={5000}
                step={50}
                className="py-1"
              />
              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-1 pt-1">
                {[200, 500, 1000, 2000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDistanceThreshold(preset)}
                    className={`text-[10px] py-1 px-1.5 rounded-lg border text-center transition-colors font-mono cursor-pointer ${
                      distanceThreshold === preset
                        ? 'bg-primary text-primary-foreground border-primary font-bold'
                        : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    {formatDistance(preset)}
                  </button>
                ))}
              </div>
              <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                Menyaring pelanggan yang letaknya <strong>≥ {formatDistance(distanceThreshold)}</strong> dari pusat dekadinya.
              </p>
            </div>

            {/* Kecamatan Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Kecamatan</Label>
              <Select
                value={selectedKecamatan}
                onValueChange={(v) => {
                  setSelectedKecamatan(v);
                  setSelectedWilayah('all');
                }}
              >
                <SelectTrigger className="h-9 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kecamatan</SelectItem>
                  {KECAMATAN_LIST.map((k) => (
                    <SelectItem key={k.kode} value={k.kode}>
                      {k.kode} — {k.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Wilayah Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Wilayah / Dekadi</Label>
              <Select value={selectedWilayah} onValueChange={setSelectedWilayah}>
                <SelectTrigger className="h-9 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Wilayah</SelectItem>
                  {filteredWilayahOptions.map((w) => (
                    <SelectItem key={w.kode} value={w.kode}>
                      {w.kode} — {w.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Cari Nama / ID</Label>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kode pelanggan, nama, alamat..."
                className="h-9 rounded-xl text-xs"
              />
            </div>

            {/* Show Only Estimated Toggle */}
            <div className="flex items-start gap-2 pt-1 border-t border-border/50">
              <input
                type="checkbox"
                id="show-estimated"
                checked={showOnlyEstimated}
                onChange={(e) => setShowOnlyEstimated(e.target.checked)}
                className="rounded border-border h-4 w-4 mt-0.5 accent-primary cursor-pointer"
              />
              <label htmlFor="show-estimated" className="text-xs text-muted-foreground cursor-pointer leading-tight">
                <span className="font-medium text-foreground block">Hanya Koordinat Estimasi</span>
                Pelanggan tanpa survei GPS (memakai titik pusat dekadi)
              </label>
            </div>

            {/* Per-Wilayah Breakdown */}
            {stats.perWilayah.size > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <p className="text-[10px] font-mono uppercase text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" />
                    Top Wilayah Anomali
                  </span>
                  <span className="text-[9px]">Outlier</span>
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {Array.from(stats.perWilayah.entries())
                    .sort(([, a], [, b]) => b.count - a.count)
                    .slice(0, 10)
                    .map(([kode, info]) => (
                      <button
                        key={kode}
                        type="button"
                        onClick={() => {
                          setSelectedKecamatan(kode.slice(0, 2));
                          setSelectedWilayah(kode);
                        }}
                        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/60 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                            {kode}
                          </span>
                          <span className="text-[11px] text-foreground truncate">{info.nama}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge
                            variant="outline"
                            className="font-mono text-[9px] py-0 px-1.5 bg-amber-500/10 text-amber-600 border-amber-200"
                          >
                            {info.count}
                          </Badge>
                          <span className="text-[9px] text-muted-foreground">
                            ~{formatDistance(info.avgDist)}
                          </span>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Right Panel: Results Table ── */}
        <Card className="rounded-2xl border border-border bg-card shadow-sm lg:col-span-3">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-base font-heading font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Daftar Pelanggan Mencurigakan
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] py-0 px-1.5 bg-amber-500/10 text-amber-600 border-amber-200 ml-1"
                >
                  {formatNumber(outliers.length)} data
                </Badge>
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Menampilkan pelanggan dengan jarak ≥{' '}
                <strong className="text-foreground">{formatDistance(distanceThreshold)}</strong> dari titik pusat dekadi
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {outliers.length === 0 ? (
              <div className="py-20 text-center space-y-3 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 opacity-60" />
                <p className="text-sm font-medium text-foreground">Tidak Ada Anomali Ditemukan</p>
                <p className="text-xs max-w-md mx-auto">
                  {scopedData.length === 0
                    ? 'Belum ada data pelanggan ber-koordinat pada filter wilayah ini.'
                    : `Semua pelanggan pada wilayah ini berada dalam radius toleransi ${formatDistance(distanceThreshold)} dari titik pusat dekadi.`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-[10px] font-mono text-muted-foreground uppercase">
                      <th className="py-2.5 px-3 w-10">#</th>
                      <th
                        className="py-2.5 px-3 cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => toggleSort('kode')}
                      >
                        <span className="flex items-center gap-1">
                          Kode Pelanggan <SortIcon field="kode" />
                        </span>
                      </th>
                      <th
                        className="py-2.5 px-3 cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => toggleSort('nama')}
                      >
                        <span className="flex items-center gap-1">
                          Nama Pelanggan <SortIcon field="nama" />
                        </span>
                      </th>
                      <th
                        className="py-2.5 px-3 cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => toggleSort('wilayah')}
                      >
                        <span className="flex items-center gap-1">
                          Wilayah / Dekadi <SortIcon field="wilayah" />
                        </span>
                      </th>
                      <th
                        className="py-2.5 px-3 cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => toggleSort('distance')}
                      >
                        <span className="flex items-center gap-1">
                          Jarak ke Pusat <SortIcon field="distance" />
                        </span>
                      </th>
                      <th className="py-2.5 px-3">Tingkat</th>
                      <th className="py-2.5 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {outliers.slice(0, 200).map((p, idx) => {
                      const sev = distanceSeverity(p.distanceToCenter);
                      const isExpanded = expandedRow === p.kode_pelanggan;

                      return (
                        <React.Fragment key={p.kode_pelanggan}>
                          <tr
                            className={`hover:bg-muted/30 transition-colors ${isExpanded ? 'bg-muted/20' : ''}`}
                          >
                            <td className="py-2.5 px-3 font-mono text-muted-foreground text-[10px]">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold text-foreground">
                                {p.kode_pelanggan}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-col">
                                <span className="text-foreground font-semibold truncate max-w-[190px]">
                                  {p.nama_pelanggan}
                                </span>
                                <span className="text-[10px] text-muted-foreground truncate max-w-[190px]">
                                  {p.alamat || '-'}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {p.kode_wilayah}
                                </span>
                                <span className="text-[11px] text-foreground font-medium">
                                  {p.wilayahNamaAcuan}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold text-foreground">
                                {formatDistance(p.distanceToCenter)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant="outline"
                                className={`font-mono text-[9px] py-0 px-2 border ${severityColor(sev)}`}
                              >
                                {severityLabel(sev)}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedRow(isExpanded ? null : p.kode_pelanggan)
                                      }
                                      className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
                                      aria-label="Detail data"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    Detail Anomali
                                  </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a
                                      href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
                                      aria-label="Buka Google Maps"
                                    >
                                      <MapIcon className="w-3.5 h-3.5" />
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    Buka di Google Maps
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Detail View */}
                          {isExpanded && (
                            <tr className="bg-muted/15 border-y border-border/80">
                              <td colSpan={7} className="px-6 py-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                                  {/* Col 1: Posisi GPS Pelanggan */}
                                  <div className="space-y-1.5 p-3 rounded-xl bg-card border border-border/60">
                                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                                      <MapPin className="w-3.5 h-3.5 text-primary" />
                                      Titik GPS Pelanggan
                                    </p>
                                    <p className="font-mono text-xs text-muted-foreground">
                                      {p.latitude.toFixed(6)}, {p.longitude.toFixed(6)}
                                    </p>
                                    <div className="pt-1">
                                      <a
                                        href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-primary hover:underline font-medium text-[11px]"
                                      >
                                        Buka Titik di Google Maps <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                  </div>

                                  {/* Col 2: Pusat Dekadi Acuan */}
                                  <div className="space-y-1.5 p-3 rounded-xl bg-card border border-border/60">
                                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                                      <Crosshair className="w-3.5 h-3.5 text-amber-500" />
                                      Pusat Dekadi ({p.kode_wilayah} - {p.wilayahNamaAcuan})
                                    </p>
                                    {p.wilayahCenter ? (
                                      <>
                                        <p className="font-mono text-xs text-muted-foreground">
                                          {p.wilayahCenter.lat.toFixed(6)}, {p.wilayahCenter.lng.toFixed(6)}
                                        </p>
                                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                          Jarak Deviasi: {formatDistance(p.distanceToCenter)}
                                        </p>
                                      </>
                                    ) : (
                                      <p className="text-muted-foreground italic text-[11px]">
                                        Titik pusat belum terdaftar di tabel acuan
                                      </p>
                                    )}
                                  </div>

                                  {/* Col 3: Informasi Audit & Status */}
                                  <div className="space-y-1.5 p-3 rounded-xl bg-card border border-border/60">
                                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                                      <Info className="w-3.5 h-3.5 text-muted-foreground" />
                                      Data Master & Rekomendasi
                                    </p>
                                    <div className="space-y-0.5 text-[11px] text-muted-foreground">
                                      <p>
                                        Kecamatan:{' '}
                                        <span className="text-foreground font-medium">
                                          {kecamatanName(p.kode_kecamatan)} ({p.kode_kecamatan})
                                        </span>
                                      </p>
                                      <p>
                                        Golongan / Status:{' '}
                                        <span className="text-foreground font-medium">
                                          {p.golongan} — {p.status_sambungan}
                                        </span>
                                      </p>
                                      {p.spatial_anomaly && (
                                        <p className="text-amber-600 dark:text-amber-400 font-medium">
                                          ⚠ {p.spatial_anomaly}
                                        </p>
                                      )}
                                      {(p.flag_reasons || []).length > 0 && (
                                        <p className="text-rose-600 dark:text-rose-400">
                                          Flag: {p.flag_reasons.join('; ')}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>

                {outliers.length > 200 && (
                  <div className="py-3 px-4 text-center text-xs text-muted-foreground border-t border-border bg-muted/20">
                    Menampilkan 200 data pertama dari total {formatNumber(outliers.length)} data anomali.
                    Gunakan tombol <strong>Cetak / Ekspor PDF</strong> atau <strong>Ekspor Excel</strong> di atas untuk mengunduh seluruh baris lengkap.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Distance Severity Legend ── */}
      <Card className="rounded-2xl border border-border bg-card shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Panduan Tingkat Anomali Spasial:
            </span>
            <Badge variant="outline" className={`font-mono text-[9px] py-0.5 px-2.5 ${severityColor('good')}`}>
              {'< 200m — Normal (Sesuai)'}
            </Badge>
            <Badge variant="outline" className={`font-mono text-[9px] py-0.5 px-2.5 ${severityColor('ok')}`}>
              200–500m — Wajar (Dekat)
            </Badge>
            <Badge variant="outline" className={`font-mono text-[9px] py-0.5 px-2.5 ${severityColor('warning')}`}>
              500m–1km — Agak Jauh (Tinjau Batas)
            </Badge>
            <Badge variant="outline" className={`font-mono text-[9px] py-0.5 px-2.5 ${severityColor('bad')}`}>
              1–2km — Jauh (Cek Lapangan)
            </Badge>
            <Badge variant="outline" className={`font-mono text-[9px] py-0.5 px-2.5 ${severityColor('critical')}`}>
              {'> 2km — Kritis (Urgensi Mutasi / Re-tagging GPS)'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
