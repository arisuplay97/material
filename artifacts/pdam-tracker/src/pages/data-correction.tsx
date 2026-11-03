import React, { useState, useMemo, useCallback } from 'react';
import { usePdamData } from '@/hooks/usePdamData';
import { useAuth } from '@/contexts/AuthContext';
import { Pelanggan, WilayahAcuan } from '@/types/pdam';
import { pdamService, kecamatanName, KECAMATAN_LIST } from '@/services/pdamDataService';
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
  TriangleAlert,
  CheckCircle2,
  Ruler,
  BarChart3,
  Eye,
  Map as MapIcon,
} from 'lucide-react';

// ── Haversine distance (meters) ──
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

// ── Enriched pelanggan with distance info ──
interface PelangganWithDistance extends Pelanggan {
  distanceToCenter: number; // meters
  wilayahCenter: { lat: number; lng: number } | null;
  wilayahNamaAcuan: string;
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

  // ── Build wilayah map for fast lookup ──
  const wilayahMap = useMemo(() => {
    const map = new Map<string, WilayahAcuan>();
    for (const w of wilayah) map.set(w.kode, w);
    return map;
  }, [wilayah]);

  // ── Compute distance for every pelanggan ──
  const enrichedData = useMemo(() => {
    const result: PelangganWithDistance[] = [];
    for (const p of pelanggan) {
      if (
        !Number.isFinite(p.latitude) ||
        !Number.isFinite(p.longitude) ||
        (p.latitude === 0 && p.longitude === 0)
      ) {
        continue; // Skip invalid coordinates
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

  // ── Wilayah list filtered by selected kecamatan ──
  const filteredWilayahOptions = useMemo(() => {
    if (selectedKecamatan === 'all') return wilayah;
    return wilayah.filter((w) => w.kodeKecamatan === selectedKecamatan);
  }, [wilayah, selectedKecamatan]);

  // ── Apply filters and sort ──
  const outliers = useMemo(() => {
    let filtered = enrichedData.filter((p) => p.distanceToCenter >= distanceThreshold);

    if (selectedKecamatan !== 'all') {
      filtered = filtered.filter((p) => p.kode_kecamatan === selectedKecamatan);
    }
    if (selectedWilayah !== 'all') {
      filtered = filtered.filter((p) => p.kode_wilayah === selectedWilayah);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.kode_pelanggan.toLowerCase().includes(q) ||
          p.nama_pelanggan.toLowerCase().includes(q) ||
          p.alamat.toLowerCase().includes(q) ||
          p.nama_wilayah.toLowerCase().includes(q),
      );
    }
    if (showOnlyEstimated) {
      filtered = filtered.filter(
        (p) =>
          p.flag_reasons.some((r) => r.startsWith('Belum ada titik GPS')),
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
    enrichedData,
    distanceThreshold,
    selectedKecamatan,
    selectedWilayah,
    searchQuery,
    sortField,
    sortDir,
    showOnlyEstimated,
  ]);

  // ── Statistics ──
  const stats = useMemo(() => {
    const totalWithCoords = enrichedData.length;
    const totalOutliers = enrichedData.filter((p) => p.distanceToCenter >= distanceThreshold).length;
    const totalEstimated = enrichedData.filter((p) =>
      p.flag_reasons.some((r) => r.startsWith('Belum ada titik GPS')),
    ).length;

    // Per-wilayah breakdown of outliers
    const perWilayah = new Map<string, { count: number; avgDist: number; totalDist: number; nama: string }>();
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
      near: enrichedData.filter((p) => p.distanceToCenter < 200).length,
      medium: enrichedData.filter((p) => p.distanceToCenter >= 200 && p.distanceToCenter < 500).length,
      far: enrichedData.filter((p) => p.distanceToCenter >= 500 && p.distanceToCenter < 1000).length,
      veryFar: enrichedData.filter((p) => p.distanceToCenter >= 1000 && p.distanceToCenter < 2000).length,
      extreme: enrichedData.filter((p) => p.distanceToCenter >= 2000).length,
    };

    return { totalWithCoords, totalOutliers, totalEstimated, perWilayah, buckets };
  }, [enrichedData, outliers, distanceThreshold]);

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

  // ── Export outliers to XLSX ──
  const handleExport = useCallback(async () => {
    if (outliers.length === 0) return;
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
      Catatan_Flag: p.flag_reasons.join('; '),
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
  }, [outliers, selectedKecamatan, distanceThreshold]);

  // ── Distance severity ──
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
        return 'Dekat';
      case 'ok':
        return 'Wajar';
      case 'warning':
        return 'Agak Jauh';
      case 'bad':
        return 'Jauh';
      case 'critical':
        return 'Sangat Jauh';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50/60 dark:bg-neutral-950 px-4 sm:px-6 md:px-8 py-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
              Koreksi Data Lokasi
            </h1>
            <Badge
              variant="outline"
              className="font-mono text-xs text-primary border-primary/30 bg-primary/5"
            >
              Analisis Jarak
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Deteksi pelanggan yang letak koordinat GPS-nya jauh dari titik pusat wilayah/dekadi yang
            tercatat. Bantu tim lapangan memverifikasi dan mengoreksi data yang mencurigakan.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={outliers.length === 0}
            className="h-9 px-3 rounded-xl border-border gap-2 text-xs font-medium hover:bg-muted"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Ekspor Daftar ({formatNumber(outliers.length)})</span>
          </Button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="rounded-2xl border border-border bg-card shadow-sm">
          <CardContent className="p-4 text-center">
            <span className="text-[10px] font-mono uppercase text-muted-foreground block">
              Total Pelanggan (GPS)
            </span>
            <span className="text-2xl font-mono font-bold text-foreground">
              {formatNumber(stats.totalWithCoords)}
            </span>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-border bg-card shadow-sm">
          <CardContent className="p-4 text-center">
            <span className="text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400 block">
              Outlier (≥{distanceThreshold}m)
            </span>
            <span className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400">
              {formatNumber(stats.totalOutliers)}
            </span>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-border bg-card shadow-sm">
          <CardContent className="p-4 text-center">
            <span className="text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400 block">
              {'< 200m (Dekat)'}
            </span>
            <span className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {formatNumber(stats.buckets.near)}
            </span>
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
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-border bg-card shadow-sm">
          <CardContent className="p-4 text-center">
            <span className="text-[10px] font-mono uppercase text-rose-600 dark:text-rose-400 block">
              {'> 2 km (Anomali)'}
            </span>
            <span className="text-2xl font-mono font-bold text-rose-600 dark:text-rose-400">
              {formatNumber(stats.buckets.extreme)}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ── Left Panel: Filters ── */}
        <Card className="rounded-2xl border border-border bg-card shadow-sm lg:col-span-1">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base font-heading font-semibold text-foreground flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              Filter Pencarian
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Atur ambang batas jarak dan filter wilayah
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-5">
            {/* Distance Threshold Slider */}
            <div className="space-y-2.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-primary" />
                Ambang Batas Jarak
              </Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[distanceThreshold]}
                  onValueChange={([v]) => setDistanceThreshold(v)}
                  min={50}
                  max={5000}
                  step={50}
                  className="flex-1"
                />
                <span className="font-mono text-xs font-bold text-foreground min-w-[52px] text-right">
                  {formatDistance(distanceThreshold)}
                </span>
              </div>
              <p className="text-[10.5px] text-muted-foreground">
                Tampilkan pelanggan yang lokasinya ≥{' '}
                <strong>{formatDistance(distanceThreshold)}</strong> dari titik pusat dekadi-nya.
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

            {/* Search */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Cari Pelanggan</Label>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kode, nama, atau alamat..."
                className="h-9 rounded-xl text-xs"
              />
            </div>

            {/* Show Only Estimated Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="show-estimated"
                checked={showOnlyEstimated}
                onChange={(e) => setShowOnlyEstimated(e.target.checked)}
                className="rounded border-border h-3.5 w-3.5 accent-primary"
              />
              <label htmlFor="show-estimated" className="text-xs text-muted-foreground cursor-pointer">
                Hanya koordinat estimasi (tanpa GPS)
              </label>
            </div>

            {/* Per-Wilayah Breakdown */}
            {stats.perWilayah.size > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <p className="text-[10px] font-mono uppercase text-muted-foreground flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  Ringkasan per Wilayah (Top 10)
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1">
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
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted/60 transition-colors text-left cursor-pointer"
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
                Pelanggan dengan jarak ≥{' '}
                <strong className="text-foreground">{formatDistance(distanceThreshold)}</strong> dari
                titik pusat dekadi wilayahnya
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {outliers.length === 0 ? (
              <div className="py-20 text-center space-y-3 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 opacity-60" />
                <p className="text-sm font-medium">Tidak ada outlier ditemukan</p>
                <p className="text-xs">
                  {enrichedData.length === 0
                    ? 'Belum ada data pelanggan dengan koordinat GPS.'
                    : `Semua pelanggan berada dalam radius ${formatDistance(distanceThreshold)} dari titik pusat dekadi-nya.`}
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
                          Nama <SortIcon field="nama" />
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
                                <span className="text-foreground font-medium truncate max-w-[180px]">
                                  {p.nama_pelanggan}
                                </span>
                                <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                                  {p.alamat}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {p.kode_wilayah}
                                </span>
                                <span className="text-[11px] text-foreground">
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
                                className={`font-mono text-[9px] py-0 px-1.5 border ${severityColor(sev)}`}
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
                                    >
                                      <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    Detail
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a
                                      href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                                    >
                                      <MapIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    Google Maps
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Detail Row */}
                          {isExpanded && (
                            <tr className="bg-muted/10">
                              <td colSpan={7} className="px-6 py-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                                  <div className="space-y-1.5">
                                    <p className="font-semibold text-foreground flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-primary" />
                                      Koordinat Pelanggan
                                    </p>
                                    <p className="font-mono text-muted-foreground">
                                      {p.latitude.toFixed(6)}, {p.longitude.toFixed(6)}
                                    </p>
                                    <a
                                      href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline flex items-center gap-1"
                                    >
                                      Buka Google Maps{' '}
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                  <div className="space-y-1.5">
                                    <p className="font-semibold text-foreground flex items-center gap-1">
                                      <Crosshair className="w-3 h-3 text-amber-500" />
                                      Pusat Dekadi ({p.kode_wilayah} {p.wilayahNamaAcuan})
                                    </p>
                                    {p.wilayahCenter ? (
                                      <p className="font-mono text-muted-foreground">
                                        {p.wilayahCenter.lat.toFixed(6)},{' '}
                                        {p.wilayahCenter.lng.toFixed(6)}
                                      </p>
                                    ) : (
                                      <p className="text-muted-foreground italic">
                                        Belum ada titik pusat dekadi
                                      </p>
                                    )}
                                  </div>
                                  <div className="space-y-1.5">
                                    <p className="font-semibold text-foreground flex items-center gap-1">
                                      <Info className="w-3 h-3 text-muted-foreground" />
                                      Detail Tambahan
                                    </p>
                                    <div className="space-y-0.5 text-muted-foreground">
                                      <p>
                                        Kecamatan:{' '}
                                        <span className="text-foreground">
                                          {kecamatanName(p.kode_kecamatan)} ({p.kode_kecamatan})
                                        </span>
                                      </p>
                                      <p>
                                        Status:{' '}
                                        <span className="text-foreground">
                                          {p.status_sambungan}
                                        </span>
                                      </p>
                                      <p>
                                        Golongan:{' '}
                                        <span className="text-foreground">{p.golongan}</span>
                                      </p>
                                      {p.spatial_anomaly && (
                                        <p className="text-amber-600 dark:text-amber-400">
                                          ⚠ {p.spatial_anomaly}
                                        </p>
                                      )}
                                      {p.flag_reasons.length > 0 && (
                                        <p className="text-amber-600 dark:text-amber-400">
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
                  <div className="py-3 px-4 text-center text-xs text-muted-foreground border-t border-border">
                    Menampilkan 200 dari {formatNumber(outliers.length)} data. Gunakan filter atau
                    ekspor ke Excel untuk melihat semua.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Distance Legend ── */}
      <Card className="rounded-2xl border border-border bg-card shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1">
              <Ruler className="w-3.5 h-3.5 text-primary" /> Legenda Jarak:
            </span>
            <Badge variant="outline" className={`font-mono text-[9px] py-0 px-2 ${severityColor('good')}`}>
              {'< 200m — Dekat (Normal)'}
            </Badge>
            <Badge variant="outline" className={`font-mono text-[9px] py-0 px-2 ${severityColor('ok')}`}>
              200–500m — Wajar
            </Badge>
            <Badge variant="outline" className={`font-mono text-[9px] py-0 px-2 ${severityColor('warning')}`}>
              500m–1km — Agak Jauh
            </Badge>
            <Badge variant="outline" className={`font-mono text-[9px] py-0 px-2 ${severityColor('bad')}`}>
              1–2km — Jauh (Perlu Cek)
            </Badge>
            <Badge variant="outline" className={`font-mono text-[9px] py-0 px-2 ${severityColor('critical')}`}>
              {'> 2km — Sangat Jauh (Anomali)'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

