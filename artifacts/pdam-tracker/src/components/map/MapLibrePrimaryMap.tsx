import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Pelanggan, WilayahAcuan, UserRole } from '@/types/pdam';
import { KECAMATAN_BOUNDS, KECAMATAN_LIST } from '@/services/pdamDataService';
import { escapeHtml, safeColor } from '@/lib/escape';
import { displayName, displayAddress } from '@/lib/privacy';
import { futuristicMapStyle } from '@/lib/futuristicMapStyle';
import { futuristicLightMapStyle } from '@/lib/futuristicLightMapStyle';
import { lombokTengahStyle } from '@/lib/lombokTengahStyle';

const EMPTY_FEATURE_COLLECTION = {
  type: 'FeatureCollection' as const,
  features: [],
};

export interface MapPerformanceMetrics {
  engine: 'MapLibre GL (WebGL GPU)' | 'Leaflet (Canvas/DOM)';
  renderTimeMs: number;
  filterTimeMs: number;
  fps: number;
  activePoints: number;
  totalPoints: number;
  webglPayloadKb: number;
  fullPayloadKb: number;
  memorySavedPct: number;
}

export interface MapLibrePrimaryMapProps {
  allCustomers: Pelanggan[];
  filteredCustomers: Pelanggan[];
  wilayahMap: Map<string, WilayahAcuan>;
  displayedWilayahList: WilayahAcuan[];
  selectedKecamatan: string;
  filters: {
    wilayah: string;
    golongan: string;
    status: string;
    quality: string;
  };
  onlyAnomaly: boolean;
  userRole?: UserRole;
  basemapKey: string;
  useCluster: boolean;
  colorBy: 'wilayah' | 'status';
  isTilted: boolean;
  showCustomerPoints: boolean;
  showBoundaries: boolean;
  qgisLayerActive: boolean;
  qgisData: any;
  hiddenLayers: Set<string>;
  layerColors: Record<string, string>;
  targetPoint: [number, number] | null;
  targetZoom: number;
  pulsePosition: [number, number] | null;
  pulseActive: boolean;
  selectedCustomer: Pelanggan | null;
  onSelectCustomer: (c: Pelanggan) => void;
  onMetricsUpdate?: (metrics: MapPerformanceMetrics) => void;
  getFeatureLayerKey: (feature: any) => string;
}

// Strict boundary for Pulau Lombok, NTB in MapLibre [ [west, south], [east, north] ] ([lng, lat])
const LOMBOK_ML_BOUNDS: [[number, number], [number, number]] = [
  [115.82, -9.12], // Barat Daya [lng, lat]
  [116.75, -8.18], // Timur Laut [lng, lat]
];

const DEFAULT_CENTER_LNGLAT: [number, number] = [116.2051, -8.7892]; // Praya Barat [lng, lat]

/**
 * Konversi aman dari standar aplikasi [lat, lng] ke standar MapLibre GeoJSON [lng, lat].
 * Dilengkapi auto-guard: jika lat/lng tidak sengaja tertukar (misal lat = 116.2, lng = -8.7),
 * fungsi ini otomatis mendeteksi dan memperbaiki urutannya menjadi [lng, lat].
 */
export function toMapLibreLngLat(lat: number, lng: number): [number, number] | null {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return null;
  }
  if (lat === 0 && lng === 0) {
    return null;
  }
  // Auto-guard: Latitude valid bumi adalah [-90, 90]. Pulau Lombok berada di lat ~ -8.7, lng ~ 116.2.
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
    return [Number(lat.toFixed(6)), Number(lng.toFixed(6))];
  }
  return [Number(lng.toFixed(6)), Number(lat.toFixed(6))];
}

// Helper cerdas pendeteksi alias nama kolom QGIS
function getProp(props: any, keys: string[]): any {
  if (!props || typeof props !== 'object') return undefined;
  for (const k of keys) {
    if (props[k] !== undefined && props[k] !== null && props[k] !== '') return props[k];
    const lower = k.toLowerCase();
    for (const pKey of Object.keys(props)) {
      if (pKey.toLowerCase() === lower && props[pKey] !== undefined && props[pKey] !== null && props[pKey] !== '') {
        return props[pKey];
      }
    }
  }
  return undefined;
}

function parseAccessoryDiameter(props: Record<string, any>): number | null {
  const directVal = getProp(props, [
    'diameter_mm', 'diameter', 'dimensi', 'dimensi_av',
    'dia', 'dn', 'ukuran', 'size', 'dim', 'd_mm', 'd',
  ]);
  if (directVal !== undefined && directVal !== null && directVal !== '') {
    const raw = String(directVal).replace(/[^\d.]/g, '');
    const num = parseFloat(raw);
    if (!isNaN(num) && num > 0) {
      if (num <= 24 && (String(directVal).includes('"') || String(directVal).toLowerCase().includes('in') || num <= 12)) {
        return Math.round(num * 25.4);
      }
      return num;
    }
  }
  const textVal = String(props.nama || props.jns_valve || props.jenis || props.keterangan || props.nama_aksesoris || '');
  const match = textVal.match(/(?:DN|Ø|DIA|DIAMETER)?\s*(\d{2,4})\s*(?:mm|"|”)?/i);
  if (match && match[1]) {
    const num = parseFloat(match[1]);
    if (!isNaN(num) && num >= 15 && num <= 2500) return num;
  }
  return null;
}

function getAccessoryMeta(props: Record<string, any>) {
  const text = (
    String(props.kategori || '') + ' ' +
    String(props.tipe || '') + ' ' +
    String(props.type || '') + ' ' +
    String(props.nama || '') + ' ' +
    String(props.nama_aksesoris || '') + ' ' +
    String(props.jns_valve || '') + ' ' +
    String(props.jenis || '')
  ).toLowerCase();

  if (text.includes('airvalve') || text.includes('air valve') || text.includes('pelepas udara') || text.includes('udara')) {
    return { color: '#0284C7', label: 'Air Valve', category: 'airvalve' };
  }
  if (text.includes('washout') || text.includes('penguras') || text.includes('blow off') || text.includes('wash out')) {
    return { color: '#7C3AED', label: 'Washout (Penguras)', category: 'washout' };
  }
  if (text.includes('reservoir') || text.includes('bak penampung') || text.includes('tandon')) {
    return { color: '#059669', label: 'Reservoir Air', category: 'reservoir' };
  }
  if (text.includes('ipa') || text.includes('wtp') || text.includes('pengolahan')) {
    return { color: '#4F46E5', label: 'IPA (Pengolahan)', category: 'ipa' };
  }
  if (text.includes('manometer') || text.includes('tekanan') || text.includes('pressure')) {
    return { color: '#E11D48', label: 'Manometer', category: 'manometer' };
  }
  if (text.includes('bpt') || text.includes('pelepas tekan')) {
    return { color: '#0D9488', label: 'Bak Pelepas Tekan (BPT)', category: 'bpt' };
  }
  if (text.includes('dop') || text.includes('end cap') || text.includes('tutup')) {
    return { color: '#475569', label: 'End Cap (Dop)', category: 'dop' };
  }
  return { color: '#D97706', label: 'Katup Valve (Gate)', category: 'valve' };
}

function getValveRadii(diameterMm: number | null): { outerR: number; innerR: number } {
  if (diameterMm === null) return { outerR: 5, innerR: 1.5 };
  if (diameterMm <= 50) return { outerR: 4, innerR: 1 };
  if (diameterMm <= 80) return { outerR: 5, innerR: 1.5 };
  if (diameterMm <= 115) return { outerR: 6, innerR: 2 };
  if (diameterMm <= 165) return { outerR: 7, innerR: 2.5 };
  if (diameterMm <= 225) return { outerR: 8, innerR: 3 };
  return { outerR: 9, innerR: 3.5 };
}

/**
 * Buat style MapLibre GL untuk basemap raster (Esri Light, OSM, HOT Cerah, Citra Satelit Esri)
 * dilengkapi glyphs font OpenFreeMap agar label klaster dan batas wilayah tampil tajam.
 */
function createRasterBasemapStyle(basemapKey: string): maplibregl.StyleSpecification {
  let tiles: string[] = [
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  ];
  let attribution = 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ';
  let bgColor = '#e2e8f0';

  if (basemapKey === 'cerah') {
    tiles = [
      'https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
      'https://b.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    ];
    attribution = '&copy; OpenStreetMap contributors, Humanitarian OpenStreetMap Team';
    bgColor = '#f8fafc';
  } else if (basemapKey === 'osm') {
    tiles = ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'];
    attribution = '&copy; OpenStreetMap contributors';
    bgColor = '#f1f5f9';
  } else if (basemapKey === 'satellite') {
    tiles = [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ];
    attribution = 'Tiles &copy; Esri &mdash; Source: Esri, Maxar';
    bgColor = '#0f172a';
  }

  return {
    version: 8,
    name: `PDAM Raster (${basemapKey})`,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      'raster-tiles': {
        type: 'raster',
        tiles,
        tileSize: 256,
        attribution,
        maxzoom: 19,
      },
    },
    layers: [
      {
        id: 'pdam-raster-bg',
        type: 'background',
        paint: { 'background-color': bgColor },
      },
      {
        id: 'pdam-raster-layer',
        type: 'raster',
        source: 'raster-tiles',
        minzoom: 0,
        maxzoom: 20,
      },
    ],
  };
}

/**
 * Resolve style objek atau URL untuk basemap yang dipilih secara sinkron (0ms delay)
 */
function resolveMapStyleSync(basemapKey: string): string | maplibregl.StyleSpecification {
  if (basemapKey === 'futuristik') {
    return futuristicMapStyle as maplibregl.StyleSpecification;
  }
  if (basemapKey === 'futuristik_light') {
    return futuristicLightMapStyle as maplibregl.StyleSpecification;
  }
  if (basemapKey === 'vektor') {
    return lombokTengahStyle as maplibregl.StyleSpecification;
  }
  if (basemapKey === 'dark') {
    return 'https://tiles.openfreemap.org/styles/dark';
  }
  if (basemapKey === 'positron') {
    return 'https://tiles.openfreemap.org/styles/positron';
  }
  return createRasterBasemapStyle(basemapKey);
}

/**
 * Susun ekspresi filter native GPU MapLibre (`map.setFilter`)
 * untuk memfilter puluhan ribu titik secara instan di GPU (0ms CPU loop).
 */
function buildCustomerFilterExpression(
  selectedKecamatan: string,
  filters: { wilayah: string; golongan: string; status: string; quality: string },
  onlyAnomaly: boolean
): any[] | null {
  const expr: any[] = ['all'];

  if (selectedKecamatan !== 'all') {
    expr.push(['==', ['get', 'k'], selectedKecamatan]);
  }

  if (filters.wilayah && filters.wilayah !== 'all') {
    const allowed = filters.wilayah
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (allowed.length === 1) {
      expr.push(['==', ['get', 'w'], allowed[0]]);
    } else if (allowed.length > 1) {
      expr.push(['in', ['get', 'w'], ['literal', allowed]]);
    }
  }

  if (filters.golongan && filters.golongan !== 'all') {
    expr.push(['==', ['get', 'g'], filters.golongan]);
  }

  if (filters.status && filters.status !== 'all') {
    expr.push(['==', ['get', 's'], filters.status]);
  }

  if (filters.quality === 'flagged') {
    expr.push(['==', ['get', 'f'], 1]);
  } else if (filters.quality === 'valid') {
    expr.push(['==', ['get', 'f'], 0]);
  }

  if (filters.quality === 'anomaly' || onlyAnomaly) {
    expr.push(['==', ['get', 'a'], 1]);
  }

  if (filters.quality === 'colocation') {
    expr.push(['==', ['get', 'c'], 1]);
  }

  // Jika tidak ada filter aktif, kembalikan null agar MapLibre merender seluruh titik tanpa evaluasi filter
  if (expr.length === 1) {
    return null;
  }

  return expr;
}

export default function MapLibrePrimaryMap({
  allCustomers,
  filteredCustomers,
  wilayahMap,
  displayedWilayahList,
  selectedKecamatan,
  filters,
  onlyAnomaly,
  userRole,
  basemapKey,
  useCluster,
  colorBy,
  isTilted,
  showCustomerPoints,
  showBoundaries,
  qgisLayerActive,
  qgisData,
  hiddenLayers,
  layerColors,
  targetPoint,
  targetZoom,
  pulsePosition,
  pulseActive,
  selectedCustomer,
  onSelectCustomer,
  onMetricsUpdate,
  getFeatureLayerKey,
}: MapLibrePrimaryMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const styleReadyRef = useRef<boolean>(false);
  const currentBasemapRef = useRef<string>(basemapKey);

  // Popups & Markers
  const clickPopupRef = useRef<maplibregl.Popup | null>(null);
  const hoverTooltipRef = useRef<maplibregl.Popup | null>(null);
  const pulseMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Telemetry refs
  const fpsRef = useRef<number>(60);
  const lastRenderMsRef = useRef<number>(0);
  const lastFilterMsRef = useRef<number>(0);

  // O(1) Lookup Map dari kode_pelanggan -> Objek Pelanggan Lengkap
  // Sehingga GeoJSON yang dikirim ke WebGL tidak perlu membawa nama/alamat/nomor_meter panjang!
  const customerLookupRef = useRef<Map<string, Pelanggan>>(new Map());
  useEffect(() => {
    const m = new Map<string, Pelanggan>();
    for (const c of allCustomers) {
      m.set(c.kode_pelanggan, c);
    }
    customerLookupRef.current = m;
  }, [allCustomers]);

  const wilayahMapRef = useRef(wilayahMap);
  useEffect(() => {
    wilayahMapRef.current = wilayahMap;
  }, [wilayahMap]);

  const onSelectRef = useRef(onSelectCustomer);
  useEffect(() => {
    onSelectRef.current = onSelectCustomer;
  }, [onSelectCustomer]);

  const userRoleRef = useRef(userRole);
  useEffect(() => {
    userRoleRef.current = userRole;
  }, [userRole]);

  // Generator HTML Popup Pelanggan (dievaluasi malas hanya saat titik diklik)
  const buildCustomerPopupHtml = useCallback((c: Pelanggan, color: string) => {
    const role = userRoleRef.current;
    const safeCode = escapeHtml(c.kode_pelanggan);
    const safeGol = escapeHtml(c.golongan);
    const safeName = escapeHtml(displayName(c.nama_pelanggan, role));
    const safeAlamat = escapeHtml(displayAddress(c.alamat, role));
    const safeWilayah = escapeHtml(c.nama_wilayah);
    const safeStatus = escapeHtml(c.status_sambungan);
    const safeAnomaly = c.spatial_anomaly ? escapeHtml(c.spatial_anomaly) : '';
    const safeColocation = c.colocation_anomaly ? escapeHtml(c.colocation_anomaly) : '';

    return `
      <div style="width: 255px; font-family: 'Inter', system-ui, sans-serif; padding: 11px; line-height: 1.4;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(148, 163, 184, 0.22); padding-bottom: 6px; margin-bottom: 6px; padding-right: 14px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${color};"></span>
            <span style="font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 13px;">${safeCode}</span>
          </div>
          <span style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: rgba(59, 110, 168, 0.14); color: #3B6EA8;">${safeGol}</span>
        </div>

        <div style="font-size: 13px; font-weight: 600; margin-bottom: 2px;">${safeName}</div>
        <div style="font-size: 11px; color: #64748b; margin-bottom: 6px; line-height: 1.35;">${safeAlamat}</div>

        ${c.spatial_anomaly
        ? `
          <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 6px 8px; margin-bottom: 6px; font-size: 10px; color: #ef4444;">
            <strong>⚠️ Anomali Batas:</strong> ${safeAnomaly}
          </div>
        `
        : ''
      }
        ${c.colocation_anomaly
        ? `
          <div style="background: rgba(168, 85, 247, 0.12); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 6px; padding: 6px 8px; margin-bottom: 6px; font-size: 10px; color: #a855f7;">
            <strong>📍 Titik Dobel Beda Wilayah:</strong> ${safeColocation}
          </div>
        `
        : ''
      }

        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #64748b; margin-bottom: 8px;">
          <span>Status: <strong>${safeStatus}</strong></span>
          <span>Wilayah: <strong>${safeWilayah}</strong></span>
        </div>

        <button id="ml-btn-popup-${safeCode}" style="width: 100%; border: none; padding: 7px 10px; font-size: 11px; font-weight: 600; border-radius: 6px; background: #3B6EA8; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
          Lihat Detail & Titik GIS
        </button>
      </div>
    `;
  }, []);

  // ── 1. Bangun GeoJSON Ringan (Hanya Properti yang Dibutuhkan Peta) ──
  const { allCustomerGeoJson, payloadMetrics } = useMemo(() => {
    const t0 = performance.now();
    const features: any[] = [];

    for (const c of allCustomers) {
      const lngLat = toMapLibreLngLat(c.latitude, c.longitude);
      if (!lngLat) continue;

      const wilayah = wilayahMap.get(c.kode_wilayah);
      const col = safeColor(wilayah?.warna, '#3B6EA8');

      // HANYA kirim properti minimal ke WebGL worker agar memori super ringan!
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: lngLat, // [lng, lat]
        },
        properties: {
          id: c.kode_pelanggan,
          k: c.kode_kecamatan || '07',
          w: c.kode_wilayah || '',
          g: c.golongan || 'R1',
          s: c.status_sambungan || 'Aktif',
          f: c.is_flagged ? 1 : 0,
          a: c.spatial_anomaly ? 1 : 0,
          c: c.colocation_anomaly ? 1 : 0,
          col,
        },
      });
    }

    const collection = {
      type: 'FeatureCollection' as const,
      features,
    };

    const elapsed = performance.now() - t0;
    lastRenderMsRef.current = Math.round(elapsed * 10) / 10;

    // Estimasi ukuran payload ringan vs ukuran objek penuh
    const sampleSlimBytes = features.length * 115;
    const sampleFullBytes = allCustomers.length * 540;
    const webglPayloadKb = Math.round((sampleSlimBytes / 1024) * 10) / 10;
    const fullPayloadKb = Math.round((sampleFullBytes / 1024) * 10) / 10;
    const memorySavedPct =
      sampleFullBytes > 0 ? Math.round(((sampleFullBytes - sampleSlimBytes) / sampleFullBytes) * 100) : 78;

    return {
      allCustomerGeoJson: collection,
      payloadMetrics: { webglPayloadKb, fullPayloadKb, memorySavedPct },
    };
  }, [allCustomers, wilayahMap]);

  // ── 2. Bangun GeoJSON Terfilter HANYA Saat Mode Klaster Aktif (Hemat CPU/Worker Saat Mode Sebaran) ──
  const filteredCustomerGeoJson = useMemo(() => {
    if (!useCluster) {
      return EMPTY_FEATURE_COLLECTION;
    }
    const features: any[] = [];
    for (const c of filteredCustomers) {
      const lngLat = toMapLibreLngLat(c.latitude, c.longitude);
      if (!lngLat) continue;
      const wilayah = wilayahMap.get(c.kode_wilayah);
      const col = safeColor(wilayah?.warna, '#3B6EA8');

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: lngLat,
        },
        properties: {
          id: c.kode_pelanggan,
          s: c.status_sambungan || 'Aktif',
          a: c.spatial_anomaly ? 1 : 0,
          c: c.colocation_anomaly ? 1 : 0,
          col,
        },
      });
    }
    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [useCluster, filteredCustomers, wilayahMap]);

  // ── 3. Bangun GeoJSON Batas Wilayah Kecamatan, Zona DMA & Titik Pusat Dekade ──
  const { boundariesGeoJson, centroidsGeoJson } = useMemo(() => {
    const polyFeatures: any[] = [];
    const pointFeatures: any[] = [];

    // Poligon Batas Kecamatan (KECAMATAN_BOUNDS)
    for (const kec of KECAMATAN_LIST) {
      if (selectedKecamatan !== 'all' && kec.kode !== selectedKecamatan) continue;
      const b = KECAMATAN_BOUNDS[kec.kode];
      if (!b) continue;

      polyFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [b.minLng, b.minLat],
              [b.maxLng, b.minLat],
              [b.maxLng, b.maxLat],
              [b.minLng, b.maxLat],
              [b.minLng, b.minLat],
            ],
          ],
        },
        properties: {
          kode: kec.kode,
          nama: `Kec. ${kec.nama} (${kec.kode})`,
          color: selectedKecamatan === kec.kode ? '#0284C7' : '#64748B',
          isSelected: selectedKecamatan === kec.kode ? 1 : 0,
        },
      });
    }

    // Tambahkan poligon DMA dari qgisData jika ada
    if (qgisData && Array.isArray(qgisData.features)) {
      for (const f of qgisData.features) {
        const gt = f?.geometry?.type;
        if (gt === 'Polygon' || gt === 'MultiPolygon') {
          polyFeatures.push({
            type: 'Feature',
            geometry: f.geometry,
            properties: {
              kode: f.properties?.kode || 'DMA',
              nama: f.properties?.nama_zona || f.properties?.nama || 'Zona DMA',
              color: '#059669',
              isSelected: 1,
            },
          });
        }
      }
    }

    // Titik Pusat (Centroid) Dekade Wilayah
    for (const w of displayedWilayahList) {
      const lngLat = toMapLibreLngLat(w.centerLat, w.centerLng);
      if (!lngLat) continue;
      pointFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: lngLat,
        },
        properties: {
          kode: w.kode,
          nama: `${w.kode} • ${w.nama}`,
          color: safeColor(w.warna, '#3B6EA8'),
        },
      });
    }

    return {
      boundariesGeoJson: { type: 'FeatureCollection' as const, features: polyFeatures },
      centroidsGeoJson: { type: 'FeatureCollection' as const, features: pointFeatures },
    };
  }, [selectedKecamatan, displayedWilayahList, qgisData]);

  // ── 4. Bangun GeoJSON Jaringan Pipa & Aksesoris (QGIS) ──
  const { qgisPipesGeoJson, qgisValvesGeoJson } = useMemo(() => {
    const pipeFeatures: any[] = [];
    const valveFeatures: any[] = [];

    if (qgisData && Array.isArray(qgisData.features)) {
      for (let idx = 0; idx < qgisData.features.length; idx++) {
        const f = qgisData.features[idx];
        const geomType = f?.geometry?.type;
        if (!geomType) continue;

        const props = f.properties || {};
        const layerKey = getFeatureLayerKey(f);
        const customColor = layerColors?.[layerKey];

        if (geomType === 'LineString' || geomType === 'MultiLineString') {
          const rawKat = getProp(props, ['kategori', 'category', 'fungsi', 'jenis', 'kelas', 'type']) || '';
          const kategori = String(rawKat).toLowerCase();
          const rawDiam =
            getProp(props, ['diameter_mm', 'diameter', 'diam', 'dia', 'dn', 'ukuran', 'd_mm', 'size', 'dim']) || 100;
          const diam = Number(String(rawDiam).replace(/[^\d.-]/g, '')) || 100;

          let color = customColor || '#2563EB';
          let weight = 3.5;

          if (!customColor) {
            if (kategori.includes('transmisi') || diam >= 200) {
              color = '#E11D48';
              weight = 4.5;
            } else if (kategori.includes('retikulasi') || diam <= 90) {
              color = '#0284C7';
              weight = 2.5;
            }
          } else {
            if (kategori.includes('transmisi') || diam >= 200) weight = 4.5;
            else if (kategori.includes('retikulasi') || diam <= 90) weight = 2.5;
          }

          pipeFeatures.push({
            type: 'Feature',
            geometry: f.geometry,
            properties: {
              ...props,
              _idx: idx,
              _layerKey: layerKey,
              _color: color,
              _weight: weight,
            },
          });
        } else if (geomType === 'Point') {
          const diam = parseAccessoryDiameter(props);
          const meta = getAccessoryMeta(props);
          const markerColor = customColor || meta.color;
          const { outerR, innerR } = getValveRadii(diam);

          valveFeatures.push({
            type: 'Feature',
            geometry: f.geometry,
            properties: {
              ...props,
              _idx: idx,
              _layerKey: layerKey,
              _color: markerColor,
              _outerR: outerR,
              _innerR: innerR,
              _hasDot: outerR >= 6.5 ? 1 : 0,
              _metaLabel: meta.label,
              _diam: diam || 0,
            },
          });
        }
      }
    }

    return {
      qgisPipesGeoJson: { type: 'FeatureCollection' as const, features: pipeFeatures },
      qgisValvesGeoJson: { type: 'FeatureCollection' as const, features: valveFeatures },
    };
  }, [qgisData, layerColors, getFeatureLayerKey]);

  // Refs untuk akses data terkini saat event style.load terjadi
  const latestDataRef = useRef({
    allCustomerGeoJson,
    filteredCustomerGeoJson,
    boundariesGeoJson,
    centroidsGeoJson,
    qgisPipesGeoJson,
    qgisValvesGeoJson,
    selectedKecamatan,
    filters,
    onlyAnomaly,
    useCluster,
    colorBy,
    showCustomerPoints,
    showBoundaries,
    qgisLayerActive,
    hiddenLayers,
  });

  useEffect(() => {
    latestDataRef.current = {
      allCustomerGeoJson,
      filteredCustomerGeoJson,
      boundariesGeoJson,
      centroidsGeoJson,
      qgisPipesGeoJson,
      qgisValvesGeoJson,
      selectedKecamatan,
      filters,
      onlyAnomaly,
      useCluster,
      colorBy,
      showCustomerPoints,
      showBoundaries,
      qgisLayerActive,
      hiddenLayers,
    };
  });

  // Ekspresi warna titik pelanggan: mendukung match berdasarkan status_sambungan atau warna wilayah
  const getCircleColorExpr = useCallback((mode: 'wilayah' | 'status'): any => {
    if (mode === 'status') {
      return [
        'match',
        ['get', 's'],
        'Aktif',
        '#10B981', // Hijau Emerald
        'Nonaktif',
        '#F59E0B', // Kuning Amber
        'Putus',
        '#EF4444', // Merah Rose
        '#3B6EA8', // Default Biru PDAM
      ];
    }
    return ['coalesce', ['get', 'col'], '#3B6EA8'];
  }, []);

  // Garis pinggir (stroke) titik pelanggan: putih bersih (#FFFFFF) persis seperti tampilan asli
  const getCircleStrokeColorExpr = useCallback((): any => {
    return '#FFFFFF';
  }, []);

  // ── Fungsi Pemasang Seluruh Source & Layer GIS di atas Style MapLibre ──
  const setupGisLayersOnStyle = useCallback(
    (map: maplibregl.Map) => {
      const state = latestDataRef.current;

      // 1. SOURCE & LAYER: BATAS WILAYAH KECAMATAN & DEKADE
      if (!map.getSource('pdam-boundaries-source')) {
        map.addSource('pdam-boundaries-source', {
          type: 'geojson',
          data: state.boundariesGeoJson as any,
        });
      }
      if (!map.getLayer('pdam-boundaries-fill')) {
        map.addLayer({
          id: 'pdam-boundaries-fill',
          type: 'fill',
          source: 'pdam-boundaries-source',
          layout: {
            visibility: state.showBoundaries ? 'visible' : 'none',
          },
          paint: {
            'fill-color': ['coalesce', ['get', 'color'], '#0284C7'],
            'fill-opacity': ['case', ['==', ['get', 'isSelected'], 1], 0.07, 0.025],
          },
        });
      }
      if (!map.getLayer('pdam-boundaries-line')) {
        map.addLayer({
          id: 'pdam-boundaries-line',
          type: 'line',
          source: 'pdam-boundaries-source',
          layout: {
            visibility: state.showBoundaries ? 'visible' : 'none',
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': ['coalesce', ['get', 'color'], '#0284C7'],
            'line-width': ['case', ['==', ['get', 'isSelected'], 1], 2, 1.2],
            'line-dasharray': [4, 3],
            'line-opacity': 0.75,
          },
        });
      }

      if (!map.getSource('pdam-centroids-source')) {
        map.addSource('pdam-centroids-source', {
          type: 'geojson',
          data: state.centroidsGeoJson as any,
        });
      }
      if (!map.getLayer('pdam-centroids-label')) {
        map.addLayer({
          id: 'pdam-centroids-label',
          type: 'symbol',
          source: 'pdam-centroids-source',
          minzoom: 12,
          layout: {
            visibility: state.showBoundaries ? 'visible' : 'none',
            'text-field': ['get', 'nama'],
            'text-font': ['Noto Sans Bold'],
            'text-size': 10,
            'text-offset': [0, 0.8],
            'text-anchor': 'top',
          },
          paint: {
            'text-color': ['coalesce', ['get', 'color'], '#1e293b'],
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.8,
          },
        });
      }

      // 2. SOURCE & LAYER: JARINGAN PIPA & AKSESORIS (QGIS)
      const hiddenArr = Array.from(state.hiddenLayers);
      const qgisFilterExpr: any =
        hiddenArr.length > 0 ? ['!', ['in', ['get', '_layerKey'], ['literal', hiddenArr]]] : null;
      const valveInnerFilterExpr: any =
        hiddenArr.length > 0
          ? ['all', ['!', ['in', ['get', '_layerKey'], ['literal', hiddenArr]]], ['==', ['get', '_hasDot'], 1]]
          : ['==', ['get', '_hasDot'], 1];

      if (!map.getSource('pdam-qgis-pipes-source')) {
        map.addSource('pdam-qgis-pipes-source', {
          type: 'geojson',
          data: state.qgisPipesGeoJson as any,
        });
      }
      if (!map.getLayer('pdam-qgis-pipes-line')) {
        map.addLayer({
          id: 'pdam-qgis-pipes-line',
          type: 'line',
          source: 'pdam-qgis-pipes-source',
          ...(qgisFilterExpr ? { filter: qgisFilterExpr } : {}),
          layout: {
            visibility: state.qgisLayerActive ? 'visible' : 'none',
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': ['coalesce', ['get', '_color'], '#2563EB'],
            'line-width': ['coalesce', ['get', '_weight'], 3.5],
            'line-opacity': 0.92,
          },
        });
      }

      if (!map.getSource('pdam-qgis-valves-source')) {
        map.addSource('pdam-qgis-valves-source', {
          type: 'geojson',
          data: state.qgisValvesGeoJson as any,
        });
      }
      if (!map.getLayer('pdam-qgis-valves-circle')) {
        map.addLayer({
          id: 'pdam-qgis-valves-circle',
          type: 'circle',
          source: 'pdam-qgis-valves-source',
          ...(qgisFilterExpr ? { filter: qgisFilterExpr } : {}),
          layout: {
            visibility: state.qgisLayerActive ? 'visible' : 'none',
          },
          paint: {
            'circle-radius': ['coalesce', ['get', '_outerR'], 5],
            'circle-color': ['coalesce', ['get', '_color'], '#D97706'],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1.5,
            'circle-opacity': 0.95,
          },
        });
      }
      if (!map.getLayer('pdam-qgis-valves-inner')) {
        map.addLayer({
          id: 'pdam-qgis-valves-inner',
          type: 'circle',
          source: 'pdam-qgis-valves-source',
          filter: valveInnerFilterExpr,
          layout: {
            visibility: state.qgisLayerActive ? 'visible' : 'none',
          },
          paint: {
            'circle-radius': ['coalesce', ['get', '_innerR'], 2],
            'circle-color': '#ffffff',
            'circle-opacity': 0.95,
          },
        });
      }

      // 3. SOURCE & LAYER: TITIK PELANGGAN (UNCLUSTERED GPU + SETFILTER)
      const custFilterExpr = buildCustomerFilterExpression(
        state.selectedKecamatan,
        state.filters,
        state.onlyAnomaly
      );
      const showUnclustered = state.showCustomerPoints && !state.useCluster;

      if (!map.getSource('pdam-customers-unclustered')) {
        map.addSource('pdam-customers-unclustered', {
          type: 'geojson',
          data: state.allCustomerGeoJson as any,
          maxzoom: 14,
          tolerance: 0,
          buffer: 64,
        });
      } else {
        (map.getSource('pdam-customers-unclustered') as maplibregl.GeoJSONSource).setData(
          state.allCustomerGeoJson as any
        );
      }

      // Lingkaran utama titik pelanggan (GPU WebGL) — warna murni sesuai Wilayah/Status dengan border putih bersih
      if (!map.getLayer('pdam-customers-unclustered-circle')) {
        map.addLayer({
          id: 'pdam-customers-unclustered-circle',
          type: 'circle',
          source: 'pdam-customers-unclustered',
          ...(custFilterExpr ? { filter: custFilterExpr as any } : {}),
          layout: {
            visibility: showUnclustered ? 'visible' : 'none',
          },
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 1.85, 13, 2.9, 16, 4.2, 18, 5.2],
            'circle-color': getCircleColorExpr(state.colorBy),
            'circle-opacity': 0.95,
            'circle-stroke-color': getCircleStrokeColorExpr(),
            'circle-stroke-width': 0.6,
          },
        });
      }

      // 4. SOURCE & LAYER: TITIK PELANGGAN (MODE KLASTER SUPERCLUSTER BAWAAN MAPLIBRE)
      const showClustered = state.showCustomerPoints && state.useCluster;

      if (!map.getSource('pdam-customers-clustered')) {
        map.addSource('pdam-customers-clustered', {
          type: 'geojson',
          data: state.filteredCustomerGeoJson as any,
          cluster: true,
          clusterMaxZoom: 15,
          clusterRadius: 50,
        });
      }

      // Lingkaran Bubble Klaster
      if (!map.getLayer('pdam-customers-clusters')) {
        map.addLayer({
          id: 'pdam-customers-clusters',
          type: 'circle',
          source: 'pdam-customers-clustered',
          filter: ['has', 'point_count'],
          layout: {
            visibility: showClustered ? 'visible' : 'none',
          },
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#2563eb', // < 20 titik
              20,
              '#0284c7', // 20 - 50 titik
              50,
              '#4f46e5', // > 50 titik
            ],
            'circle-radius': ['step', ['get', 'point_count'], 15, 20, 18, 50, 22],
            'circle-stroke-width': 2.5,
            'circle-stroke-color': 'rgba(255,255,255,0.92)',
            'circle-opacity': 0.92,
          },
        });
      }

      // Angka Jumlah Klaster
      if (!map.getLayer('pdam-customers-cluster-count')) {
        map.addLayer({
          id: 'pdam-customers-cluster-count',
          type: 'symbol',
          source: 'pdam-customers-clustered',
          filter: ['has', 'point_count'],
          layout: {
            visibility: showClustered ? 'visible' : 'none',
            'text-field': '{point_count_abbreviated}',
            'text-font': ['Noto Sans Bold'],
            'text-size': 11,
          },
          paint: {
            'text-color': '#ffffff',
          },
        });
      }

      // Titik Individu di dalam Mode Klaster (saat sudah terurai / di-zoom dekat)
      if (!map.getLayer('pdam-customers-cluster-unclustered')) {
        map.addLayer({
          id: 'pdam-customers-cluster-unclustered',
          type: 'circle',
          source: 'pdam-customers-clustered',
          filter: ['!', ['has', 'point_count']],
          layout: {
            visibility: showClustered ? 'visible' : 'none',
          },
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3.2, 14, 4.8, 17, 6.5],
            'circle-color': getCircleColorExpr(state.colorBy),
            'circle-opacity': 0.95,
            'circle-stroke-color': getCircleStrokeColorExpr(),
            'circle-stroke-width': 1.2,
          },
        });
      }

      styleReadyRef.current = true;
    },
    [getCircleColorExpr, getCircleStrokeColorExpr]
  );

  // Helper buka popup pelanggan di koordinat MapLibre
  const openCustomerPopupOnMap = useCallback(
    (map: maplibregl.Map, customer: Pelanggan) => {
      const lngLat = toMapLibreLngLat(customer.latitude, customer.longitude);
      if (!lngLat) return;

      const wilayah = wilayahMapRef.current.get(customer.kode_wilayah);
      const color = safeColor(wilayah?.warna, '#3B6EA8');

      if (clickPopupRef.current) {
        clickPopupRef.current.remove();
      }

      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: '280px',
        offset: 8,
      })
        .setLngLat(lngLat)
        .setHTML(buildCustomerPopupHtml(customer, color))
        .addTo(map);

      clickPopupRef.current = popup;

      // Pasang event klik tombol "Lihat Detail & Titik GIS" di dalam popup
      setTimeout(() => {
        const btn = document.getElementById(`ml-btn-popup-${customer.kode_pelanggan}`);
        if (btn) {
          btn.onclick = () => {
            onSelectRef.current(customer);
            popup.remove();
          };
        }
      }, 20);
    },
    [buildCustomerPopupHtml]
  );

  // ── Inisialisasi Peta Utama MapLibre GL ──
  useEffect(() => {
    if (!containerRef.current) return;
    let isMounted = true;

    const initMap = () => {
      const tStart = performance.now();
      const initialStyle = resolveMapStyleSync(basemapKey);
      if (!isMounted || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: initialStyle,
        center: DEFAULT_CENTER_LNGLAT,
        zoom: 12,
        minZoom: 10,
        maxZoom: 19,
        maxBounds: LOMBOK_ML_BOUNDS,
        pitch: isTilted ? 52 : 0,
        attributionControl: false,
      });

      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
      mapRef.current = map;

      const hoverPopup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'pdam-ml-tooltip',
        offset: 10,
      });
      hoverTooltipRef.current = hoverPopup;

      // Gunakan 'style.load' & 'styledata' (bukan 'load') agar titik pelanggan langsung muncul instan
      // tanpa harus menunggu ubin gambar peta (Esri/OSM) selesai diunduh dari internet!
      const handleStyleReady = () => {
        if (!isMounted || styleReadyRef.current) return;
        if (!((map as any).style && (map as any).style._loaded)) return;
        try {
          setupGisLayersOnStyle(map);
          map.triggerRepaint();
          lastRenderMsRef.current = Math.round((performance.now() - tStart) * 10) / 10;
        } catch {}
      };

      map.on('style.load', handleStyleReady);
      map.on('styledata', handleStyleReady);
      map.on('load', handleStyleReady);
      handleStyleReady();

      // ── INTERAKSI KLIK & HOVER (Langsung Ditangkap oleh MapLibre GL) ──
      const interactiveLayers = [
        'pdam-customers-unclustered-circle',
        'pdam-customers-cluster-unclustered',
        'pdam-customers-clusters',
        'pdam-qgis-valves-circle',
        'pdam-qgis-pipes-line',
      ];

      map.on('mousemove', (e: any) => {
        if (!styleReadyRef.current) return;
        const availableLayers = interactiveLayers.filter((id) => Boolean(map.getLayer(id)));
        if (availableLayers.length === 0) return;

        const features = map.queryRenderedFeatures(e.point, { layers: availableLayers });
        if (!features || features.length === 0) {
          map.getCanvas().style.cursor = '';
          hoverPopup.remove();
          return;
        }

        map.getCanvas().style.cursor = 'pointer';
        const topFeature = features[0];
        const layerId = topFeature.layer.id;
        const props = topFeature.properties || {};

        // Hover pada Titik Pelanggan
        if (
          layerId === 'pdam-customers-unclustered-circle' ||
          layerId === 'pdam-customers-cluster-unclustered'
        ) {
          const customer = customerLookupRef.current.get(String(props.id));
          if (customer) {
            const safeCode = escapeHtml(customer.kode_pelanggan);
            const safeName = escapeHtml(displayName(customer.nama_pelanggan, userRoleRef.current));
            const safeWilayah = escapeHtml(customer.nama_wilayah);
            const dotCol = escapeHtml(String(props.col || '#3B6EA8'));
            hoverPopup
              .setLngLat(e.lngLat)
              .setHTML(
                `<div style="font-size:11px; line-height:1.35;">
                  <div style="display:flex; align-items:center; gap:5px; font-weight:700;">
                    <span style="width:7px; height:7px; border-radius:50%; background:${dotCol}; display:inline-block;"></span>
                    <span style="font-family:monospace;">${safeCode}</span>
                    <span style="font-weight:500; color:#64748b;">• ${safeWilayah}</span>
                  </div>
                  <div style="font-weight:600; margin-top:1px;">${safeName}</div>
                </div>`
              )
              .addTo(map);
          }
          return;
        }

        // Hover pada Klaster
        if (layerId === 'pdam-customers-clusters') {
          const count = props.point_count || 0;
          hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-size:11px; font-weight:600;">Klaster <strong>${Number(count).toLocaleString('id-ID')}</strong> Pelanggan (Klik untuk perbesar)</div>`
            )
            .addTo(map);
          return;
        }

        // Hover pada Katup / Aksesoris Pipa
        if (layerId === 'pdam-qgis-valves-circle') {
          const rawTitle =
            getProp(props, ['nama_aksesoris', 'nama', 'name', 'keterangan', 'jenis', 'id']) ||
            'Aksesoris Jaringan';
          const diam = props._diam ? ` • Ø ${props._diam} mm` : '';
          hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-size:11px; line-height:1.3;">
                <strong>${escapeHtml(String(props._metaLabel || 'Katup Valve'))}${escapeHtml(diam)}</strong><br/>
                <span style="font-size:10px; color:#64748b;">${escapeHtml(String(rawTitle))}</span>
              </div>`
            )
            .addTo(map);
          return;
        }

        // Hover pada Garis Pipa
        if (layerId === 'pdam-qgis-pipes-line') {
          const rawTitle =
            getProp(props, ['nama_jalur', 'nama', 'name', 'jalur', 'jalan', 'lokasi', 'kode_pipa', 'id']) ||
            'Jalur Pipa PDAM';
          const subtitle = getProp(props, ['kategori', 'category', 'jenis', 'tipe']) || 'Pipa Distribusi';
          hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-size:11px; line-height:1.3;">
                <strong>${escapeHtml(String(rawTitle))}</strong><br/>
                <span style="font-size:10px; color:#64748b;">${escapeHtml(String(subtitle))}</span>
              </div>`
            )
            .addTo(map);
        }
      });

      // Klik pada Layer Interaktif
      map.on('click', async (e: any) => {
        if (!styleReadyRef.current) return;
        const availableLayers = interactiveLayers.filter((id) => Boolean(map.getLayer(id)));
        if (availableLayers.length === 0) return;

        const features = map.queryRenderedFeatures(e.point, { layers: availableLayers });
        if (!features || features.length === 0) return;

        const topFeature = features[0];
        const layerId = topFeature.layer.id;
        const props = topFeature.properties || {};

        // 1. Klik Klaster -> Perbesar (Expand Cluster)
        if (layerId === 'pdam-customers-clusters') {
          const clusterId = props.cluster_id;
          const source = map.getSource('pdam-customers-clustered') as maplibregl.GeoJSONSource;
          if (source && clusterId !== undefined) {
            try {
              const zoom = await source.getClusterExpansionZoom(clusterId);
              const coords = (topFeature.geometry as any)?.coordinates;
              if (Array.isArray(coords) && coords.length === 2) {
                map.easeTo({
                  center: [coords[0], coords[1]],
                  zoom: Math.min(zoom, 18),
                  duration: 550,
                });
              }
            } catch { }
          }
          return;
        }

        // 2. Klik Titik Pelanggan -> Buka Detail Pelanggan & Popup
        if (
          layerId === 'pdam-customers-unclustered-circle' ||
          layerId === 'pdam-customers-cluster-unclustered'
        ) {
          const code = String(props.id || '');
          const customer = customerLookupRef.current.get(code);
          if (customer) {
            onSelectRef.current(customer);
            openCustomerPopupOnMap(map, customer);
          }
          return;
        }

        // 3. Klik Pipa atau Valve QGIS -> Tampilkan Tabel Atribut Lengkap
        if (layerId === 'pdam-qgis-valves-circle' || layerId === 'pdam-qgis-pipes-line') {
          const isPoint = layerId === 'pdam-qgis-valves-circle';
          const rawTitle =
            getProp(props, [
              'nama_jalur', 'nama', 'name', 'jalur', 'jalan', 'lokasi',
              'keterangan', 'nama_aksesoris', 'nama_zona', 'kode_pipa', 'id',
            ]) || 'Fitur Jaringan PDAM';
          const subtitle = String(getProp(props, ['kategori', 'category', 'jenis', 'tipe']) || (isPoint ? 'Aksesoris' : 'Jalur Pipa'));

          let tableRows = '';
          for (const [k, v] of Object.entries(props)) {
            if (k.startsWith('_') || ['geom', 'geometry', 'st_asgeojson'].includes(k.toLowerCase())) continue;
            const label = escapeHtml(k.replace(/_/g, ' ').toUpperCase());
            const val = escapeHtml(String(v ?? '-'));
            tableRows += `
              <tr style="border-bottom: 1px solid rgba(148, 163, 184, 0.18);">
                <td style="padding: 3px 6px; font-size: 10px; color: #64748b; font-family: monospace;">${label}</td>
                <td style="padding: 3px 6px; font-size: 11px; font-weight: 600; text-align: right;">${val}</td>
              </tr>
            `;
          }

          const badgeColor = String(props._color || (isPoint ? '#D97706' : '#2563EB'));
          const headerTitle = isPoint
            ? `${props._metaLabel || 'Aksesoris'} ${props._diam ? `Ø${props._diam}mm` : ''}`
            : String(rawTitle);

          const html = `
            <div style="font-family: system-ui, sans-serif; min-width: 225px; padding: 11px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px; padding-right: 14px;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${escapeHtml(badgeColor)};"></span>
                <span style="font-weight: 700; font-size: 13px; line-height: 1.2;">${escapeHtml(headerTitle)}</span>
              </div>
              <div style="font-size: 10px; color: #0284c7; font-weight: 600; margin-bottom: 8px; text-transform: uppercase;">
                ${escapeHtml(subtitle)} • QGIS Realtime (WebGL)
              </div>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;">
                ${tableRows}
              </table>
              <div style="font-size: 9px; color: #94a3b8; text-align: right; font-style: italic;">
                Sumber: Database GIS Kantor
              </div>
            </div>
          `;

          if (clickPopupRef.current) clickPopupRef.current.remove();
          clickPopupRef.current = new maplibregl.Popup({
            closeButton: true,
            maxWidth: '320px',
          })
            .setLngLat(e.lngLat)
            .setHTML(html)
            .addTo(map);
        }
      });
    };

    initMap();

    return () => {
      isMounted = false;
      styleReadyRef.current = false;
      if (pulseMarkerRef.current) {
        pulseMarkerRef.current.remove();
        pulseMarkerRef.current = null;
      }
      if (clickPopupRef.current) {
        clickPopupRef.current.remove();
        clickPopupRef.current = null;
      }
      if (hoverTooltipRef.current) {
        hoverTooltipRef.current.remove();
        hoverTooltipRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pemantauan FPS Real-time & Pelaporan Metrik Performa ──
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let rafId: number;

    const measureFps = (now: number) => {
      frameCount++;
      if (now - lastTime >= 1000) {
        fpsRef.current = Math.min(60, Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;

        if (onMetricsUpdate) {
          onMetricsUpdate({
            engine: 'MapLibre GL (WebGL GPU)',
            renderTimeMs: lastRenderMsRef.current,
            filterTimeMs: lastFilterMsRef.current,
            fps: fpsRef.current,
            activePoints: filteredCustomers.length,
            totalPoints: allCustomers.length,
            ...payloadMetrics,
          });
        }
      }
      rafId = requestAnimationFrame(measureFps);
    };

    rafId = requestAnimationFrame(measureFps);
    return () => cancelAnimationFrame(rafId);
  }, [filteredCustomers.length, allCustomers.length, payloadMetrics, onMetricsUpdate]);

  // ── Ganti Basemap Secara Mulus & Pasang Ulang Layer GIS ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || currentBasemapRef.current === basemapKey) return;
    currentBasemapRef.current = basemapKey;
    styleReadyRef.current = false;

    const nextStyle = resolveMapStyleSync(basemapKey);
    map.setStyle(nextStyle);
    const onStyleLoad = () => {
      if (mapRef.current && !styleReadyRef.current && (mapRef.current as any).style?._loaded) {
        setupGisLayersOnStyle(mapRef.current);
        mapRef.current.triggerRepaint();
      }
    };
    map.once('style.load', onStyleLoad);
    map.once('styledata', onStyleLoad);
    onStyleLoad();
  }, [basemapKey, setupGisLayersOnStyle]);

  // ── Update Data Sumber Titik Pelanggan (All Customers) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!styleReadyRef.current) {
      if ((map as any).style && (map as any).style._loaded) {
        setupGisLayersOnStyle(map);
      } else {
        return;
      }
    }
    const t0 = performance.now();
    const src = map.getSource('pdam-customers-unclustered') as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(allCustomerGeoJson as any);
      map.triggerRepaint();
      lastRenderMsRef.current = Math.round((performance.now() - t0) * 10) / 10;
    }
  }, [allCustomerGeoJson, setupGisLayersOnStyle]);

  // ── Update Data Sumber Klaster ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;
    const src = map.getSource('pdam-customers-clustered') as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(filteredCustomerGeoJson as any);
    }
  }, [filteredCustomerGeoJson]);

  // ── Eksekusi Filter Titik Pelanggan Lewat GPU `map.setFilter(...)` ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;
    const t0 = performance.now();
    const filterExpr = buildCustomerFilterExpression(selectedKecamatan, filters, onlyAnomaly);

    if (map.getLayer('pdam-customers-unclustered-circle')) {
      map.setFilter('pdam-customers-unclustered-circle', filterExpr as any);
    }
    lastFilterMsRef.current = Math.round((performance.now() - t0) * 100) / 100;
  }, [selectedKecamatan, filters, onlyAnomaly]);

  // ── Update Mode Klaster vs Sebaran Titik & Visibilitas Pelanggan ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;

    const unclusteredVis = showCustomerPoints && !useCluster ? 'visible' : 'none';
    const clusteredVis = showCustomerPoints && useCluster ? 'visible' : 'none';

    if (map.getLayer('pdam-customers-unclustered-circle')) {
      map.setLayoutProperty('pdam-customers-unclustered-circle', 'visibility', unclusteredVis);
    }
    for (const id of [
      'pdam-customers-clusters',
      'pdam-customers-cluster-count',
      'pdam-customers-cluster-unclustered',
    ]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', clusteredVis);
    }
  }, [showCustomerPoints, useCluster]);

  // ── Update Mode Pewarnaan Titik (`match` berdasarkan status vs wilayah) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;
    const colorExpr = getCircleColorExpr(colorBy);

    if (map.getLayer('pdam-customers-unclustered-circle')) {
      map.setPaintProperty('pdam-customers-unclustered-circle', 'circle-color', colorExpr);
    }
    if (map.getLayer('pdam-customers-cluster-unclustered')) {
      map.setPaintProperty('pdam-customers-cluster-unclustered', 'circle-color', colorExpr);
    }
  }, [colorBy, getCircleColorExpr]);

  // ── Update Layer Pipa & Aksesoris QGIS ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;

    const pipeSrc = map.getSource('pdam-qgis-pipes-source') as maplibregl.GeoJSONSource | undefined;
    if (pipeSrc) pipeSrc.setData(qgisPipesGeoJson as any);

    const valveSrc = map.getSource('pdam-qgis-valves-source') as maplibregl.GeoJSONSource | undefined;
    if (valveSrc) valveSrc.setData(qgisValvesGeoJson as any);
  }, [qgisPipesGeoJson, qgisValvesGeoJson]);

  // ── Update Visibilitas & Filter `hiddenLayers` pada Layer QGIS ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;

    const vis = qgisLayerActive ? 'visible' : 'none';
    const hiddenArr = Array.from(hiddenLayers);
    const filterExpr: any =
      hiddenArr.length > 0 ? ['!', ['in', ['get', '_layerKey'], ['literal', hiddenArr]]] : null;
    const valveInnerFilterExpr: any =
      hiddenArr.length > 0
        ? ['all', ['!', ['in', ['get', '_layerKey'], ['literal', hiddenArr]]], ['==', ['get', '_hasDot'], 1]]
        : ['==', ['get', '_hasDot'], 1];

    if (map.getLayer('pdam-qgis-pipes-line')) {
      map.setLayoutProperty('pdam-qgis-pipes-line', 'visibility', vis);
      map.setFilter('pdam-qgis-pipes-line', filterExpr);
    }
    if (map.getLayer('pdam-qgis-valves-circle')) {
      map.setLayoutProperty('pdam-qgis-valves-circle', 'visibility', vis);
      map.setFilter('pdam-qgis-valves-circle', filterExpr);
    }
    if (map.getLayer('pdam-qgis-valves-inner')) {
      map.setLayoutProperty('pdam-qgis-valves-inner', 'visibility', vis);
      map.setFilter('pdam-qgis-valves-inner', valveInnerFilterExpr);
    }
  }, [qgisLayerActive, hiddenLayers]);

  // ── Update Layer Batas Wilayah Kecamatan & Dekade ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;

    const boundSrc = map.getSource('pdam-boundaries-source') as maplibregl.GeoJSONSource | undefined;
    if (boundSrc) boundSrc.setData(boundariesGeoJson as any);

    const centSrc = map.getSource('pdam-centroids-source') as maplibregl.GeoJSONSource | undefined;
    if (centSrc) centSrc.setData(centroidsGeoJson as any);

    const vis = showBoundaries ? 'visible' : 'none';
    for (const id of ['pdam-boundaries-fill', 'pdam-boundaries-line', 'pdam-centroids-label']) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis);
    }
  }, [boundariesGeoJson, centroidsGeoJson, showBoundaries]);

  // ── Update Kamera Miring 3D Native WebGL (`pitch`) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({
      pitch: isTilted ? 52 : 0,
      duration: 600,
    });
  }, [isTilted]);

  // ── Navigasi FlyTo Saat Pencarian / Pilih Pelanggan / Pilih Kecamatan (`targetPoint`) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !targetPoint) return;

    // Konversi aman [lat, lng] -> [lng, lat]
    const lngLat = toMapLibreLngLat(targetPoint[0], targetPoint[1]);
    if (!lngLat) return;

    map.flyTo({
      center: lngLat,
      zoom: targetZoom,
      duration: 1100,
      essential: true,
    });
  }, [targetPoint, targetZoom]);

  // ── Buka Popup Saat Pelanggan Dipilih dari Pencarian ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedCustomer) {
      if (clickPopupRef.current) {
        clickPopupRef.current.remove();
        clickPopupRef.current = null;
      }
      return;
    }
    openCustomerPopupOnMap(map, selectedCustomer);
  }, [selectedCustomer, openCustomerPopupOnMap]);

  // ── Visual Pulse Overlay pada Titik yang Dipilih ──
  useEffect(() => {
    const map = mapRef.current;
    if (pulseMarkerRef.current) {
      pulseMarkerRef.current.remove();
      pulseMarkerRef.current = null;
    }

    if (!map || !pulsePosition || !pulseActive) return;
    const lngLat = toMapLibreLngLat(pulsePosition[0], pulsePosition[1]);
    if (!lngLat) return;

    const el = document.createElement('div');
    el.className = 'gis-selected-pulse-wrapper';
    el.innerHTML = `
      <div class="gis-selected-pulse">
        <div class="gis-selected-pulse-ring"></div>
        <div class="gis-selected-pulse-ring gis-selected-pulse-ring-2"></div>
        <div class="gis-selected-pulse-dot"></div>
      </div>
    `;

    const marker = new maplibregl.Marker({
      element: el,
      anchor: 'center',
    })
      .setLngLat(lngLat)
      .addTo(map);

    pulseMarkerRef.current = marker;

    return () => {
      if (pulseMarkerRef.current) {
        pulseMarkerRef.current.remove();
        pulseMarkerRef.current = null;
      }
    };
  }, [pulsePosition, pulseActive]);

  return <div ref={containerRef} className="w-full h-full" />;
}
