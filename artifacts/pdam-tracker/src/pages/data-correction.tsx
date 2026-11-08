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
  ArrowRight,
  AlertOctagon,
} from 'lucide-react';

// ── Haversine distance formula (returns meters) ──
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

function isEstimatedPoint(p: Pelanggan): boolean {
  return (p.flag_reasons || []).some((r) => {
    const low = r.toLowerCase();
    return low.includes('belum ada titik gps') || low.includes('estimasi');
  });
}

interface DekadeClusterInfo {
  wilayah: WilayahAcuan;
  centerLat: number;
  centerLng: number;
  naturalRadius: number; // Radius sebaran alami (P85) pelanggan di dekade ini (meter)
  sampleCount: number;
  isEmpirical: boolean; // true jika dihitung dari median titik GPS aktual pelanggan
}

// ── Find nearest real dekade cluster to a given GPS coordinate ──
function findNearestDekadeCluster(
  lat: number,
  lng: number,
  clusters: DekadeClusterInfo[],
): { cluster: DekadeClusterInfo; distance: number } | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || clusters.length === 0) return null;

  let nearest: DekadeClusterInfo | null = null;
  let minDistance = Infinity;

  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i];
    // Pre-filter cepat berbasis derajat (~15 km) bila sudah menemukan kandidat dekat
    if (minDistance < 15000) {
      const dLatDeg = Math.abs(lat - c.centerLat);
      const dLngDeg = Math.abs(lng - c.centerLng);
      if (dLatDeg > 0.15 || dLngDeg > 0.15) continue;
    }
    const d = haversineDistance(lat, lng, c.centerLat, c.centerLng);
    if (d < minDistance) {
      minDistance = d;
      nearest = c;
    }
  }

  return nearest ? { cluster: nearest, distance: minDistance } : null;
}

type SortField = 'distance' | 'kode' | 'nama' | 'wilayah' | 'kesesuaian';
type SortDir = 'asc' | 'desc';
type AnomalyCategory = 'all' | 'wrong_dekade' | 'same_dekade_far' | 'estimated_only';

export default function DataCorrection() {
  const { user } = useAuth();
  const { pelanggan, wilayah } = usePdamData();

  // ── Filter State ──
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>('all');
  const [selectedWilayah, setSelectedWilayah] = useState<string>('all');
  const [distanceThreshold, setDistanceThreshold] = useState<number>(500); // meters
  const [anomalyCategory, setAnomalyCategory] = useState<AnomalyCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('distance');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // ── Build wilayah map for fast lookup ──
  const wilayahMap = useMemo(() => {
    const map = new Map<string, WilayahAcuan>();
    for (const w of wilayah) map.set(w.kode, w);
    return map;
  }, [wilayah]);

  // ── Hitung Titik Pusat Sebenarnya (Robust Median Centroid) & Radius Sebaran Alami (P85) tiap Dekade ──
  // Mengatasi masalah titik acuan statis (DEFAULT_WILAYAH_LIST) yang meleset 3-13 km dari lokasi riil desa/dekade,
  // sekaligus tahan terhadap titik mencar ekstrem (mis. titik nyasar ke luar pulau / kecamatan lain).
  const { dekadeClusterMap, activeDekadeClusters } = useMemo(() => {
    const byWilayah = new Map<string, Pelanggan[]>();

    for (const p of pelanggan) {
      if (
        !Number.isFinite(p.latitude) ||
        !Number.isFinite(p.longitude) ||
        (p.latitude === 0 && p.longitude === 0)
      ) {
        continue;
      }
      if (isEstimatedPoint(p)) continue;
      // Hanya gunakan koordinat valid di daratan Pulau Lombok untuk menghitung pusat klaster
      if (
        p.latitude < -9.2 ||
        p.latitude > -8.1 ||
        p.longitude < 115.7 ||
        p.longitude > 116.8
      ) {
        continue;
      }

      let list = byWilayah.get(p.kode_wilayah);
      if (!list) {
        list = [];
        byWilayah.set(p.kode_wilayah, list);
      }
      list.push(p);
    }

    const clusterMap = new Map<string, DekadeClusterInfo>();
    const activeList: DekadeClusterInfo[] = [];

    for (const [kode, pts] of byWilayah.entries()) {
      const wRef = wilayahMap.get(kode);
      if (pts.length >= 3) {
        // Tahap 1: Median awal (tahan terhadap hingga 50% titik mencar ekstrem)
        const lats = pts.map((p) => p.latitude).sort((a, b) => a - b);
        const lngs = pts.map((p) => p.longitude).sort((a, b) => a - b);
        const mid = Math.floor(pts.length / 2);
        const medLat0 = lats[mid];
        const medLng0 = lngs[mid];

        // Tahap 2: Pertajam pusat klaster hanya dari inlier inti (<= 2.5 km dari median awal, atau 75% terdekat)
        const withDist0 = pts
          .map((p) => ({
            p,
            d: haversineDistance(p.latitude, p.longitude, medLat0, medLng0),
          }))
          .sort((a, b) => a.d - b.d);

        let core = withDist0.filter((x) => x.d <= 2500);
        if (core.length < Math.min(3, pts.length)) {
          core = withDist0.slice(0, Math.max(3, Math.ceil(pts.length * 0.75)));
        }

        const coreLats = core.map((x) => x.p.latitude).sort((a, b) => a - b);
        const coreLngs = core.map((x) => x.p.longitude).sort((a, b) => a - b);
        const coreMid = Math.floor(core.length / 2);
        const centerLat = coreLats[coreMid];
        const centerLng = coreLngs[coreMid];

        // Tahap 3: Hitung Radius Sebaran Alami (Persentil ke-85 dari klaster inti), dibatasi 250m - 1.600m
        const coreDists = core
          .map((x) => haversineDistance(x.p.latitude, x.p.longitude, centerLat, centerLng))
          .sort((a, b) => a - b);
        const p85 = coreDists[Math.floor(coreDists.length * 0.85)] || 350;
        const naturalRadius = Math.max(250, Math.min(1600, p85));

        const wilayahObj: WilayahAcuan = wRef
          ? { ...wRef, centerLat, centerLng }
          : {
              kode,
              nama: pts[0].nama_wilayah || `Wilayah ${kode}`,
              kodeKecamatan: pts[0].kode_kecamatan || kode.slice(0, 2),
              namaKecamatan: kecamatanName(pts[0].kode_kecamatan || kode.slice(0, 2)),
              centerLat,
              centerLng,
              warna: '#0284c7',
            };

        const info: DekadeClusterInfo = {
          wilayah: wilayahObj,
          centerLat,
          centerLng,
          naturalRadius,
          sampleCount: pts.length,
          isEmpirical: true,
        };
        clusterMap.set(kode, info);
        activeList.push(info);
      }
    }

    // Fallback untuk wilayah yang punya < 3 titik GPS aktual
    for (const w of wilayah) {
      if (!clusterMap.has(w.kode) && Number.isFinite(w.centerLat) && Number.isFinite(w.centerLng)) {
        const info: DekadeClusterInfo = {
          wilayah: w,
          centerLat: w.centerLat,
          centerLng: w.centerLng,
          naturalRadius: 500,
          sampleCount: byWilayah.get(w.kode)?.length ?? 0,
          isEmpirical: false,
        };
        clusterMap.set(w.kode, info);
      }
    }

    return { dekadeClusterMap: clusterMap, activeDekadeClusters: activeList };
  }, [pelanggan, wilayah, wilayahMap]);

  // ── Enriched data with real distance to dekade cluster + accurate wrong-dekade detection ──
  const enrichedData = useMemo(() => {
    const result: PelangganOutlierItem[] = [];
    for (const p of pelanggan) {
      if (
        !Number.isFinite(p.latitude) ||
        !Number.isFinite(p.longitude) ||
        (p.latitude === 0 && p.longitude === 0)
      ) {
        continue;
      }

      const isEst = isEstimatedPoint(p);
      const ownCluster = dekadeClusterMap.get(p.kode_wilayah);
      const wRef = wilayahMap.get(p.kode_wilayah);

      let distanceToCenter = 0;
      let wilayahCenter: { lat: number; lng: number } | null = null;
      let wilayahNamaAcuan = wRef?.nama || p.nama_wilayah || `Wilayah ${p.kode_wilayah}`;
      const ownNaturalRadius = ownCluster?.naturalRadius ?? 500;

      if (ownCluster) {
        wilayahCenter = { lat: ownCluster.centerLat, lng: ownCluster.centerLng };
        wilayahNamaAcuan = ownCluster.wilayah.nama;
        distanceToCenter = haversineDistance(
          p.latitude,
          p.longitude,
          ownCluster.centerLat,
          ownCluster.centerLng,
        );
      } else if (p.kode_kecamatan && KECAMATAN_BOUNDS[p.kode_kecamatan]) {
        const [cLat, cLng] = boundsCenter(KECAMATAN_BOUNDS[p.kode_kecamatan]);
        wilayahCenter = { lat: cLat, lng: cLng };
        wilayahNamaAcuan = `Kec. ${kecamatanName(p.kode_kecamatan)} (Estimasi Pusat)`;
        distanceToCenter = haversineDistance(p.latitude, p.longitude, cLat, cLng);
      }

      // Cari klaster dekade nyata terdekat dari titik GPS pelanggan
      const nearest = findNearestDekadeCluster(
        p.latitude,
        p.longitude,
        activeDekadeClusters,
      );
      const nearestCluster = nearest?.cluster ?? null;
      const distanceToDetectedCenter = nearest?.distance ?? 0;

      // Pelanggan dinyatakan "Beda Dekade (Nyasar ke Dekade Lain)" HANYA JIKA:
      // 1. Bukan titik estimasi (memiliki koordinat GPS nyata)
      // 2. Berada di luar radius sebaran alami dekadenya sendiri (> max(350m, radiusAlami * 1.15))
      // 3. Klaster dekade terdekat berbeda dengan dekade terdaftar
      // 4. Titik GPS benar-benar masuk ke dalam klaster dekade lain tersebut (<= max(550m, radiusTarget * 1.3))
      //    dan jaraknya secara signifikan lebih dekat ke pusat dekade lain (< 65% jarak ke pusat dekade sendiri)
      const isWrongDekade = Boolean(
        !isEst &&
          nearestCluster &&
          nearestCluster.wilayah.kode !== p.kode_wilayah &&
          distanceToCenter > Math.max(350, ownNaturalRadius * 1.15) &&
          distanceToDetectedCenter <= Math.max(550, nearestCluster.naturalRadius * 1.3) &&
          distanceToDetectedCenter < distanceToCenter * 0.65,
      );

      // Bila titik pelanggan sesuai dekade (atau mencar jauh di luar klaster manapun),
      // tampilkan dekade terdeteksi sesuai status riilnya agar tidak menyesatkan
      const detectedWilayah: WilayahAcuan | null = isWrongDekade
        ? nearestCluster!.wilayah
        : distanceToCenter <= Math.max(500, ownNaturalRadius * 1.25)
        ? ownCluster?.wilayah ?? wRef ?? null
        : nearestCluster && distanceToDetectedCenter <= Math.max(800, nearestCluster.naturalRadius * 1.5)
        ? nearestCluster.wilayah
        : null;

      result.push({
        ...p,
        distanceToCenter,
        wilayahCenter,
        wilayahNamaAcuan,
        detectedWilayah,
        distanceToDetectedCenter,
        isWrongDekade,
        ownNaturalRadius,
      });
    }
    return result;
  }, [pelanggan, dekadeClusterMap, activeDekadeClusters, wilayahMap]);

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

  // Helper: apakah titik pelanggan ini mencar (keluar dari sebaran alami dekadenya & melewati batas toleransi jarak)
  const isPointMencar = useCallback(
    (p: PelangganOutlierItem) => {
      if (isEstimatedPoint(p)) return false;
      const minNatural = (p.ownNaturalRadius ?? 400) * 1.2;
      const effectiveMinDist = Math.max(distanceThreshold, minNatural);
      return p.distanceToCenter >= effectiveMinDist;
    },
    [distanceThreshold],
  );

  // ── Filtered Outliers List ──
  const outliers = useMemo(() => {
    let filtered = scopedData;

    // Filter berdasarkan Kategori Anomali
    if (anomalyCategory === 'wrong_dekade') {
      // Hanya yang salah dekade (terdaftar di A tapi titiknya berada di dalam klaster dekade B)
      filtered = filtered.filter((p) => p.isWrongDekade);
    } else if (anomalyCategory === 'same_dekade_far') {
      // Titik mencar / jaraknya jauh dari klaster dekadenya sendiri
      filtered = filtered.filter((p) => !p.isWrongDekade && isPointMencar(p));
    } else if (anomalyCategory === 'estimated_only') {
      // Hanya pelanggan tanpa GPS (memakai titik estimasi)
      filtered = filtered.filter((p) => isEstimatedPoint(p));
    } else {
      // Default 'all': Salah dekade ATAU titik mencar jauh dari pusat dekadenya
      filtered = filtered.filter((p) => p.isWrongDekade || isPointMencar(p));
    }

    // Filter Pencarian Teks
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.kode_pelanggan.toLowerCase().includes(q) ||
          p.nama_pelanggan.toLowerCase().includes(q) ||
          p.alamat.toLowerCase().includes(q) ||
          p.nama_wilayah.toLowerCase().includes(q) ||
          p.wilayahNamaAcuan.toLowerCase().includes(q) ||
          (p.detectedWilayah?.nama || '').toLowerCase().includes(q),
      );
    }

    // Sorting
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
        case 'kesesuaian':
          cmp = (a.isWrongDekade ? 1 : 0) - (b.isWrongDekade ? 1 : 0);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [
    scopedData,
    anomalyCategory,
    isPointMencar,
    searchQuery,
    sortField,
    sortDir,
  ]);

  // ── Statistics (scoped to current selection) ──
  const stats = useMemo(() => {
    const totalWithCoords = scopedData.length;
    const totalWrongDekade = scopedData.filter((p) => p.isWrongDekade).length;
    const totalOutliersDistance = scopedData.filter((p) => isPointMencar(p)).length;
    const totalEstimated = scopedData.filter((p) => isEstimatedPoint(p)).length;

    // Per-wilayah breakdown of outliers
    const perWilayah = new Map<
      string,
      { count: number; wrongCount: number; avgDist: number; totalDist: number; nama: string }
    >();

    for (const p of outliers) {
      const entry = perWilayah.get(p.kode_wilayah) || {
        count: 0,
        wrongCount: 0,
        avgDist: 0,
        totalDist: 0,
        nama: p.wilayahNamaAcuan,
      };
      entry.count++;
      if (p.isWrongDekade) entry.wrongCount++;
      entry.totalDist += p.distanceToCenter;
      entry.avgDist = entry.totalDist / entry.count;
      perWilayah.set(p.kode_wilayah, entry);
    }

    return { totalWithCoords, totalWrongDekade, totalOutliersDistance, totalEstimated, perWilayah };
  }, [scopedData, outliers, isPointMencar]);

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
        Kode_Dekade_Terdaftar: p.kode_wilayah,
        Dekade_Terdaftar: p.wilayahNamaAcuan,
        Kode_Dekade_Terdeteksi: p.detectedWilayah?.kode ?? '-',
        Dekade_Terdeteksi_GPS: p.detectedWilayah?.nama ?? '-',
        Status_Kesesuaian: p.isWrongDekade ? 'BEDA DEKADE (SALAH WILAYAH)' : 'SESUAI DEKADE',
        Kecamatan: kecamatanName(p.kode_kecamatan),
        Latitude: p.latitude,
        Longitude: p.longitude,
        Lat_Pusat_Dekade: p.wilayahCenter?.lat ?? '',
        Lng_Pusat_Dekade: p.wilayahCenter?.lng ?? '',
        Jarak_ke_Pusat_Meter: Math.round(p.distanceToCenter),
        Jarak_ke_Pusat_Km: (p.distanceToCenter / 1000).toFixed(3),
        Status: p.status_sambungan,
        Golongan: p.golongan,
        Catatan_Flag: (p.flag_reasons || []).join('; '),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Koreksi Data');

      // Auto column widths
      const colWidths = Object.keys(rows[0] || {}).map((key) => ({
        wch: Math.max(key.length, 15),
      }));
      ws['!cols'] = colWidths;

      const filename = `Koreksi_Lokasi_PDAM_${selectedKecamatan === 'all' ? 'Semua' : `Kec_${selectedKecamatan}`}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success(`Berhasil mengunduh Excel (${formatNumber(outliers.length)} data).`);
    } catch (e: any) {
      toast.error(e.message || 'Gagal mengekspor file Excel.');
    }
  }, [outliers, selectedKecamatan]);

  // ── Export to PDF Resmi ──
  const handleExportPdf = useCallback(() => {
    if (outliers.length === 0) {
      toast.error('Tidak ada data anomali untuk diekspor ke PDF.');
      return;
    }

    try {
      setIsExportingPdf(true);
      toast.info('Menyiapkan Laporan Hasil Koreksi Lokasi PDF resmi...');

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

  return (
    <div className="min-h-screen bg-neutral-50/60 dark:bg-neutral-950 px-4 sm:px-6 md:px-8 py-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-heading font-semibold tracking-tight text-foreground">
              Koreksi Data Lokasi
            </h1>
            <Badge variant="default" className="font-mono text-[11px]">
              Analisis Dekade &amp; Jarak
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Deteksi otomatis pelanggan yang titik GPS-nya berada di klaster dekade lain serta titik yang mencar jauh dari pusat dekadenya.
          </p>
        </div>

        {/* Action Buttons: PDF & Excel */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <Button
            variant="destructive"
            onClick={handleExportPdf}
            disabled={outliers.length === 0 || isExportingPdf}
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
            onClick={handleExportExcel}
            disabled={outliers.length === 0}
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Ekspor Excel (.xlsx)</span>
          </Button>
        </div>
      </div>

      {/* ── Stats Cards (Kumo Metric Grid) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-muted-foreground block">
              Pelanggan Teranalisis
            </span>
            <span className="text-2xl font-mono font-semibold text-foreground tabular mt-1 block">
              {formatNumber(stats.totalWithCoords)}
            </span>
            <span className="text-[10.5px] font-mono text-muted-foreground block mt-1">
              {selectedKecamatan === 'all' ? 'Seluruh Kabupaten' : `Kec. ${selectedKecamatan}`}
            </span>
          </CardContent>
        </Card>

        <Card className="border-red-500/30 bg-red-500/[0.03]">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-red-600 dark:text-red-400 block">
              Beda Dekade (Nyasar)
            </span>
            <span className="text-2xl font-mono font-semibold text-red-600 dark:text-red-400 tabular mt-1 block">
              {formatNumber(stats.totalWrongDekade)}
            </span>
            <span className="text-[10.5px] text-muted-foreground block mt-1">
              Titik GPS masuk dekade lain
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 block">
              Jarak {`>=`} {formatDistance(distanceThreshold)}
            </span>
            <span className="text-2xl font-mono font-semibold text-amber-600 dark:text-amber-400 tabular mt-1 block">
              {formatNumber(stats.totalOutliersDistance)}
            </span>
            <span className="text-[10.5px] text-muted-foreground block mt-1">
              Deviasi dari pusat dekade
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-primary block">
              Hanya Titik Estimasi
            </span>
            <span className="text-2xl font-mono font-semibold text-primary tabular mt-1 block">
              {formatNumber(stats.totalEstimated)}
            </span>
            <span className="text-[10.5px] text-muted-foreground block mt-1">
              Belum survei GPS fisik
            </span>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* ── Left Panel: Filters & Thresholds ── */}
        <Card className="lg:col-span-1 overflow-hidden">
          <CardHeader className="px-4 py-3 border-b border-border bg-muted/25">
            <CardTitle className="text-sm font-heading font-semibold text-foreground flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-primary" />
              Filter &amp; Kategori
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
              Pilih jenis anomali dan cakupan wilayah
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Anomaly Category Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Jenis Anomali Ditampilkan</Label>
              <Select
                value={anomalyCategory}
                onValueChange={(v) => setAnomalyCategory(v as AnomalyCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Anomali (Beda Dekade &amp; Jarak Jauh)</SelectItem>
                  <SelectItem value="wrong_dekade">Hanya Beda Dekade (Nyasar ke Wilayah Lain)</SelectItem>
                  <SelectItem value="same_dekade_far">Sesuai Dekade tapi Jarak Jauh</SelectItem>
                  <SelectItem value="estimated_only">Hanya Titik Estimasi (Tanpa GPS)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Distance Threshold Slider */}
            <div className="space-y-2.5 pt-2.5 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-primary" />
                  Batas Toleransi Jarak
                </Label>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                  {formatDistance(distanceThreshold)}
                </span>
              </div>
              <Slider
                value={[distanceThreshold]}
                onValueChange={([v]) => setDistanceThreshold(v)}
                min={100}
                max={5000}
                step={50}
                className="py-1"
              />
              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-1 pt-0.5">
                {[300, 500, 1000, 2000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDistanceThreshold(preset)}
                    className={`text-[10.5px] py-1 px-1 rounded-md border text-center transition-colors font-mono cursor-pointer ${
                      distanceThreshold === preset
                        ? 'bg-primary text-primary-foreground border-primary font-semibold'
                        : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    {formatDistance(preset)}
                  </button>
                ))}
              </div>
            </div>

            {/* Kecamatan Filter */}
            <div className="space-y-1.5 pt-2.5 border-t border-border">
              <Label className="text-xs font-medium text-foreground">Kecamatan</Label>
              <Select
                value={selectedKecamatan}
                onValueChange={(v) => {
                  setSelectedKecamatan(v);
                  setSelectedWilayah('all');
                }}
              >
                <SelectTrigger>
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

            {/* Wilayah / Dekade Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Wilayah / Dekade Terdaftar</Label>
              <Select value={selectedWilayah} onValueChange={setSelectedWilayah}>
                <SelectTrigger>
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
              <Label className="text-xs font-medium text-foreground">Cari Nama / ID / Wilayah</Label>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kode pelanggan, nama, alamat..."
              />
            </div>

            {/* Per-Wilayah Breakdown */}
            {stats.perWilayah.size > 0 && (
              <div className="space-y-2 pt-2.5 border-t border-border">
                <p className="text-[10px] font-mono uppercase text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" />
                    Top Wilayah Anomali
                  </span>
                  <span className="text-[9px]">Salah / Total</span>
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {Array.from(stats.perWilayah.entries())
                    .sort(([, a], [, b]) => b.wrongCount - a.wrongCount || b.count - a.count)
                    .slice(0, 10)
                    .map(([kode, info]) => (
                      <button
                        key={kode}
                        type="button"
                        onClick={() => {
                          setSelectedKecamatan(kode.slice(0, 2));
                          setSelectedWilayah(kode);
                        }}
                        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                            {kode}
                          </span>
                          <span className="text-[11px] text-foreground truncate">{info.nama}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {info.wrongCount > 0 && (
                            <Badge
                              variant="destructive"
                              className="font-mono text-[9.5px] py-0 px-1.5"
                              title={`${info.wrongCount} data beda dekade`}
                            >
                              {info.wrongCount} salah
                            </Badge>
                          )}
                          <Badge
                            variant="secondary"
                            className="font-mono text-[9.5px] py-0 px-1.5"
                          >
                            {info.count}
                          </Badge>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Right Panel: Results Table ── */}
        <Card className="lg:col-span-3 overflow-hidden">
          <CardHeader className="px-4 sm:px-5 py-3 border-b border-border bg-muted/25">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-sm font-heading font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Daftar Analisis Lokasi &amp; Kesesuaian Dekade
                <Badge variant="outline" className="font-mono text-[10.5px] ml-1">
                  {formatNumber(outliers.length)} baris
                </Badge>
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Membandingkan <strong>Dekade Terdaftar</strong> dengan <strong>Dekade Terdeteksi dari Titik GPS</strong>
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {outliers.length === 0 ? (
              <div className="py-20 text-center space-y-2 text-muted-foreground">
                <CheckCircle2 className="w-9 h-9 mx-auto text-emerald-500 opacity-70" />
                <p className="text-sm font-medium text-foreground">Tidak Ada Anomali Ditemukan</p>
                <p className="text-xs max-w-md mx-auto">
                  Semua titik pelanggan pada filter ini berada dalam dekade yang sesuai dan dalam batas jarak toleransi.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/35 border-b border-border text-[10.5px] font-mono text-muted-foreground uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-10">#</th>
                      <th
                        className="py-2.5 px-3 cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => toggleSort('kode')}
                      >
                        <span className="flex items-center gap-1">
                          Kode Pel. <SortIcon field="kode" />
                        </span>
                      </th>
                      <th
                        className="py-2.5 px-3 cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => toggleSort('nama')}
                      >
                        <span className="flex items-center gap-1">
                          Nama &amp; Alamat <SortIcon field="nama" />
                        </span>
                      </th>
                      <th
                        className="py-2.5 px-3 cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => toggleSort('wilayah')}
                      >
                        <span className="flex items-center gap-1">
                          Dekade Terdaftar <SortIcon field="wilayah" />
                        </span>
                      </th>
                      <th className="py-2.5 px-3">
                        <span className="flex items-center gap-1 font-semibold text-foreground">
                          Dekade Terdeteksi (GPS)
                        </span>
                      </th>
                      <th
                        className="py-2.5 px-3 cursor-pointer hover:text-foreground transition-colors text-center"
                        onClick={() => toggleSort('kesesuaian')}
                      >
                        <span className="flex items-center justify-center gap-1">
                          Kesesuaian <SortIcon field="kesesuaian" />
                        </span>
                      </th>
                      <th
                        className="py-2.5 px-3 cursor-pointer hover:text-foreground transition-colors text-right"
                        onClick={() => toggleSort('distance')}
                      >
                        <span className="flex items-center justify-end gap-1">
                          Jarak ke Pusat <SortIcon field="distance" />
                        </span>
                      </th>
                      <th className="py-2.5 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {outliers.slice(0, 200).map((p, idx) => {
                      const isExpanded = expandedRow === p.kode_pelanggan;

                      return (
                        <React.Fragment key={p.kode_pelanggan}>
                          <tr
                            className={`hover:bg-muted/40 transition-colors ${
                              p.isWrongDekade ? 'bg-red-500/[0.03]' : ''
                            } ${isExpanded ? 'bg-muted/25' : ''}`}
                          >
                            <td className="py-2.5 px-3 font-mono text-muted-foreground text-[10px]">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-semibold text-foreground">
                                {p.kode_pelanggan}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-col">
                                <span className="text-foreground font-medium truncate max-w-[170px]">
                                  {p.nama_pelanggan}
                                </span>
                                <span className="text-[10px] text-muted-foreground truncate max-w-[170px]">
                                  {p.alamat || '-'}
                                </span>
                              </div>
                            </td>
                            {/* Dekade Terdaftar */}
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
                            {/* Dekade Terdeteksi (Posisi GPS Nyata) */}
                            <td className="py-2.5 px-3">
                              {p.detectedWilayah ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[10px] font-semibold text-foreground">
                                    {p.detectedWilayah.kode}
                                  </span>
                                  <span className="text-[11px] font-semibold text-foreground">
                                    {p.detectedWilayah.nama}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 text-[11px] font-medium">
                                  Di Luar Klaster Dekade
                                </span>
                              )}
                            </td>
                            {/* Kesesuaian Badge */}
                            <td className="py-2.5 px-3 text-center">
                              {p.isWrongDekade ? (
                                <Badge variant="destructive" className="font-mono text-[10px]">
                                  Beda Dekade!
                                </Badge>
                              ) : isPointMencar(p) ? (
                                <span className="inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                                  Titik Mencar
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                                  Sesuai Dekade
                                </span>
                              )}
                            </td>
                            {/* Jarak ke Pusat Dekade Terdaftar */}
                            <td className="py-2.5 px-3 text-right">
                              <span
                                className={`font-mono font-semibold tabular ${
                                  p.distanceToCenter >= 2000
                                    ? 'text-red-600 dark:text-red-400'
                                    : p.distanceToCenter >= 1000
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-foreground'
                                }`}
                              >
                                {formatDistance(p.distanceToCenter)}
                              </span>
                            </td>
                            {/* Aksi */}
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedRow(isExpanded ? null : p.kode_pelanggan)
                                      }
                                      className="h-7 w-7 rounded-md border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
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
                                      className="h-7 w-7 rounded-md border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
                                      aria-label="Buka Google Maps"
                                    >
                                      <MapIcon className="w-3.5 h-3.5" />
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    Buka Google Maps
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Detail View */}
                          {isExpanded && (
                            <tr className="bg-muted/20 border-y border-border">
                              <td colSpan={8} className="px-5 py-3.5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                                  {/* Col 1: Posisi GPS Pelanggan */}
                                  <div className="space-y-1.5 p-3 rounded-md bg-card border border-border">
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

                                  {/* Col 2: Perbandingan Dekade (Terdaftar vs Terdeteksi) */}
                                  <div className="space-y-1.5 p-3 rounded-md bg-card border border-border">
                                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                                      <Crosshair className="w-3.5 h-3.5 text-amber-500" />
                                      Perbandingan Dekade &amp; Klaster
                                    </p>
                                    <div className="space-y-1 text-[11px]">
                                      <p className="text-muted-foreground">
                                        Terdaftar: <strong className="text-foreground">{p.kode_wilayah} - {p.wilayahNamaAcuan}</strong>
                                      </p>
                                      {p.wilayahCenter && (
                                        <p className="text-muted-foreground font-mono text-[10px]">
                                          Pusat Klaster Dekade: {p.wilayahCenter.lat.toFixed(5)}, {p.wilayahCenter.lng.toFixed(5)} (Radius alami ±{formatDistance(p.ownNaturalRadius ?? 400)})
                                        </p>
                                      )}
                                      <p className="text-muted-foreground">
                                        Terdeteksi di Dekade:{' '}
                                        {p.detectedWilayah ? (
                                          <strong className={p.isWrongDekade ? 'text-red-600 dark:text-red-400 font-bold' : 'text-emerald-600 font-semibold'}>
                                            {p.detectedWilayah.kode} - {p.detectedWilayah.nama}
                                          </strong>
                                        ) : (
                                          <strong className="text-amber-600 dark:text-amber-400 font-semibold">
                                            Di Luar Klaster Dekade (Mencar {formatDistance(p.distanceToCenter)})
                                          </strong>
                                        )}
                                      </p>
                                      {p.isWrongDekade && (
                                        <p className="text-red-600 dark:text-red-400 font-medium text-[10.5px]">
                                          ⚠ Titik fisik berada di dalam klaster {p.detectedWilayah?.nama} (jarak {formatDistance(p.distanceToDetectedCenter)}), terpisah {formatDistance(p.distanceToCenter)} dari klaster {p.wilayahNamaAcuan}!
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Col 3: Informasi Audit & Status */}
                                  <div className="space-y-1.5 p-3 rounded-md bg-card border border-border">
                                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                                      <Info className="w-3.5 h-3.5 text-muted-foreground" />
                                      Data Master &amp; Status
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
                                        <p className="text-red-600 dark:text-red-400">
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

      {/* ── Guidance Card ── */}
      <Card>
        <CardContent className="p-3.5">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-primary" /> Panduan Kesesuaian Dekade:
            </span>
            <Badge variant="destructive" className="font-mono text-[10px]">
              Beda Dekade (Nyasar) — Titik GPS masuk ke dalam klaster dekade lain (rekomendasi: mutasi kode pelanggan)
            </Badge>
            <span className="inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25">
              Titik Mencar — Di luar klaster dekade namun tidak masuk ke klaster dekade lain
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
