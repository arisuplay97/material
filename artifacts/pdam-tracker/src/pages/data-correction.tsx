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

  const wrongDekadePct = stats.totalWithCoords
    ? ((stats.totalWrongDekade / stats.totalWithCoords) * 100).toFixed(1)
    : '0.0';
  const mencarPct = stats.totalWithCoords
    ? ((stats.totalOutliersDistance / stats.totalWithCoords) * 100).toFixed(1)
    : '0.0';

  const renderSparkline = (empty: boolean, variant: 1 | 2 | 3 | 4) => {
    if (empty) {
      return (
        <div className="relative h-[52px] w-full mt-3 select-none">
          <svg viewBox="0 0 280 52" preserveAspectRatio="none" className="w-full h-full">
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

    const line =
      variant % 2 === 1
        ? 'M0,50 L6,26 L12,30 L18,24 L24,50 L30,25 L36,38 L42,27 L48,50 L54,50 L60,24 L66,29 L72,26 L78,31 L84,27 L90,33 L96,28 L102,32 L108,24 L114,30 L120,26 L126,31 L132,50 L138,50 L144,44 L150,50 L156,50 L162,27 L168,26 L174,40 L180,50 L186,42 L192,50 L198,28 L204,44 L210,36 L216,50 L222,31 L228,48 L234,36 L240,29 L246,10 L252,26 L258,24 L264,29 L270,29'
        : 'M0,48 L8,24 L16,28 L24,22 L32,48 L40,25 L48,34 L56,24 L64,48 L72,26 L80,23 L88,28 L96,25 L104,30 L112,24 L120,28 L128,22 L136,27 L144,24 L152,48 L160,42 L168,26 L176,24 L184,36 L192,46 L200,27 L208,38 L216,32 L224,29 L232,42 L240,28 L248,12 L256,24 L264,23 L270,28';
    const area = `${line} L270,52 L0,52 Z`;

    return (
      <div className="relative h-[52px] w-full mt-3 select-none">
        <svg viewBox="0 0 280 52" preserveAspectRatio="none" className="w-full h-full block">
          <path d={area} fill="rgba(19, 104, 246, 0.13)" />
          <path d={line} fill="none" stroke="#1368f6" strokeWidth="1.4" strokeLinejoin="round" />
          <path
            d="M270,28 L275,50 L280,26"
            fill="none"
            stroke="#1368f6"
            strokeWidth="1.4"
            strokeDasharray="2.5 2.5"
          />
        </svg>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1440px] mx-auto text-[#18181b] dark:text-zinc-100">
      {/* ── 1. Cloudflare "Traffic overview" Section Card ── */}
      <div className="rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900">
        {/* Row 1: Title & Actions */}
        <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[16px] font-semibold text-[#18181b] dark:text-zinc-100 tracking-[-0.01em]">
            Koreksi data lokasi
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={outliers.length === 0}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Excel</span>
            </Button>

            <Button
              size="sm"
              onClick={handleExportPdf}
              disabled={outliers.length === 0 || isExportingPdf}
            >
              {isExportingPdf ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              <span>Cetak PDF ({formatNumber(outliers.length)})</span>
            </Button>
          </div>
        </div>

        {/* Row 2: Filter Bar */}
        <div className="px-5 py-3 border-t border-[#e5e7eb] dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#e4e4e7] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[13px] text-[#18181b] dark:text-zinc-100">
              <Filter className="w-3.5 h-3.5 text-[#52525b] dark:text-zinc-400" />
              <span>Filter</span>
            </div>

            <div className="w-[215px]">
              <Select
                value={anomalyCategory}
                onValueChange={(v) => setAnomalyCategory(v as AnomalyCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua anomali</SelectItem>
                  <SelectItem value="wrong_dekade">Beda dekade (nyasar)</SelectItem>
                  <SelectItem value="same_dekade_far">Sesuai dekade tapi mencar</SelectItem>
                  <SelectItem value="estimated_only">Titik estimasi (tanpa GPS)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-[180px]">
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
                  <SelectItem value="all">Semua kecamatan</SelectItem>
                  {KECAMATAN_LIST.map((k) => (
                    <SelectItem key={k.kode} value={k.kode}>
                      {k.kode} — {k.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[185px]">
              <Select value={selectedWilayah} onValueChange={setSelectedWilayah}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua wilayah</SelectItem>
                  {filteredWilayahOptions.map((w) => (
                    <SelectItem key={w.kode} value={w.kode}>
                      {w.kode} — {w.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[300, 500, 1000, 2000].map((preset) => (
              <Button
                key={preset}
                variant={distanceThreshold === preset ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDistanceThreshold(preset)}
              >
                ≥ {formatDistance(preset)}
              </Button>
            ))}
          </div>
        </div>

        {/* Row 3: 4 Cloudflare Sparkline Metric Cards */}
        <div className="px-5 pb-5 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => setAnomalyCategory('all')}
            className="rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900 pt-4 overflow-hidden flex flex-col justify-between cursor-pointer hover:border-[#d4d4d8] transition-colors"
          >
            <div className="px-4">
              <div className="text-[12px] font-normal text-[#71717a] dark:text-zinc-400">
                Pelanggan teranalisis
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[24px] leading-tight font-semibold text-[#18181b] dark:text-zinc-100 tabular-nums tracking-tight">
                  {formatNumber(stats.totalWithCoords)}
                </span>
                <span className="text-[12px] font-normal text-[#71717a] dark:text-zinc-400">
                  ↗ {selectedKecamatan === 'all' ? '13 kecamatan' : `Kec. ${selectedKecamatan}`}
                </span>
              </div>
            </div>
            {renderSparkline(stats.totalWithCoords === 0, 1)}
          </div>

          <div
            onClick={() => setAnomalyCategory('wrong_dekade')}
            className="rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900 pt-4 overflow-hidden flex flex-col justify-between cursor-pointer hover:border-[#d4d4d8] transition-colors"
          >
            <div className="px-4">
              <div className="text-[12px] font-normal text-[#71717a] dark:text-zinc-400">
                Beda dekade (nyasar)
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[24px] leading-tight font-semibold text-[#18181b] dark:text-zinc-100 tabular-nums tracking-tight">
                  {formatNumber(stats.totalWrongDekade)}
                </span>
                {stats.totalWrongDekade > 0 && (
                  <span className="text-[12px] font-normal text-[#71717a] dark:text-zinc-400">
                    ↗ {wrongDekadePct}%
                  </span>
                )}
              </div>
            </div>
            {renderSparkline(stats.totalWrongDekade === 0, 2)}
          </div>

          <div
            onClick={() => setAnomalyCategory('same_dekade_far')}
            className="rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900 pt-4 overflow-hidden flex flex-col justify-between cursor-pointer hover:border-[#d4d4d8] transition-colors"
          >
            <div className="px-4">
              <div className="text-[12px] font-normal text-[#71717a] dark:text-zinc-400">
                Jarak ≥ {formatDistance(distanceThreshold)}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[24px] leading-tight font-semibold text-[#18181b] dark:text-zinc-100 tabular-nums tracking-tight">
                  {formatNumber(stats.totalOutliersDistance)}
                </span>
                {stats.totalOutliersDistance > 0 && (
                  <span className="text-[12px] font-normal text-[#71717a] dark:text-zinc-400">
                    ↗ {mencarPct}%
                  </span>
                )}
              </div>
            </div>
            {renderSparkline(stats.totalOutliersDistance === 0, 3)}
          </div>

          <div
            onClick={() => setAnomalyCategory('estimated_only')}
            className="rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900 pt-4 overflow-hidden flex flex-col justify-between cursor-pointer hover:border-[#d4d4d8] transition-colors"
          >
            <div className="px-4">
              <div className="text-[12px] font-normal text-[#71717a] dark:text-zinc-400">
                Titik estimasi (tanpa GPS)
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[24px] leading-tight font-semibold text-[#18181b] dark:text-zinc-100 tabular-nums tracking-tight">
                  {formatNumber(stats.totalEstimated)}
                </span>
              </div>
            </div>
            {renderSparkline(stats.totalEstimated === 0, 4)}
          </div>
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* ── Left Panel: Threshold & Top Wilayah ── */}
        <Card className="lg:col-span-1 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#e5e7eb] dark:border-zinc-800">
            <h2 className="text-[15px] font-semibold text-[#18181b] dark:text-zinc-100">
              Parameter jarak &amp; wilayah
            </h2>
          </div>
          <CardContent className="p-5 space-y-5">
            {/* Distance Threshold Slider */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] text-[#52525b] dark:text-zinc-300">
                  Batas toleransi jarak
                </span>
                <span className="rounded-full border border-dashed border-[#d4d4d8] dark:border-zinc-700 px-2.5 py-0.5 text-[11.5px] font-medium text-[#18181b] dark:text-zinc-100 tabular-nums">
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
            </div>

            {/* Search Input */}
            <div className="space-y-1.5 pt-3 border-t border-[#e5e7eb] dark:border-zinc-800">
              <span className="text-[12.5px] text-[#52525b] dark:text-zinc-300 block">
                Cari pelanggan
              </span>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kode pelanggan, nama, alamat..."
              />
            </div>

            {/* Per-Wilayah Breakdown */}
            {stats.perWilayah.size > 0 && (
              <div className="space-y-2 pt-3 border-t border-[#e5e7eb] dark:border-zinc-800">
                <div className="flex items-center justify-between text-[12px] text-[#71717a] dark:text-zinc-400">
                  <span>Wilayah anomali tertinggi</span>
                  <span>Salah / Total</span>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-[#e5e7eb] dark:divide-zinc-800 border border-[#e5e7eb] dark:border-zinc-800 rounded-lg">
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
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-[#fafafa] dark:hover:bg-zinc-800/60 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11.5px] text-[#71717a] tabular-nums shrink-0">
                            {kode}
                          </span>
                          <span className="text-[12.5px] text-[#18181b] dark:text-zinc-100 truncate">
                            {info.nama}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 text-[11.5px] tabular-nums">
                          {info.wrongCount > 0 && (
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              {info.wrongCount}
                            </span>
                          )}
                          <span className="text-[#71717a]">/ {info.count}</span>
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
          <div className="px-5 py-3.5 border-b border-[#e5e7eb] dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[15px] font-semibold text-[#18181b] dark:text-zinc-100">
                Daftar analisis lokasi &amp; kesesuaian dekade
              </h2>
              <span className="rounded-full border border-dashed border-[#d4d4d8] dark:border-zinc-700 px-2.5 py-0.5 text-[11px] font-medium text-[#52525b] dark:text-zinc-300 tabular-nums">
                {formatNumber(outliers.length)}
              </span>
            </div>
            <span className="text-[12px] text-[#71717a] dark:text-zinc-400">
              Perbandingan dekade terdaftar vs dekade terdeteksi GPS
            </span>
          </div>

          <CardContent className="p-0">
            {outliers.length === 0 ? (
              <div className="py-16 text-center space-y-1.5 text-[#71717a]">
                <p className="text-[14px] font-medium text-[#18181b] dark:text-zinc-100">
                  Tidak ada anomali ditemukan
                </p>
                <p className="text-[12.5px] max-w-md mx-auto">
                  Semua titik pelanggan pada filter ini berada dalam dekade yang sesuai dan dalam batas jarak toleransi.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px] border-collapse">
                  <thead>
                    <tr className="bg-[#fafafa] dark:bg-zinc-900/50 border-b border-[#e5e7eb] dark:border-zinc-800 text-[12px] text-[#71717a] dark:text-zinc-400">
                      <th className="py-2.5 px-4 w-10 font-medium">#</th>
                      <th
                        className="py-2.5 px-3 font-medium cursor-pointer hover:text-[#18181b] transition-colors"
                        onClick={() => toggleSort('kode')}
                      >
                        <span className="flex items-center gap-1">
                          Kode pelanggan <SortIcon field="kode" />
                        </span>
                      </th>
                      <th
                        className="py-2.5 px-3 font-medium cursor-pointer hover:text-[#18181b] transition-colors"
                        onClick={() => toggleSort('nama')}
                      >
                        <span className="flex items-center gap-1">
                          Nama &amp; alamat <SortIcon field="nama" />
                        </span>
                      </th>
                      <th
                        className="py-2.5 px-3 font-medium cursor-pointer hover:text-[#18181b] transition-colors"
                        onClick={() => toggleSort('wilayah')}
                      >
                        <span className="flex items-center gap-1">
                          Dekade terdaftar <SortIcon field="wilayah" />
                        </span>
                      </th>
                      <th className="py-2.5 px-3 font-medium">
                        Dekade terdeteksi (GPS)
                      </th>
                      <th
                        className="py-2.5 px-3 font-medium cursor-pointer hover:text-[#18181b] transition-colors text-center"
                        onClick={() => toggleSort('kesesuaian')}
                      >
                        <span className="flex items-center justify-center gap-1">
                          Kesesuaian <SortIcon field="kesesuaian" />
                        </span>
                      </th>
                      <th
                        className="py-2.5 px-3 font-medium cursor-pointer hover:text-[#18181b] transition-colors text-right"
                        onClick={() => toggleSort('distance')}
                      >
                        <span className="flex items-center justify-end gap-1">
                          Jarak <SortIcon field="distance" />
                        </span>
                      </th>
                      <th className="py-2.5 px-4 font-medium text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e7eb] dark:divide-zinc-800">
                    {outliers.slice(0, 200).map((p, idx) => {
                      const isExpanded = expandedRow === p.kode_pelanggan;

                      return (
                        <React.Fragment key={p.kode_pelanggan}>
                          <tr className="hover:bg-[#fafafa] dark:hover:bg-zinc-800/50 transition-colors">
                            <td className="py-3 px-4 text-[#71717a] text-[12px] tabular-nums">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-3 font-medium text-[#18181b] dark:text-zinc-100 tabular-nums">
                              {p.kode_pelanggan}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-col">
                                <span className="text-[#18181b] dark:text-zinc-100 truncate max-w-[170px]">
                                  {p.nama_pelanggan}
                                </span>
                                <span className="text-[11.5px] text-[#71717a] truncate max-w-[170px]">
                                  {p.alamat || '-'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[12px] text-[#71717a] tabular-nums">
                                  {p.kode_wilayah}
                                </span>
                                <span className="text-[12.5px] text-[#18181b] dark:text-zinc-200">
                                  {p.wilayahNamaAcuan}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              {p.detectedWilayah ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[12px] text-[#71717a] tabular-nums">
                                    {p.detectedWilayah.kode}
                                  </span>
                                  <span className="text-[12.5px] font-medium text-[#18181b] dark:text-zinc-100">
                                    {p.detectedWilayah.nama}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[#71717a] text-[12px]">
                                  Di luar klaster dekade
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {p.isWrongDekade ? (
                                <span className="inline-flex items-center rounded-full border border-dashed border-red-300 dark:border-red-800 bg-red-50/60 dark:bg-red-950/30 px-2.5 py-0.5 text-[11px] font-medium text-red-700 dark:text-red-300">
                                  Beda dekade
                                </span>
                              ) : isPointMencar(p) ? (
                                <span className="inline-flex items-center rounded-full border border-dashed border-[#d4d4d8] dark:border-zinc-700 bg-[#fafafa] dark:bg-zinc-800 px-2.5 py-0.5 text-[11px] text-[#52525b] dark:text-zinc-300">
                                  Titik mencar
                                </span>
                              ) : (
                                <span className="text-[12px] text-[#71717a]">
                                  Sesuai
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right tabular-nums font-medium text-[#18181b] dark:text-zinc-100">
                              {formatDistance(p.distanceToCenter)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setExpandedRow(isExpanded ? null : p.kode_pelanggan)
                                  }
                                  className="h-7 px-2.5 text-[12px]"
                                >
                                  Detail
                                </Button>
                                <a
                                  href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-[#e4e4e7] dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-[#f4f4f5] dark:hover:bg-zinc-800 text-[12px] text-[#18181b] dark:text-zinc-100 transition-colors"
                                >
                                  <span>Maps</span>
                                  <ExternalLink className="w-3 h-3 text-[#71717a]" />
                                </a>
                              </div>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-[#fafafa] dark:bg-zinc-900/40 border-y border-[#e5e7eb] dark:border-zinc-800">
                              <td colSpan={8} className="px-5 py-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12.5px]">
                                  <div className="space-y-1 p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-[#e5e7eb] dark:border-zinc-800">
                                    <p className="font-semibold text-[#18181b] dark:text-zinc-100">
                                      Titik GPS pelanggan
                                    </p>
                                    <p className="text-[#71717a] tabular-nums">
                                      {p.latitude.toFixed(6)}, {p.longitude.toFixed(6)}
                                    </p>
                                    <a
                                      href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[#1368f6] hover:underline font-medium text-[12px] pt-1"
                                    >
                                      Buka di Google Maps <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>

                                  <div className="space-y-1 p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-[#e5e7eb] dark:border-zinc-800">
                                    <p className="font-semibold text-[#18181b] dark:text-zinc-100">
                                      Perbandingan dekade &amp; klaster
                                    </p>
                                    <p className="text-[#71717a]">
                                      Terdaftar: <strong className="text-[#18181b] dark:text-zinc-100">{p.kode_wilayah} — {p.wilayahNamaAcuan}</strong>
                                    </p>
                                    <p className="text-[#71717a]">
                                      Terdeteksi:{' '}
                                      {p.detectedWilayah ? (
                                        <strong className="text-[#18181b] dark:text-zinc-100">
                                          {p.detectedWilayah.kode} — {p.detectedWilayah.nama}
                                        </strong>
                                      ) : (
                                        <span>Di luar klaster ({formatDistance(p.distanceToCenter)})</span>
                                      )}
                                    </p>
                                  </div>

                                  <div className="space-y-1 p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-[#e5e7eb] dark:border-zinc-800">
                                    <p className="font-semibold text-[#18181b] dark:text-zinc-100">
                                      Data master &amp; status
                                    </p>
                                    <p className="text-[#71717a]">
                                      Kecamatan: <span className="text-[#18181b] dark:text-zinc-100">{kecamatanName(p.kode_kecamatan)} ({p.kode_kecamatan})</span>
                                    </p>
                                    <p className="text-[#71717a]">
                                      Golongan / Status: <span className="text-[#18181b] dark:text-zinc-100">{p.golongan} — {p.status_sambungan}</span>
                                    </p>
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
                  <div className="py-3 px-5 text-center text-[12.5px] text-[#71717a] border-t border-[#e5e7eb] dark:border-zinc-800">
                    Menampilkan 200 baris pertama dari total {formatNumber(outliers.length)} baris anomali.
                    Gunakan tombol <strong>Cetak PDF</strong> atau <strong>Ekspor Excel</strong> untuk mengunduh seluruh baris.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
