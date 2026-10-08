import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

import { KECAMATAN_LIST } from '@/services/pdamDataService';
import { Pelanggan, WilayahAcuan, UserRole } from '@/types/pdam';
import { useAuth } from '@/contexts/AuthContext';
import { usePdamData } from '@/hooks/usePdamData';
import { useFilters } from '@/lib/filters';
import { escapeHtml, safeColor } from '@/lib/escape';
import { displayName, displayAddress, displayCoordinates, canSeePII } from '@/lib/privacy';
import { GOLONGAN_LIST, GOLONGAN_META, STATUS_CONNECTION_META } from '@/lib/constants';
import { toast } from 'sonner';
import {
  Search,
  Layers,
  MapPin,
  Navigation,
  Compass,
  Filter,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Building2,
  AlertOctagon,
  X,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  ExternalLink,
  ShieldCheck,
  Gauge,
  Calendar,
  RefreshCw,
  Radio,
  FileCode,
  FolderOpen,
  HelpCircle,
  Activity,
  CheckCircle2,
  UploadCloud,
  Plus,
  Trash2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

// Strict boundary for Pulau Lombok, NTB (Lombok bounds lock)
const LOMBOK_BOUNDS: L.LatLngBoundsExpression = [
  [-9.12, 115.82], // Barat Daya (Sekotong / Samudera Hindia)
  [-8.18, 116.75], // Timur Laut (Lombok Timur / Laut Jawa)
];

// Coordinates locked to Lombok
const CENTER_PRAYA_BARAT: [number, number] = [-8.7892, 116.2051];
const DEFAULT_ZOOM = 12;
const MIN_ZOOM = 10;
const MAX_ZOOM = 18;

// Basemap Providers
const BASEMAPS = {
  positron: {
    name: 'Positron (Terang Minimalis)',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO / OpenFreeMap',
  },
  cerah: {
    name: 'Peta Cerah (Humaniter)',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, Humanitarian OpenStreetMap Team',
  },
  osm: {
    name: 'OpenStreetMap (Standar)',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  satellite: {
    name: 'Citra Satelit (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar',
  },
  topo: {
    name: 'Topografi & Relief',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap, SRTM | &copy; OpenTopoMap',
  },
  vektor: {
    name: 'Peta Vektor Mandiri (GL)',
    url: '',
    attribution: '&copy; OpenFreeMap &copy; OpenMapTiles',
  },
};

// Fix Leaflet marker asset paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper component for map flying / navigation
function MapController({
  targetPoint,
  zoomLevel = 17,
}: {
  targetPoint: [number, number] | null;
  zoomLevel?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (targetPoint) {
      map.flyTo(targetPoint, zoomLevel, { duration: 1.1 });
    }
  }, [targetPoint, zoomLevel, map]);

  return null;
}

// Visual Pulse overlay on selected marker
function PulseOverlay({ position, active }: { position: [number, number] | null; active: boolean }) {
  const map = useMap();
  const pulseRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (pulseRef.current) {
      map.removeLayer(pulseRef.current);
      pulseRef.current = null;
    }

    if (!position || !active) return;

    const pulseIcon = L.divIcon({
      className: 'gis-selected-pulse-wrapper',
      html: `
        <div class="gis-selected-pulse">
          <div class="gis-selected-pulse-ring"></div>
          <div class="gis-selected-pulse-ring gis-selected-pulse-ring-2"></div>
          <div class="gis-selected-pulse-dot"></div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    const marker = L.marker(position, {
      icon: pulseIcon,
      interactive: false,
      zIndexOffset: 1000,
    });

    marker.addTo(map);
    pulseRef.current = marker;

    return () => {
      if (pulseRef.current) {
        map.removeLayer(pulseRef.current);
        pulseRef.current = null;
      }
    };
  }, [position, active, map]);

  return null;
}

// MapLibre Vector Tile Layer
function MapLibreLayer({ active }: { active: boolean }) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!active) {
      if (layerRef.current) {
        try {
          map.removeLayer(layerRef.current);
        } catch {}
        layerRef.current = null;
      }
      return;
    }

    let cancelled = false;

    map.whenReady(() => {
      (async () => {
        try {
          const [{ lombokTengahStyle }, maplibreLeafletMod] = await Promise.all([
            import('@/lib/lombokTengahStyle'),
            import('@maplibre/maplibre-gl-leaflet'),
          ]);

          await import('maplibre-gl/dist/maplibre-gl.css');
          if (cancelled) return;

          const maplibreGL = maplibreLeafletMod.maplibreGL || (maplibreLeafletMod as any).default;
          if (!maplibreGL) return;

          const glLayer = maplibreGL({
            style: lombokTengahStyle as any,
            pane: 'tilePane',
          } as any);

          if (cancelled) return;
          glLayer.addTo(map);
          layerRef.current = glLayer;
        } catch (err) {
          console.warn('MapLibre GL basemap warning:', err);
        }
      })();
    });

    return () => {
      cancelled = true;
      if (layerRef.current) {
        try {
          map.removeLayer(layerRef.current);
        } catch {}
        layerRef.current = null;
      }
    };
  }, [active, map]);

  return null;
}

// ── QGIS Realtime Vector Layer Component (Pipelines, Valves, DMA Zones) ──
interface QgisVectorLayerProps {
  active: boolean;
  data: any;
  hiddenLayers?: Set<string>;
  layerColors?: Record<string, string>;
}

export interface QgisLayerItem {
  id: string;
  name: string;
  category: string;
  geomType: 'line' | 'point' | 'polygon';
  count: number;
  color: string;
  defaultColor?: string;
}

// Helper cerdas pendeteksi alias nama kolom QGIS (misal: DIA, DIAMETER, DN, UKURAN, BAHAN, MATERIAL)
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

// Helper cerdas ekstraksi diameter aksesoris (dalam milimeter mm)
function parseAccessoryDiameter(props: Record<string, any>): number | null {
  const directVal = getProp(props, [
    'diameter_mm', 'diameter', 'dimensi', 'dimensi_av', 
    'dia', 'dn', 'ukuran', 'size', 'dim', 'd_mm', 'd'
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

interface AccessoryStyle {
  color: string;
  borderColor: string;
  label: string;
  category: string;
  iconSymbol: string;
}

function getAccessoryMeta(props: Record<string, any>): AccessoryStyle {
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
    return {
      color: '#0284C7', // Sky Blue
      borderColor: '#BAE6FD',
      label: 'Air Valve',
      category: 'airvalve',
      iconSymbol: '⎈',
    };
  }
  if (text.includes('washout') || text.includes('penguras') || text.includes('blow off') || text.includes('wash out')) {
    return {
      color: '#7C3AED', // Violet
      borderColor: '#DDD6FE',
      label: 'Washout (Penguras)',
      category: 'washout',
      iconSymbol: '💧',
    };
  }
  if (text.includes('reservoir') || text.includes('bak penampung') || text.includes('tandon')) {
    return {
      color: '#059669', // Emerald
      borderColor: '#A7F3D0',
      label: 'Reservoir Air',
      category: 'reservoir',
      iconSymbol: '🏛️',
    };
  }
  if (text.includes('ipa') || text.includes('wtp') || text.includes('pengolahan')) {
    return {
      color: '#4F46E5', // Indigo
      borderColor: '#C7D2FE',
      label: 'IPA (Pengolahan)',
      category: 'ipa',
      iconSymbol: '🏭',
    };
  }
  if (text.includes('manometer') || text.includes('tekanan') || text.includes('pressure')) {
    return {
      color: '#E11D48', // Rose
      borderColor: '#FECDD3',
      label: 'Manometer',
      category: 'manometer',
      iconSymbol: '⏱️',
    };
  }
  if (text.includes('bpt') || text.includes('pelepas tekan')) {
    return {
      color: '#0D9488', // Teal
      borderColor: '#99F6E4',
      label: 'Bak Pelepas Tekan (BPT)',
      category: 'bpt',
      iconSymbol: '⛨',
    };
  }
  if (text.includes('dop') || text.includes('end cap') || text.includes('tutup')) {
    return {
      color: '#475569', // Slate
      borderColor: '#CBD5E1',
      label: 'End Cap (Dop)',
      category: 'dop',
      iconSymbol: '⊘',
    };
  }

  // Default: Gate Valve / Katup
  return {
    color: '#D97706', // Amber 600
    borderColor: '#FEF3C7',
    label: 'Katup Valve (Gate)',
    category: 'valve',
    iconSymbol: '⚙',
  };
}

// Skala ukuran titik Leaflet yang proporsional dan tidak menutupi peta (8px s/d 18px)
function getMarkerSize(diameterMm: number | null): { outerPx: number; innerPx: number } {
  if (diameterMm === null) {
    return { outerPx: 10, innerPx: 3 };
  }
  if (diameterMm <= 50) {
    return { outerPx: 8, innerPx: 2 };   // Retikulasi kecil <= 2"
  }
  if (diameterMm <= 80) {
    return { outerPx: 10, innerPx: 3 };  // 2.5" - 3"
  }
  if (diameterMm <= 115) {
    return { outerPx: 12, innerPx: 4 };  // 4" (100mm)
  }
  if (diameterMm <= 165) {
    return { outerPx: 14, innerPx: 5 };  // 6" (150mm)
  }
  if (diameterMm <= 225) {
    return { outerPx: 16, innerPx: 6 };  // 8" (200mm)
  }
  return { outerPx: 18, innerPx: 7 };    // Transmisi besar >= 10" (250mm+)
}

// Helper cerdas penentu id/nama layer untuk setiap fitur spasial (agar bisa di-hide/show per file di legenda)
export function getFeatureLayerKey(feature: any): string {
  const props = feature?.properties || {};
  const rawSource = props.layer_source || props.layer || props.file_source;
  const geomType = feature?.geometry?.type;
  const isLine = geomType === 'LineString' || geomType === 'MultiLineString';
  const isPoint = geomType === 'Point';

  if (rawSource) {
    const srcStr = String(rawSource).trim();
    const lower = srcStr.toLowerCase();
    if (
      lower.includes('existing') ||
      lower.includes('pipa') ||
      lower.includes('valve') ||
      lower.includes('airvalve') ||
      lower.includes('washout') ||
      lower.includes('reservoir') ||
      lower.includes('ipa')
    ) {
      return srcStr.endsWith('.geojson') || srcStr.endsWith('.json') ? srcStr : `${srcStr}.geojson`;
    }
    if (isLine) return srcStr.endsWith('.geojson') || srcStr.endsWith('.json') ? srcStr : `${srcStr}.geojson`;
    if (isPoint) {
      const meta = getAccessoryMeta(props);
      return `${meta.category || 'valve'}.geojson`;
    }
    return srcStr;
  }

  // Fallback jika fitur tidak menyimpan layer_source
  if (isLine) return 'existing.geojson';
  if (isPoint) {
    const meta = getAccessoryMeta(props);
    return `${meta.category || 'valve'}.geojson`;
  }
  return 'area_dma.geojson';
}

function QgisVectorLayer({ active, data, hiddenLayers, layerColors }: QgisVectorLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!active || !data || !map) {
      if (layerRef.current) {
        try {
          map.removeLayer(layerRef.current);
        } catch {}
        layerRef.current = null;
      }
      return;
    }

    if (layerRef.current) {
      try {
        map.removeLayer(layerRef.current);
      } catch {}
      layerRef.current = null;
    }

    try {
      const geoLayer = L.geoJSON(data, {
        filter: (feature: any) => {
          // Abaikan Polygon (kotak area DMA / batas zona) agar peta bersih fokus ke jalur pipa & valve
          const geomType = feature?.geometry?.type;
          if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
            return false;
          }
          // Filter layer yang disembunyikan (hide) oleh pengguna di Legenda
          if (hiddenLayers && hiddenLayers.size > 0) {
            const key = getFeatureLayerKey(feature);
            if (hiddenLayers.has(key)) {
              return false;
            }
          }
          return true;
        },
        style: (feature: any) => {
          const props = feature?.properties || {};
          const geomType = feature?.geometry?.type;
          const layerKey = getFeatureLayerKey(feature);
          const customColor = layerColors?.[layerKey];

          if (geomType === 'LineString' || geomType === 'MultiLineString') {
            const rawKat = getProp(props, ['kategori', 'category', 'fungsi', 'jenis', 'kelas', 'type']) || '';
            const kategori = String(rawKat).toLowerCase();
            const rawDiam = getProp(props, ['diameter_mm', 'diameter', 'diam', 'dia', 'dn', 'ukuran', 'd_mm', 'size', 'dim']) || 100;
            const diam = Number(String(rawDiam).replace(/[^\d.-]/g, '')) || 100;

            let color = customColor || '#2563EB'; // Royal Blue default
            let weight = 3.5;

            if (!customColor) {
              if (kategori.includes('transmisi') || diam >= 200) {
                color = '#E11D48'; // Rose/Red untuk transmisi pipa besar
                weight = 4.5;
              } else if (kategori.includes('retikulasi') || diam <= 90) {
                color = '#0284C7'; // Sky Blue untuk pipa retikulasi perumahan
                weight = 2.5;
              }
            } else {
              if (kategori.includes('transmisi') || diam >= 200) {
                weight = 4.5;
              } else if (kategori.includes('retikulasi') || diam <= 90) {
                weight = 2.5;
              }
            }

            return {
              color,
              weight,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round',
            };
          }

          if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
            return {
              color: customColor || '#0284C7',
              weight: 1.5,
              dashArray: '5, 5',
              fillColor: customColor || '#0284C7',
              fillOpacity: 0.08,
            };
          }

          return { color: customColor || '#2563EB', weight: 2 };
        },

        pointToLayer: (feature: any, latlng: L.LatLng) => {
          const props = feature?.properties || {};
          const layerKey = getFeatureLayerKey(feature);
          const customColor = layerColors?.[layerKey];
          const diam = parseAccessoryDiameter(props);
          const meta = getAccessoryMeta(props);
          const markerColor = customColor || meta.color;
          const { outerPx, innerPx } = getMarkerSize(diam);

          const hasCenterDot = outerPx >= 13;
          const centerDotHtml = hasCenterDot
            ? `<div style="width: ${innerPx}px; height: ${innerPx}px; border-radius: 50%; background-color: #FFFFFF; opacity: 0.95;"></div>`
            : '';

          const iconHtml = `
            <div style="
              background-color: ${markerColor};
              width: ${outerPx}px;
              height: ${outerPx}px;
              border-radius: 50%;
              border: 1.5px solid #FFFFFF;
              box-shadow: 0 1px 4px rgba(0,0,0,0.38), 0 0 0 1px rgba(0,0,0,0.12);
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: transform 0.15s ease;
            ">
              ${centerDotHtml}
            </div>
          `;

          const half = Math.round(outerPx / 2);
          const customIcon = L.divIcon({
            html: iconHtml,
            className: 'qgis-accessory-marker',
            iconSize: [outerPx, outerPx],
            iconAnchor: [half, half],
            popupAnchor: [0, -half - 2],
          });

          return L.marker(latlng, { icon: customIcon });
        },

        onEachFeature: (feature: any, layer: L.Layer) => {
          // Hilangkan outline hitam browser saat diklik
          layer.on('click', (e: any) => {
            try {
              if (e?.originalEvent?.target?.blur) e.originalEvent.target.blur();
              const container = (layer as any)?._map?.getContainer();
              if (container && document.activeElement === e?.originalEvent?.target) {
                container.focus();
              }
            } catch {}
          });

          const props = feature?.properties || {};
          const geomType = feature?.geometry?.type;
          const isPoint = geomType === 'Point';

          const rawTitle = getProp(props, ['nama_jalur', 'nama', 'name', 'jalur', 'jalan', 'lokasi', 'keterangan', 'nama_aksesoris', 'nama_zona', 'kode_pipa', 'id']);
          const title = escapeHtml(String(rawTitle || 'Fitur Jaringan PDAM'));
          const subtitle = escapeHtml(String(getProp(props, ['kategori', 'category', 'jenis', 'tipe']) || geomType));

          // Hover Tooltip: Menyesuaikan apakah garis pipa atau titik aksesoris
          if (isPoint) {
            const meta = getAccessoryMeta(props);
            const diam = parseAccessoryDiameter(props);
            const diamStr = diam ? ` • Ø ${diam} mm` : '';
            layer.bindTooltip(
              `<strong>${escapeHtml(meta.label)}${diamStr}</strong><br/><span style="font-size:10px; color:#64748b;">${escapeHtml(title)}</span>`,
              { sticky: true }
            );
          } else {
            layer.bindTooltip(
              `<strong>${title}</strong><br/><span style="font-size:10px; color:#64748b;">${subtitle}</span>`,
              { sticky: true }
            );
          }

          // Dynamic Table Popup: Menampilkan SEMUA kolom atribut apapun namanya
          let tableRows = '';
          for (const [k, v] of Object.entries(props)) {
            // Hindari render duplikat field yang sudah ada di judul
            if (['geom', 'geometry', 'st_asgeojson'].includes(k.toLowerCase())) continue;
            const label = escapeHtml(k.replace(/_/g, ' ').toUpperCase());
            const val = escapeHtml(String(v ?? '-'));
            tableRows += `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 3px 6px; font-size: 10px; color: #64748b; font-family: monospace;">${label}</td>
                <td style="padding: 3px 6px; font-size: 11px; font-weight: 600; color: #0f172a; text-align: right;">${val}</td>
              </tr>
            `;
          }

          const layerKey = getFeatureLayerKey(feature);
          const customColor = layerColors?.[layerKey];
          const pointMeta = isPoint ? getAccessoryMeta(props) : null;
          const pointDiam = isPoint ? parseAccessoryDiameter(props) : null;
          const headerBadgeColor = isPoint ? (customColor || pointMeta?.color || '#D97706') : (customColor || '#2563EB');
          const headerTitle = isPoint ? `${pointMeta?.label || 'Aksesoris'} ${pointDiam ? `Ø${pointDiam}mm` : ''}` : title;

          const popupContent = `
            <div style="font-family: system-ui, sans-serif; min-width: 210px; padding: 2px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${headerBadgeColor}; margin-top: 2px;"></span>
                <span style="font-weight: 700; font-size: 13px; color: #0f172a; line-height: 1.2;">${escapeHtml(headerTitle)}</span>
              </div>
              <div style="font-size: 10px; color: #0284c7; font-weight: 600; margin-bottom: 8px; text-transform: uppercase;">
                ${subtitle} • QGIS Realtime
              </div>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;">
                ${tableRows}
              </table>
              <div style="font-size: 9px; color: #94a3b8; text-align: right; font-style: italic;">
                Sumber: Database GIS Kantor
              </div>
            </div>
          `;

          layer.bindPopup(popupContent, { maxWidth: 320 });
        },
      });

      geoLayer.addTo(map);
      layerRef.current = geoLayer;
    } catch (err) {
      console.warn('Gagal memuat layer QGIS di Leaflet:', err);
    }

    return () => {
      if (layerRef.current) {
        try {
          map.removeLayer(layerRef.current);
        } catch {}
        layerRef.current = null;
      }
    };
  }, [active, data, map, hiddenLayers, layerColors]);

  return null;
}

// Leaflet Marker Cluster Component (Sanitized HTML & Memoized Handler to fix S2 & B4)
interface CustomerClusterProps {
  customers: Pelanggan[];
  wilayahMap: Map<string, WilayahAcuan>;
  userRole?: UserRole | null;
  onSelectCustomer: (c: Pelanggan) => void;
}

function CustomerClusterLayer({
  customers,
  wilayahMap,
  userRole,
  onSelectCustomer,
}: CustomerClusterProps) {
  const map = useMap();
  const clusterGroupRef = useRef<any>(null);

  // Keep a stable ref to callback to prevent marker rebuilding on callback change
  const onSelectRef = useRef(onSelectCustomer);
  useEffect(() => {
    onSelectRef.current = onSelectCustomer;
  }, [onSelectCustomer]);

  useEffect(() => {
    try {
      if (!clusterGroupRef.current) {
        let group: any = null;
        if (typeof (L as any).markerClusterGroup === 'function') {
          group = (L as any).markerClusterGroup({
            chunkedLoading: true,
            maxClusterRadius: 35,
            disableClusteringAtZoom: 16,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            iconCreateFunction: (cluster: any) => {
              const count = cluster.getChildCount();
              let sizeClass = 'marker-cluster-small';
              if (count > 50) sizeClass = 'marker-cluster-large';
              else if (count > 20) sizeClass = 'marker-cluster-medium';

              return L.divIcon({
                html: `<div><span>${count}</span></div>`,
                className: `marker-cluster ${sizeClass}`,
                iconSize: L.point(34, 34),
              });
            },
          });
        }

        if (!group) {
          group = L.layerGroup();
        }

        clusterGroupRef.current = group;
        map.addLayer(clusterGroupRef.current);
      }

      const clusterGroup = clusterGroupRef.current;
      clusterGroup.clearLayers();

      const markers: L.Marker[] = [];

      customers.forEach((c) => {
        const wilayah = wilayahMap.get(c.kode_wilayah);
        const color = safeColor(wilayah?.warna, '#3B6EA8');
        const isSpatialAnomaly = Boolean(c.spatial_anomaly);
        const isColocationAnomaly = Boolean(c.colocation_anomaly);

        const borderColor = isSpatialAnomaly ? '#EF4444' : isColocationAnomaly ? '#A855F7' : 'rgba(255, 255, 255, 0.95)';
        const ringHtml = isSpatialAnomaly
          ? '<div style="position: absolute; width: 14px; height: 14px; border-radius: 50%; border: 1.2px solid #EF4444; background: rgba(239, 68, 68, 0.18); animation: anomaly-beacon 2.4s infinite ease-in-out; pointer-events: none;"></div>'
          : isColocationAnomaly
          ? '<div style="position: absolute; width: 14px; height: 14px; border-radius: 50%; border: 1.2px solid #A855F7; background: rgba(168, 85, 247, 0.18); animation: anomaly-beacon 2.4s infinite ease-in-out; pointer-events: none;"></div>'
          : '';

        const badgeHtml = isSpatialAnomaly
          ? '<div style="position: absolute; top: -3px; right: -3px; width: 8px; height: 8px; border-radius: 50%; background-color: #EF4444; border: 1px solid white; display: flex; align-items: center; justify-content: center; font-size: 6px; color: white; font-weight: 800; font-family: monospace;">!</div>'
          : isColocationAnomaly
          ? '<div style="position: absolute; top: -3px; right: -3px; width: 8px; height: 8px; border-radius: 50%; background-color: #A855F7; border: 1px solid white; display: flex; align-items: center; justify-content: center; font-size: 6px; color: white; font-weight: 800; font-family: monospace;" title="Titik Dobel Beda Wilayah">⇄</div>'
          : c.is_flagged
          ? '<div style="position: absolute; top: -2px; right: -2px; width: 5px; height: 5px; border-radius: 50%; background-color: #F59E0B; border: 0.8px solid white;"></div>'
          : '';

        const customIcon = L.divIcon({
          className: 'gis-point-marker',
          html: `
            <div style="position: relative; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center;">
              ${ringHtml}
              <div style="width: 7.5px; height: 7.5px; border-radius: 50%; background-color: ${color}; border: 0.6px solid ${borderColor}; box-shadow: 0 0.5px 1.5px rgba(0,0,0,0.25); transition: transform 0.15s ease;"></div>
              ${badgeHtml}
            </div>
          `,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
          popupAnchor: [0, -8],
        });

        const marker = L.marker([c.latitude, c.longitude], { icon: customIcon });

        const safeCode = escapeHtml(c.kode_pelanggan);
        const safeGol = escapeHtml(c.golongan);
        const safeName = escapeHtml(displayName(c.nama_pelanggan, userRole));
        const safeAlamat = escapeHtml(displayAddress(c.alamat, userRole));
        const safeWilayah = escapeHtml(c.nama_wilayah);
        const safeStatus = escapeHtml(c.status_sambungan);
        const safeAnomaly = c.spatial_anomaly ? escapeHtml(c.spatial_anomaly) : '';
        const safeColocation = c.colocation_anomaly ? escapeHtml(c.colocation_anomaly) : '';

        const popupHtml = `
          <div style="width: 250px; font-family: 'Inter', sans-serif; padding: 10px; line-height: 1.4;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(148, 163, 184, 0.2); padding-bottom: 6px; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${color};"></span>
                <span style="font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 13px; color: #1e293b;">${safeCode}</span>
              </div>
              <span style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: rgba(59, 110, 168, 0.12); color: #3B6EA8;">${safeGol}</span>
            </div>

            <div style="font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 2px;">${safeName}</div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px; line-height: 1.3;">${safeAlamat}</div>

            ${
              isSpatialAnomaly
                ? `
              <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 6px 8px; margin-bottom: 6px; font-size: 10px; color: #b91c1c;">
                <strong>⚠️ Anomali Batas:</strong> ${safeAnomaly}
              </div>
            `
                : ''
            }
            ${
              isColocationAnomaly
                ? `
              <div style="background: rgba(168, 85, 247, 0.12); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 6px; padding: 6px 8px; margin-bottom: 6px; font-size: 10px; color: #7e22ce;">
                <strong>📍 Titik Dobel Beda Wilayah:</strong> ${safeColocation}
              </div>
            `
                : ''
            }

            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #64748b; margin-bottom: 8px;">
              <span>Status: <strong>${safeStatus}</strong></span>
              <span>Wilayah: <strong>${safeWilayah}</strong></span>
            </div>

            <button id="btn-popup-${safeCode}" style="width: 100%; border: none; padding: 7px 10px; font-size: 11px; font-weight: 600; border-radius: 6px; background: #3B6EA8; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
              Lihat Detail & Titik GIS
            </button>
          </div>
        `;

        marker.bindPopup(popupHtml, { maxWidth: 280 });

        marker.on('click', () => {
          onSelectRef.current(c);
        });

        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-popup-${c.kode_pelanggan}`);
          if (btn) {
            btn.onclick = () => {
              onSelectRef.current(c);
              marker.closePopup();
            };
          }
        });

        markers.push(marker);
      });

      if (typeof (clusterGroup as any).addLayers === 'function') {
        (clusterGroup as any).addLayers(markers);
      } else {
        markers.forEach((m) => clusterGroup.addLayer(m));
      }
    } catch (err) {
      console.warn('CustomerClusterLayer build warning:', err);
    }

    return () => {
      if (clusterGroupRef.current) {
        try {
          clusterGroupRef.current.clearLayers();
        } catch {}
      }
    };
  }, [customers, wilayahMap, userRole, map]);

  return null;
}

export default function GisMap() {
  const { user } = useAuth();
  const { pelanggan: pelangganList, wilayah: wilayahList } = usePdamData();
  const { filters, update, reset } = useFilters();

  // Dynamic Golongan list from data + constants
  const availableGolongan = useMemo(() => {
    const set = new Set<string>();
    pelangganList.forEach((p) => {
      if (p.golongan) set.add(p.golongan);
    });
    GOLONGAN_LIST.forEach((g) => set.add(g));
    return Array.from(set).filter(Boolean);
  }, [pelangganList]);

  const golonganLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    pelangganList.forEach((p) => {
      if (p.golongan && p.uraian_golongan && !map[p.golongan]) {
        map[p.golongan] = p.uraian_golongan;
      }
    });
    return map;
  }, [pelangganList]);

  // Basemap state (default Positron)
  const [basemapKey, setBasemapKey] = useState<keyof typeof BASEMAPS>('positron');

  // Local Kecamatan selector (default 07 Praya Barat)
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>('07');

  // Search & Navigation
  const [searchQuery, setSearchQuery] = useState<string>(filters.q || '');
  const [targetPoint, setTargetPoint] = useState<[number, number] | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Pelanggan | null>(null);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);

  // Street View Privacy control (S8: do not load Google iframe automatically)
  const [loadStreetView, setLoadStreetView] = useState<boolean>(false);

  // Pulse animation state
  const [pulsePosition, setPulsePosition] = useState<[number, number] | null>(null);
  const [pulseActive, setPulseActive] = useState<boolean>(false);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drawers & Panes
  const [showLegend, setShowLegend] = useState<boolean>(true);
  const [legendTab, setLegendTab] = useState<'pipa' | 'wilayah'>('pipa');
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
  const [showTechnicalSymbols, setShowTechnicalSymbols] = useState<boolean>(false);

  // Kustomisasi warna per layer GeoJSON (tersimpan di browser localStorage)
  const [layerColors, setLayerColors] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('pdam_layer_colors');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const handleUpdateLayerColor = (layerId: string, newColor: string) => {
    setLayerColors((prev) => {
      const next = { ...prev, [layerId]: newColor };
      try {
        localStorage.setItem('pdam_layer_colors', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleResetLayerColor = (layerId: string) => {
    setLayerColors((prev) => {
      const next = { ...prev };
      delete next[layerId];
      try {
        localStorage.setItem('pdam_layer_colors', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Toggle hide/show per layer GeoJSON
  const toggleLayerVisibility = (layerId: string) => {
    setHiddenLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      return next;
    });
  };

  const showAllLayers = () => {
    setHiddenLayers(new Set());
  };

  const hideAllLayers = () => {
    if (uploadedLayers.length > 0) {
      setHiddenLayers(new Set(uploadedLayers.map((l) => l.id)));
    }
  };

  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Quick anomaly filter toggle
  const [onlyAnomaly, setOnlyAnomaly] = useState<boolean>(false);
  const [showCustomerPoints, setShowCustomerPoints] = useState<boolean>(true);

  // ── QGIS Live Sync State ──
  const [qgisLayerActive, setQgisLayerActive] = useState<boolean>(true);
  const [qgisAutoSync, setQgisAutoSync] = useState<boolean>(true);
  const [qgisData, setQgisData] = useState<any>(null);
  const [qgisLastSyncTime, setQgisLastSyncTime] = useState<string>('');
  const [qgisStats, setQgisStats] = useState<{ pipes: number; valves: number; dma: number }>({ pipes: 0, valves: 0, dma: 0 });
  const [showQgisModal, setShowQgisModal] = useState<boolean>(false);
  const [qgisLoading, setQgisLoading] = useState<boolean>(false);

  const [qgisSource, setQgisSource] = useState<string>('PostgreSQL / PostGIS');

  // Fetch QGIS data from PostGIS API first, with seamless fallback to public/qgis/jaringan_pipa.geojson
  const fetchQgisData = useCallback(async (isManual = false) => {
    try {
      if (isManual) setQgisLoading(true);
      let json: any = null;
      let activeSource = 'PostgreSQL / PostGIS Server';

      let isDbConnected = false;
      let dbEmptyNotice = '';

      // Cek apakah ada file GeoJSON yang sebelumnya diunggah oleh pengguna di browser ini
      let localGeoJson: any = null;
      try {
        const localSaved = localStorage.getItem('pdam_user_qgis_geojson');
        if (localSaved) {
          localGeoJson = JSON.parse(localSaved);
        }
      } catch {}

      try {
        const dbRes = await fetch(`/api/gis/pipa?t=${Date.now()}`);
        if (dbRes.ok) {
          const dbJson = await dbRes.json();
          if (dbJson && Array.isArray(dbJson.features)) {
            isDbConnected = true;
            if (dbJson.features.length > 0) {
              json = dbJson;
              activeSource = 'PostgreSQL / PostGIS (Neon Cloud)';
            } else {
              dbEmptyNotice = dbJson.notice || 'Tabel Neon terhubung, namun data fitur pipa & aksesoris masih 0 baris.';
            }
          }
        }
      } catch {}

      // Jika database belum ada datanya, gunakan file GeoJSON yang diunggah pengguna (JANGAN timpa dengan dummy!)
      if (!json && localGeoJson && Array.isArray(localGeoJson.features) && localGeoJson.features.length > 0) {
        json = localGeoJson;
        activeSource = 'File QGIS Unggahan Anda (Tersimpan Lokal)';
      }

      // Fallback ke folder public hanya jika tidak ada data sama sekali
      if (!json && !localGeoJson) {
        try {
          const fileRes = await fetch(`/qgis/jaringan_pipa.geojson?t=${Date.now()}`);
          if (fileRes.ok) {
            const fileJson = await fileRes.json();
            if (fileJson && Array.isArray(fileJson.features) && fileJson.features.length > 0) {
              json = fileJson;
              activeSource = 'Folder Cadangan (public/qgis)';
            }
          }
        } catch {}
      }

      if (!json) {
        if (isDbConnected && dbEmptyNotice) {
          setQgisSource('PostgreSQL / PostGIS (Neon Cloud)');
          setQgisStats({ pipes: 0, valves: 0, dma: 0 });
          if (isManual) {
            toast.info(dbEmptyNotice, { duration: 6000 });
          }
          return;
        }
        throw new Error('Data QGIS belum tersedia');
      }

      setQgisData(json);
      setQgisSource(activeSource);
      const now = new Date();
      setQgisLastSyncTime(now.toLocaleTimeString('id-ID'));

      let pipes = 0;
      let valves = 0;
      let dma = 0;
      if (Array.isArray(json.features)) {
        json.features.forEach((f: any) => {
          const type = f.geometry?.type;
          if (type === 'LineString' || type === 'MultiLineString') pipes++;
          else if (type === 'Point') valves++;
          else if (type === 'Polygon' || type === 'MultiPolygon') dma++;
        });
      }
      setQgisStats({ pipes, valves, dma });

      if (isManual) {
        toast.success(`Data QGIS berhasil disinkronkan (${pipes} jalur pipa, ${valves} aksesoris)`);
      }
    } catch (err: any) {
      if (isManual) {
        toast.error('Gagal membaca data QGIS dari public/qgis/jaringan_pipa.geojson');
      }
    } finally {
      if (isManual) setQgisLoading(false);
    }
  }, []);

  // Initial QGIS data load
  useEffect(() => {
    fetchQgisData(false);
  }, [fetchQgisData]);

  // Realtime Polling (checks every 5 seconds if enabled)
  useEffect(() => {
    if (!qgisAutoSync) return;
    const interval = setInterval(() => {
      fetchQgisData(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [qgisAutoSync, fetchQgisData]);

  // Handle multi-file GeoJSON upload & smart layer merging (Pipa + Valve + Aksesoris)
  const handleProcessGeoJsonFiles = async (inputFiles: FileList | File[] | File) => {
    const fileList: File[] = (inputFiles instanceof File) 
      ? [inputFiles] 
      : Array.from(inputFiles as any);

    if (fileList.length === 0) return;

    try {
      let currentFeatures: any[] = [];
      if (qgisData && Array.isArray(qgisData.features)) {
        currentFeatures = [...qgisData.features];
      }

      const fileNames: string[] = [];
      let totalPipes = 0;
      let totalValves = 0;

      for (const file of fileList) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed || (!parsed.features && parsed.type !== 'FeatureCollection')) {
          toast.error(`File ${file.name} bukan format GeoJSON FeatureCollection yang valid.`);
          continue;
        }

        const features = Array.isArray(parsed.features) ? parsed.features : [];
        const layerTag = file.name.replace(/\.geojson$/i, '').toLowerCase();

        const fileLines = features.filter((f: any) => {
          const t = f?.geometry?.type;
          return t === 'LineString' || t === 'MultiLineString';
        });

        const filePoints = features.filter((f: any) => f?.geometry?.type === 'Point');

        // Jika file membawa garis pipa (misal: existing.geojson), perbarui layer pipa
        if (fileLines.length > 0) {
          // Tandai metadata sumber layer dengan nama file persis
          fileLines.forEach((l: any) => {
            if (!l.properties) l.properties = {};
            l.properties.layer_source = file.name;
          });

          // Bersihkan garis lama yang berasal dari sumber sama atau ganti pipa default
          currentFeatures = currentFeatures.filter((f: any) => {
            const t = f?.geometry?.type;
            if (t !== 'LineString' && t !== 'MultiLineString') return true;
            const src = String(f?.properties?.layer_source || '').toLowerCase();
            if (!src) return false;
            return src !== file.name.toLowerCase() && src !== layerTag;
          });

          currentFeatures.push(...fileLines);
          totalPipes += fileLines.length;
        }

        // Jika file membawa titik aksesoris (misal: valve.geojson, airvalve.geojson)
        if (filePoints.length > 0) {
          filePoints.forEach((p: any) => {
            if (!p.properties) p.properties = {};
            p.properties.layer_source = file.name;
          });

          // Hapus titik lama dari layer_source yang sama agar tidak duplikat
          currentFeatures = currentFeatures.filter((f: any) => {
            if (f?.geometry?.type !== 'Point') return true;
            const src = String(f?.properties?.layer_source || '').toLowerCase();
            if (!src) return false;
            return src !== file.name.toLowerCase() && src !== layerTag;
          });

          currentFeatures.push(...filePoints);
          totalValves += filePoints.length;
        }

        fileNames.push(file.name);
      }

      if (currentFeatures.length === 0) {
        toast.error('Tidak ada fitur spasial yang berhasil diekstrak.');
        return;
      }

      const combinedCollection = {
        type: 'FeatureCollection',
        name: 'PDAM_Lombok_Tengah_MultiLayer',
        crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
        features: currentFeatures,
      };

      // 1. Simpan di localStorage agar tetap muncul saat refresh
      try {
        localStorage.setItem('pdam_user_qgis_geojson', JSON.stringify(combinedCollection));
      } catch (storageErr) {
        console.warn('LocalStorage browser penuh, data aktif di sesi memori:', storageErr);
      }

      setQgisData(combinedCollection);
      setQgisLayerActive(true);
      // Pastikan file yang baru diunggah langsung tampil (tidak ter-hide)
      setHiddenLayers((prev) => {
        const next = new Set(prev);
        for (const fn of fileNames) {
          next.delete(fn);
        }
        return next;
      });

      const now = new Date();
      setQgisLastSyncTime(now.toLocaleTimeString('id-ID') + ` (${fileNames.join(', ')})`);

      let pipes = 0;
      let valves = 0;
      let dma = 0;
      currentFeatures.forEach((f: any) => {
        const type = f.geometry?.type;
        if (type === 'LineString' || type === 'MultiLineString') pipes++;
        else if (type === 'Point') valves++;
        else if (type === 'Polygon' || type === 'MultiPolygon') dma++;
      });
      setQgisStats({ pipes, valves, dma });

      toast.success(`Berhasil memuat ${fileNames.length} file layer (${pipes} pipa, ${valves} aksesoris)`);
      setShowQgisModal(false);

      // 2. Unggah data gabungan ke Neon Cloud DB agar tersinkron ke SEMUA device & laptop lain
      fetch('/api/gis/pipa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(combinedCollection),
      })
        .then(async (r) => {
          if (r.ok) {
            const resJson = await r.json();
            if (resJson.savedCount) {
              toast.success(`Tersinkron ke Cloud Neon (${resJson.savedCount} fitur). Semua device sekarang menampilkan data ini!`, { duration: 5000 });
            }
          }
        })
        .catch(() => {});
    } catch (err: any) {
      console.error('Error memproses file GeoJSON:', err);
      toast.error('Gagal membaca file: ' + (err?.message || 'Format tidak sesuai'));
    }
  };

  // Reset / Hapus Seluruh Layer Kustom dari browser
  const handleClearCustomLayers = () => {
    try {
      localStorage.removeItem('pdam_user_qgis_geojson');
      setHiddenLayers(new Set());
      setQgisData(null);
      setQgisStats({ pipes: 0, valves: 0, dma: 0 });
      fetchQgisData(true);
      toast.info('Seluruh layer kustom telah dibersihkan. Memuat ulang dari server.');
    } catch {}
  };

  // Hapus satu file layer GeoJSON tertentu secara spesifik
  const handleDeleteLayer = (layerId: string, layerName: string) => {
    if (!qgisData || !Array.isArray(qgisData.features)) return;

    const remainingFeatures = qgisData.features.filter((f: any) => {
      const key = getFeatureLayerKey(f);
      return key !== layerId && key.toLowerCase() !== layerId.toLowerCase();
    });

    const updatedCollection = {
      ...qgisData,
      features: remainingFeatures,
    };

    try {
      if (remainingFeatures.length === 0) {
        localStorage.removeItem('pdam_user_qgis_geojson');
      } else {
        localStorage.setItem('pdam_user_qgis_geojson', JSON.stringify(updatedCollection));
      }
    } catch {}

    setQgisData(updatedCollection);

    // Hitung ulang statistik
    let pipes = 0;
    let valves = 0;
    let dma = 0;
    remainingFeatures.forEach((f: any) => {
      const type = f.geometry?.type;
      if (type === 'LineString' || type === 'MultiLineString') pipes++;
      else if (type === 'Point') valves++;
      else if (type === 'Polygon' || type === 'MultiPolygon') dma++;
    });
    setQgisStats({ pipes, valves, dma });

    setHiddenLayers((prev) => {
      const next = new Set(prev);
      next.delete(layerId);
      return next;
    });

    toast.success(`Layer "${layerName}" berhasil dihapus dari peta.`);

    // Jika seluruh layer habis, muat ulang dari server fallback
    if (remainingFeatures.length === 0) {
      fetchQgisData(true);
    }
  };

  // Kalkulasi statistik rincian layer QGIS untuk Legenda Dinamis
  const qgisBreakdown = useMemo(() => {
    const result = {
      transmisi: 0,
      distribusi: 0,
      retikulasi: 0,
      valves: 0,
      airvalves: 0,
      washouts: 0,
      reservoirs: 0,
      ipas: 0,
      others: 0,
    };

    if (!qgisData || !Array.isArray(qgisData.features)) return result;

    for (const f of qgisData.features) {
      const type = f.geometry?.type;
      const props = f.properties || {};

      if (type === 'LineString' || type === 'MultiLineString') {
        const rawKat = String(getProp(props, ['kategori', 'category', 'fungsi', 'jenis', 'kelas', 'type']) || '').toLowerCase();
        const rawDiam = getProp(props, ['diameter_mm', 'diameter', 'diam', 'dia', 'dn', 'ukuran', 'd_mm', 'size', 'dim']) || 100;
        const diam = Number(String(rawDiam).replace(/[^\d.-]/g, '')) || 100;

        if (rawKat.includes('transmisi') || diam >= 200) {
          result.transmisi++;
        } else if (rawKat.includes('retikulasi') || diam <= 90) {
          result.retikulasi++;
        } else {
          result.distribusi++;
        }
      } else if (type === 'Point') {
        const meta = getAccessoryMeta(props);
        if (meta.category === 'valve') result.valves++;
        else if (meta.category === 'airvalve') result.airvalves++;
        else if (meta.category === 'washout') result.washouts++;
        else if (meta.category === 'reservoir') result.reservoirs++;
        else if (meta.category === 'ipa') result.ipas++;
        else result.others++;
      }
    }

    return result;
  }, [qgisData]);

  // Ekstraksi layer-layer GeoJSON yang diunggah / aktif dari data QGIS untuk Legenda interaktif (hide/show)
  const uploadedLayers = useMemo<QgisLayerItem[]>(() => {
    if (!qgisData || !Array.isArray(qgisData.features) || qgisData.features.length === 0) {
      return [];
    }

    const map = new Map<string, { count: number; geomType: 'line' | 'point' | 'polygon'; color: string; category: string }>();

    for (const f of qgisData.features) {
      const geomType = f?.geometry?.type;
      if (geomType === 'Polygon' || geomType === 'MultiPolygon') continue;

      const layerId = getFeatureLayerKey(f);
      const isLine = geomType === 'LineString' || geomType === 'MultiLineString';
      const isPoint = geomType === 'Point';

      if (!map.has(layerId)) {
        let color = '#2563EB';
        let category = 'Jalur Pipa';
        let type: 'line' | 'point' | 'polygon' = 'line';

        if (isPoint) {
          type = 'point';
          const meta = getAccessoryMeta(f?.properties || {});
          color = meta.color;
          category = meta.label;
        } else if (isLine) {
          type = 'line';
          const lowerId = layerId.toLowerCase();
          if (lowerId.includes('transmisi')) {
            color = '#E11D48';
            category = 'Pipa Transmisi';
          } else if (lowerId.includes('retikulasi')) {
            color = '#0284C7';
            category = 'Pipa Retikulasi';
          } else {
            color = '#2563EB';
            category = 'Pipa Distribusi';
          }
        }

        map.set(layerId, { count: 0, geomType: type, color, category });
      }

      const item = map.get(layerId)!;
      item.count++;
    }

    return Array.from(map.entries())
      .map(([id, info]) => ({
        id,
        name: id,
        category: info.category,
        geomType: info.geomType,
        count: info.count,
        defaultColor: info.color,
        color: layerColors[id] || info.color,
      }))
      .sort((a, b) => {
        if (a.geomType === 'line' && b.geomType !== 'line') return -1;
        if (a.geomType !== 'line' && b.geomType === 'line') return 1;
        return a.name.localeCompare(b.name);
      });
  }, [qgisData, layerColors]);

  // Wilayah Map lookup
  const wilayahMap = useMemo(() => {
    return new Map<string, WilayahAcuan>(wilayahList.map((w: WilayahAcuan) => [w.kode, w]));
  }, [wilayahList]);

  // Trigger pulse helper
  const triggerPulse = useCallback((lat: number, lng: number) => {
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    setPulsePosition([lat, lng]);
    setPulseActive(true);
    pulseTimerRef.current = setTimeout(() => {
      setPulseActive(false);
      setPulsePosition(null);
    }, 3800);
  }, []);

  // Stable customer selection handler (fixes B4 marker flicker)
  const handleSelectCustomer = useCallback((customer: Pelanggan) => {
    setSelectedCustomer(customer);
    setLoadStreetView(false); // Reset Street View iframe on change
    setTargetPoint([customer.latitude, customer.longitude]);
    triggerPulse(customer.latitude, customer.longitude);
  }, [triggerPulse]);

  // Synchronize URL search params (e.g. redirected from Dashboard "Lihat di Peta" or "Tinjau di Peta")
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('search');
    const anomaliParam = params.get('anomali');
    const kualParam = params.get('kual') || params.get('quality');

    if (codeParam && pelangganList.length > 0) {
      const match = pelangganList.find((p: Pelanggan) => p.kode_pelanggan === codeParam);
      if (match) {
        handleSelectCustomer(match);
      }
    }

    if (anomaliParam === '1') {
      setOnlyAnomaly(true);
    }

    if (kualParam === 'colocation') {
      update({ quality: 'colocation' });
    } else if (kualParam === 'anomaly') {
      update({ quality: 'anomaly' });
    }
  }, [pelangganList, handleSelectCustomer, update]);

  // Fullscreen listener
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    const el = mapContainerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // Filter customers by selected kecamatan
  const kecamatanCustomers = useMemo(() => {
    if (selectedKecamatan === 'all') return pelangganList;
    return pelangganList.filter((p: Pelanggan) => p.kode_kecamatan === selectedKecamatan);
  }, [pelangganList, selectedKecamatan]);

  // Anomaly & colocation counts in active kecamatan
  const anomalyCount = useMemo(() => {
    return kecamatanCustomers.filter((p: Pelanggan) => Boolean(p.spatial_anomaly)).length;
  }, [kecamatanCustomers]);

  const colocationCount = useMemo(() => {
    return kecamatanCustomers.filter((p: Pelanggan) => Boolean(p.colocation_anomaly)).length;
  }, [kecamatanCustomers]);

  // Filter pipeline
  const filteredCustomers = useMemo(() => {
    return kecamatanCustomers.filter((item: Pelanggan) => {
      if (filters.wilayah !== 'all' && item.kode_wilayah !== filters.wilayah) {
        return false;
      }
      if (filters.golongan !== 'all' && item.golongan !== filters.golongan) {
        return false;
      }
      if (filters.status !== 'all' && item.status_sambungan !== filters.status) {
        return false;
      }
      if (filters.quality === 'flagged' && !item.is_flagged) {
        return false;
      }
      if (filters.quality === 'valid' && item.is_flagged) {
        return false;
      }
      if ((filters.quality === 'anomaly' || onlyAnomaly) && !item.spatial_anomaly) {
        return false;
      }
      if (filters.quality === 'colocation' && !item.colocation_anomaly) {
        return false;
      }
      return true;
    });
  }, [kecamatanCustomers, filters.wilayah, filters.golongan, filters.status, filters.quality, onlyAnomaly]);

  // Autocomplete search suggestions
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase().trim();
    return kecamatanCustomers
      .filter((p: Pelanggan) => p.kode_pelanggan.toLowerCase().includes(q) || p.nama_pelanggan.toLowerCase().includes(q))
      .slice(0, 6);
  }, [searchQuery, kecamatanCustomers]);

  const handleSelectSearchResult = (c: Pelanggan) => {
    handleSelectCustomer(c);
    setSearchQuery('');
  };

  // Reset map view
  const handleResetMap = () => {
    setTargetPoint(CENTER_PRAYA_BARAT);
    reset();
    setOnlyAnomaly(false);
    setSelectedCustomer(null);
    setLoadStreetView(false);
    setPulseActive(false);
    setPulsePosition(null);
    toast.info('Tampilan peta dikembalikan ke posisi awal.');
  };

  // Geolocation
  const handleGeolocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setTargetPoint([pos.coords.latitude, pos.coords.longitude]);
          toast.success('Peta difokuskan ke koordinat GPS perangkat Anda.');
        },
        () => {
          toast.error('Tidak dapat mendeteksi lokasi GPS perangkat Anda.');
        }
      );
    } else {
      toast.error('Browser tidak mendukung geolokasi GPS.');
    }
  };

  // Copy coordinates
  const handleCopyCoords = (lat: number, lng: number) => {
    if (!canSeePII(user?.role)) {
      toast.warning('Akses Pimpinan: Koordinat presisi dibatasi oleh regulasi privasi UU PDP.');
      return;
    }
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    setCopiedCoords(true);
    toast.success('Koordinat WGS84 tersalin ke clipboard.');
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  // Legend click toggles filter for that wilayah
  const handleLegendClick = (kodeWilayah: string) => {
    if (filters.wilayah === kodeWilayah) {
      update({ wilayah: 'all' });
    } else {
      update({ wilayah: kodeWilayah });
      const w = wilayahMap.get(kodeWilayah);
      if (w) {
        setTargetPoint([w.centerLat, w.centerLng]);
      }
    }
  };

  const selectedKecamatanObj = KECAMATAN_LIST.find((k) => k.kode === selectedKecamatan);
  const userCanSeePII = canSeePII(user?.role);

  return (
    <div
      ref={mapContainerRef}
      className={`relative w-full overflow-hidden bg-background ${
        isFullscreen ? 'h-screen' : 'h-[calc(100vh-3.5rem)]'
      }`}
    >
      {/* ── Top Left Control Cluster (Search, Kecamatan, Quick Filters) ── */}
      <div className="absolute top-3 left-3 z-[450] flex flex-col gap-2" style={{ maxWidth: 'calc(100% - 75px)' }}>
        {/* Row 1: Search Bar + Kecamatan Dropdown */}
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative shadow-sm rounded-xl w-60 sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari kode atau nama pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-7 h-9 text-xs rounded-xl border-border bg-card/95 backdrop-blur-md shadow-xs font-sans text-foreground focus-visible:ring-1 focus-visible:ring-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            )}

            {/* Autocomplete Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-10 left-0 right-0 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-xl p-1.5 space-y-0.5 z-50">
                {searchResults.map((item: Pelanggan) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectSearchResult(item)}
                    className="p-2 rounded-lg hover:bg-muted/70 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: safeColor(wilayahMap.get(item.kode_wilayah)?.warna, '#3B6EA8') }}
                      />
                      <div className="flex flex-col truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-foreground text-xs">{item.kode_pelanggan}</span>
                          {item.spatial_anomaly && (
                            <span className="text-[9px] bg-rose-500/10 text-rose-600 dark:text-rose-400 px-1 py-0.2 rounded font-semibold border border-rose-500/20">
                              Anomali
                            </span>
                          )}
                          {item.colocation_anomaly && (
                            <span className="text-[9px] bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1 py-0.2 rounded font-semibold border border-purple-500/20">
                              Titik Dobel
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground truncate">
                          {displayName(item.nama_pelanggan, user?.role)} ({item.nama_wilayah})
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px] ml-2 shrink-0">
                      {item.golongan}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Kecamatan Dropdown */}
          <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl px-2 py-0.5 shadow-xs flex items-center gap-1.5 h-9">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Select
              value={selectedKecamatan}
              onValueChange={(val) => {
                setSelectedKecamatan(val);
                update({ wilayah: 'all' });
                setSelectedCustomer(null);
              }}
            >
              <SelectTrigger className="h-7 border-0 bg-transparent text-xs font-medium focus:ring-0 p-0 pr-1 w-[130px]">
                <SelectValue placeholder="Kecamatan" />
              </SelectTrigger>
              <SelectContent className="max-h-80 border-border bg-card">
                <SelectItem value="all" className="text-xs">
                  Semua Kecamatan ({KECAMATAN_LIST.length})
                </SelectItem>
                {KECAMATAN_LIST.map((k) => (
                  <SelectItem key={k.kode} value={k.kode} className="text-xs">
                    <span className="font-mono font-bold mr-1 text-primary">{k.kode}</span> {k.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Action Pills (Filter, Anomaly, Colocation, Basemap) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Anomaly Quick Filter Pill */}
          {anomalyCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const next = !onlyAnomaly;
                setOnlyAnomaly(next);
                if (next && filters.quality === 'colocation') {
                  update({ quality: 'all' });
                }
              }}
              className={`h-8 px-2.5 rounded-xl border shadow-xs gap-1.5 text-[11px] font-medium bg-card/95 backdrop-blur-md ${
                onlyAnomaly
                  ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-semibold'
                  : 'border-border text-foreground hover:bg-muted'
              }`}
              title="Filter hanya pelanggan dengan anomali batas wilayah"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
              <span>Anomali Batas</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-mono font-semibold">
                {anomalyCount}
              </span>
            </Button>
          )}

          {/* Colocation Anomaly Quick Filter Pill */}
          {colocationCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOnlyAnomaly(false);
                update({ quality: filters.quality === 'colocation' ? 'all' : 'colocation' });
              }}
              className={`h-8 px-2.5 rounded-xl border shadow-xs gap-1.5 text-[11px] font-medium bg-card/95 backdrop-blur-md ${
                filters.quality === 'colocation'
                  ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-semibold'
                  : 'border-border text-foreground hover:bg-muted'
              }`}
              title="Filter pelanggan dengan koordinat sama di wilayah berbeda"
            >
              <MapPin className="w-3.5 h-3.5 text-purple-500" />
              <span>Titik Dobel</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-mono font-semibold">
                {colocationCount}
              </span>
            </Button>
          )}

          {/* Filter Popover Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`h-8 px-2.5 rounded-xl border-border shadow-xs gap-1.5 text-[11px] font-medium bg-card/95 backdrop-blur-md ${
              filters.wilayah !== 'all' || filters.golongan !== 'all' || filters.status !== 'all' || filters.quality !== 'all'
                ? 'border-primary text-primary font-semibold'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
            {(filters.wilayah !== 'all' || filters.golongan !== 'all' || filters.status !== 'all' || filters.quality !== 'all') && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </Button>

          {/* Basemap Switcher */}
          <Select value={basemapKey} onValueChange={(val: any) => setBasemapKey(val)}>
            <SelectTrigger className="h-8 px-2.5 rounded-xl border-border bg-card/95 backdrop-blur-md shadow-xs text-[11px] font-medium w-auto sm:w-36">
              <Layers className="w-3.5 h-3.5 mr-1 text-primary shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border bg-card">
              <SelectItem value="positron">Positron (Terang Minimalis)</SelectItem>
              <SelectItem value="cerah">Peta Cerah (Humaniter)</SelectItem>
              <SelectItem value="osm">OpenStreetMap (Standar)</SelectItem>
              <SelectItem value="satellite">Citra Satelit (Esri)</SelectItem>
              <SelectItem value="topo">Topografi & Relief</SelectItem>
              <SelectItem value="vektor">Peta Vektor Mandiri (GL)</SelectItem>
            </SelectContent>
          </Select>

          {/* QGIS Live Sync Pill */}
          <div className="flex items-center bg-card/95 backdrop-blur-md border border-border rounded-xl p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setQgisLayerActive(!qgisLayerActive)}
              className={`h-7 px-2.5 rounded-lg flex items-center gap-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                qgisLayerActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Klik untuk tampilkan / sembunyikan jaringan pipa QGIS"
            >
              <span className={`w-2 h-2 rounded-full ${qgisLayerActive ? 'bg-blue-600 animate-pulse' : 'bg-neutral-300'}`} />
              <span>QGIS Pipa</span>
              {qgisStats.pipes > 0 && (
                <span className="text-[9px] px-1 py-0.2 rounded font-mono bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">
                  {qgisStats.pipes}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => fetchQgisData(true)}
              disabled={qgisLoading}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              title="Sinkronkan data dari file QGIS sekarang"
            >
              <RefreshCw className={`w-3 h-3 ${qgisLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setShowQgisModal(true)}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              title="Pengaturan & Panduan QGIS Realtime"
            >
              <Radio className="w-3 h-3 text-blue-500" />
            </button>
          </div>

          {/* Toggle Titik Pelanggan (Lingkaran Biru) */}
          <button
            type="button"
            onClick={() => setShowCustomerPoints(!showCustomerPoints)}
            className={`h-8 px-2.5 rounded-xl border flex items-center gap-1.5 text-[11px] font-medium transition-colors cursor-pointer bg-card/95 backdrop-blur-md shadow-xs ${
              showCustomerPoints
                ? 'border-blue-300 dark:border-blue-800 bg-blue-50/70 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
            title="Klik untuk tampilkan / sembunyikan lingkaran titik pelanggan"
          >
            <span className={`w-2 h-2 rounded-full ${showCustomerPoints ? 'bg-blue-600' : 'bg-neutral-300'}`} />
            <span>Titik Pelanggan</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">
              {filteredCustomers.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── Expandable Filter Modal/Card ── */}
      {showFilters && (
        <Card className="absolute top-[6.75rem] left-3 z-[450] w-80 rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-top-2">
          <CardContent className="p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-heading font-semibold text-xs text-foreground flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-primary" />
                Filter Titik Sebaran GIS
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  reset();
                  setOnlyAnomaly(false);
                }}
                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
              >
                Reset
              </Button>
            </div>

            {/* Filter Wilayah */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Wilayah ({wilayahList.length})
              </label>
              <Select
                value={filters.wilayah}
                onValueChange={(val) => update({ wilayah: val })}
              >
                <SelectTrigger className="h-8 text-xs rounded-xl border-border bg-background">
                  <SelectValue placeholder="Semua Wilayah" />
                </SelectTrigger>
                <SelectContent className="max-h-56 border-border bg-card">
                  <SelectItem value="all">Semua Wilayah ({wilayahList.length})</SelectItem>
                  {wilayahList.map((w: WilayahAcuan) => (
                    <SelectItem key={w.kode} value={w.kode}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: safeColor(w.warna, '#3B6EA8') }}
                        />
                        <span>{w.kode} - {w.nama}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Golongan & Status Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Golongan
                </label>
                <Select
                  value={filters.golongan}
                  onValueChange={(val) => update({ golongan: val })}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl border-border bg-background">
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-card">
                    <SelectItem value="all">Semua Golongan</SelectItem>
                    {availableGolongan.map((g) => {
                      const label = golonganLabelMap[g] || GOLONGAN_META[g]?.label || '';
                      return (
                        <SelectItem key={g} value={g}>
                          {g} {label && label !== g ? `(${label})` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Status
                </label>
                <Select
                  value={filters.status}
                  onValueChange={(val) => update({ status: val })}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl border-border bg-background">
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-card">
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="Aktif">Aktif</SelectItem>
                    <SelectItem value="Nonaktif">Nonaktif</SelectItem>
                    <SelectItem value="Putus">Putus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Toggles */}
            <div className="pt-2 border-t border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground">Anomali Batas Wilayah</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOnlyAnomaly(!onlyAnomaly)}
                  className={`h-6 px-2 rounded-lg text-xs font-mono ${
                    onlyAnomaly
                      ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 font-semibold'
                      : 'text-muted-foreground border-border'
                  }`}
                >
                  {onlyAnomaly ? 'Aktif' : 'Semua'}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground">Titik Dobel Beda Wilayah</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => update({ quality: filters.quality === 'colocation' ? 'all' : 'colocation' })}
                  className={`h-6 px-2 rounded-lg text-xs font-mono ${
                    filters.quality === 'colocation'
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 font-semibold'
                      : 'text-muted-foreground border-border'
                  }`}
                >
                  {filters.quality === 'colocation' ? 'Aktif' : 'Semua'}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground">Data Perlu Verifikasi (Flag)</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => update({ quality: filters.quality === 'flagged' ? 'all' : 'flagged' })}
                  className={`h-6 px-2 rounded-lg text-xs font-mono ${
                    filters.quality === 'flagged'
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 font-semibold'
                      : 'text-muted-foreground border-border'
                  }`}
                >
                  {filters.quality === 'flagged' ? 'Aktif' : 'Semua'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Floating Right Action Buttons ── */}
      <div className="absolute top-3 right-3 z-[450] flex flex-col gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          className="w-9 h-9 p-0 rounded-xl border-border bg-card/95 backdrop-blur-md shadow-xs hover:bg-muted text-foreground"
          title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4 text-primary" /> : <Maximize2 className="w-4 h-4 text-primary" />}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleGeolocation}
          className="w-9 h-9 p-0 rounded-xl border-border bg-card/95 backdrop-blur-md shadow-xs hover:bg-muted text-foreground"
          title="Lokasi GPS Saya"
        >
          <Navigation className="w-4 h-4 text-primary" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleResetMap}
          className="w-9 h-9 p-0 rounded-xl border-border bg-card/95 backdrop-blur-md shadow-xs hover:bg-muted text-foreground"
          title="Reset Sudut Pandang & Filter"
        >
          <Compass className="w-4 h-4 text-muted-foreground" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLegend(!showLegend)}
          className={`w-9 h-9 p-0 rounded-xl border-border bg-card/95 backdrop-blur-md shadow-xs hover:bg-muted ${
            showLegend ? 'text-primary' : 'text-muted-foreground'
          }`}
          title="Tampilkan / Sembunyikan Legenda Wilayah"
        >
          {showLegend ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </Button>
      </div>

      {/* ── Notice Banner if Other Kecamatan Selected (Pilot Scope) ── */}
      {selectedKecamatan !== 'all' && selectedKecamatan !== '07' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[450] bg-card/95 backdrop-blur-md border border-amber-300 dark:border-amber-800 rounded-2xl p-4 shadow-xl max-w-md text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs">
            <Building2 className="w-4 h-4" />
            <span>Kecamatan {selectedKecamatanObj?.nama || selectedKecamatan}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Data spasial pilot aktif saat ini terkonsentrasi di <strong>Kecamatan 07 Praya Barat</strong> (642 titik pelanggan terverifikasi).
          </p>
          <Button
            size="sm"
            onClick={() => setSelectedKecamatan('07')}
            className="rounded-xl text-xs h-7 px-3 shadow-xs"
          >
            Beralih ke Kecamatan 07 Praya Barat
          </Button>
        </div>
      )}

      {/* ── Slide-over Detail & Map View Drawer ── */}
      {selectedCustomer && (
        <Card className="absolute top-3 right-14 bottom-4 z-[500] w-full max-w-sm rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4">
          {/* Header */}
          <div className="p-3.5 border-b border-border flex items-center justify-between bg-muted/40">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                style={{
                  backgroundColor: safeColor(wilayahMap.get(selectedCustomer.kode_wilayah)?.warna, '#3B6EA8'),
                }}
              />
              <div>
                <span className="font-heading font-semibold text-sm text-foreground block">
                  Detail Pelanggan
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {selectedCustomer.kode_pelanggan}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedCustomer(null);
                setLoadStreetView(false);
                setPulseActive(false);
                setPulsePosition(null);
              }}
              className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {/* Spatial Anomaly Notice */}
            {selectedCustomer.spatial_anomaly && (
              <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-semibold">
                  <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Anomali Batas Wilayah Terdeteksi</span>
                </div>
                <p className="text-rose-800 dark:text-rose-200 leading-relaxed text-[11px]">
                  {selectedCustomer.spatial_anomaly}
                </p>
                <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                  Rekomendasi: Koordinasikan dengan tim survei lapangan untuk penyesuaian kode wilayah acuan.
                </div>
              </div>
            )}

            {/* Co-location Anomaly Notice */}
            {selectedCustomer.colocation_anomaly && (
              <div className="p-3 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/80 dark:bg-purple-950/40 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-semibold">
                  <MapPin className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Titik Dobel Multi-Wilayah</span>
                </div>
                <p className="text-purple-800 dark:text-purple-200 leading-relaxed text-[11px]">
                  {selectedCustomer.colocation_anomaly}
                </p>
                <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                  Rekomendasi: Koordinat ini digunakan oleh lebih dari 1 wilayah berbeda. Verifikasi meteran fisik atau koreksi titik GPS di lapangan.
                </div>
              </div>
            )}

            {/* General Flag Notice */}
            {!selectedCustomer.spatial_anomaly && !selectedCustomer.colocation_anomaly && selectedCustomer.is_flagged && (
              <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Data Bertanda (Perlu Verifikasi)</span>
                </div>
                <p className="text-[11px]">{selectedCustomer.flag_reasons.join(', ')}</p>
              </div>
            )}

            {/* Identity Card */}
            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-base font-bold text-foreground">
                  {selectedCustomer.kode_pelanggan}
                </span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="font-mono text-xs">
                    {selectedCustomer.golongan}
                  </Badge>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                      STATUS_CONNECTION_META[selectedCustomer.status_sambungan]?.badgeClass ||
                      'bg-muted text-muted-foreground'
                    }`}
                  >
                    {selectedCustomer.status_sambungan}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Nama Pelanggan</div>
                <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <span>{displayName(selectedCustomer.nama_pelanggan, user?.role)}</span>
                  {!userCanSeePII && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono">
                      UU PDP
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Alamat</div>
                <div className="text-xs text-foreground/90 leading-relaxed">
                  {displayAddress(selectedCustomer.alamat, user?.role)}
                </div>
              </div>
            </div>

            {/* Coordinates Box */}
            <div className="p-2.5 rounded-xl border border-border bg-card flex items-center justify-between">
              <div className="font-mono text-xs text-foreground">
                <span className="text-muted-foreground mr-1">GPS:</span>
                <span className="font-semibold">
                  {displayCoordinates(selectedCustomer.latitude, selectedCustomer.longitude, user?.role)}
                </span>
              </div>
              {userCanSeePII && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyCoords(selectedCustomer.latitude, selectedCustomer.longitude)}
                  className="h-6 px-2 text-[10px] rounded-lg gap-1 border-border"
                >
                  {copiedCoords ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCoords ? 'Tersalin' : 'Salin'}</span>
                </Button>
              )}
            </div>

            {/* On-demand Street View (Fix S8: Coordinate Privacy) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  Pratinjau Citra Street View
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">WGS84</span>
              </div>

              {!userCanSeePII ? (
                <div className="p-4 rounded-xl border border-border bg-muted/20 text-center space-y-1.5">
                  <ShieldCheck className="w-6 h-6 text-muted-foreground mx-auto" />
                  <p className="text-xs font-medium text-foreground">Pratinjau Dibatasi</p>
                  <p className="text-[11px] text-muted-foreground">
                    Sesuai UU Perlindungan Data Pribadi (UU PDP), citra visual hunian tidak dapat diakses langsung oleh peran Pimpinan.
                  </p>
                </div>
              ) : !loadStreetView ? (
                <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 text-center space-y-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-medium text-foreground">
                    Citra Jalan di Sekitar Lokasi Pelanggan
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Klik tombol di bawah untuk memuat pratinjau interaktif Google Street View.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLoadStreetView(true)}
                    className="h-7 text-xs rounded-xl border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
                  >
                    <span>Muat Street View</span>
                  </Button>
                </div>
              ) : (
                <div className="relative w-full h-52 rounded-xl border border-border overflow-hidden bg-slate-950 shadow-inner">
                  <iframe
                    src={`https://maps.google.com/maps?layer=c&cbll=${selectedCustomer.latitude},${selectedCustomer.longitude}&cbp=12,0,0,0,0&output=svembed`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Street View ${selectedCustomer.kode_pelanggan}`}
                    className="absolute inset-0 w-full h-full"
                  />
                  <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 py-2 flex items-center justify-between pointer-events-auto">
                    <span className="text-[10px] text-white/90 font-medium">Google Street View</span>
                    <a
                      href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${selectedCustomer.latitude},${selectedCustomer.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-sky-300 hover:text-sky-200 font-medium flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-md"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Tab Baru
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Technical Specifications */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-mono">Wilayah Acuan</span>
                <div className="font-semibold text-foreground truncate mt-0.5">
                  {selectedCustomer.nama_wilayah}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  Kode: {selectedCustomer.kode_wilayah}
                </div>
              </div>

              <div className="p-2.5 rounded-xl border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-mono">Kecamatan</span>
                <div className="font-semibold text-foreground mt-0.5">
                  {KECAMATAN_LIST.find((k) => k.kode === selectedCustomer.kode_kecamatan)?.nama || 'Praya Barat'}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  Kode: {selectedCustomer.kode_kecamatan}
                </div>
              </div>

              <div className="p-2.5 rounded-xl border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-mono flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-primary" />
                  Nomor Meter
                </span>
                <div className="font-mono font-medium text-foreground truncate mt-0.5">
                  {selectedCustomer.nomor_meter || '-'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-mono flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-primary" />
                  Tanggal Pasang
                </span>
                <div className="font-medium text-foreground truncate mt-0.5">
                  {selectedCustomer.tanggal_pasang || '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Drawer Actions */}
          <div className="p-3 border-t border-border bg-muted/30 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTargetPoint([selectedCustomer.latitude, selectedCustomer.longitude]);
                triggerPulse(selectedCustomer.latitude, selectedCustomer.longitude);
              }}
              className="flex-1 h-8 rounded-xl text-xs gap-1.5"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Fokuskan Titik</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSelectedCustomer(null);
                setLoadStreetView(false);
                setPulseActive(false);
                setPulsePosition(null);
              }}
              className="h-8 px-4 rounded-xl text-xs"
            >
              Tutup
            </Button>
          </div>
        </Card>
      )}

      {/* ── Interactive GIS Legend Card (Pipelines & Wilayah) ── */}
      {showLegend && !selectedCustomer && (
        <Card className="absolute bottom-5 right-3 z-[450] w-80 max-h-[460px] rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          {/* Header with Tab Switcher */}
          <div className="p-2 border-b border-border flex items-center justify-between bg-muted/40 gap-1">
            <span className="font-heading font-semibold text-xs text-foreground shrink-0 pl-1">
              Legenda GIS
            </span>
            <div className="flex items-center bg-muted/70 rounded-lg p-0.5 border border-border/40">
              <button
                type="button"
                onClick={() => setLegendTab('pipa')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                  legendTab === 'pipa'
                    ? 'bg-background text-primary shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Pipa & Valve
              </button>
              <button
                type="button"
                onClick={() => setLegendTab('wilayah')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                  legendTab === 'wilayah'
                    ? 'bg-background text-primary shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Wilayah
              </button>
            </div>
          </div>

          {/* TAB 1: Jaringan Pipa & Aksesoris (QGIS) */}
          {legendTab === 'pipa' && (
            <>
              {/* Layer Summary & Global Action */}
              <div className="p-2 border-b border-border/50 bg-muted/20 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  <span>Layer File GeoJSON</span>
                  <Badge variant="secondary" className="font-mono text-[9px] px-1.5 py-0 h-4 font-semibold">
                    {uploadedLayers.length - hiddenLayers.size}/{uploadedLayers.length} Aktif
                  </Badge>
                </div>
                {uploadedLayers.length > 0 && (
                  hiddenLayers.size > 0 ? (
                    <button
                      type="button"
                      onClick={showAllLayers}
                      className="text-primary hover:underline text-[10px] font-semibold cursor-pointer"
                    >
                      Tampilkan Semua
                    </button>
                  ) : uploadedLayers.length > 1 ? (
                    <button
                      type="button"
                      onClick={hideAllLayers}
                      className="text-muted-foreground hover:text-foreground text-[10px] cursor-pointer"
                    >
                      Sembunyikan Semua
                    </button>
                  ) : null
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs">
                {/* 1. DAFTAR FILE GEOJSON YANG DIUNGGAH / AKTIF (Dapat di hide/show per layer) */}
                <div className="space-y-1.5">
                  {uploadedLayers.length === 0 ? (
                    <div className="p-3 text-center rounded-xl bg-muted/30 border border-dashed border-border/60">
                      <p className="text-[11px] text-muted-foreground">Belum ada file GeoJSON yang dimuat.</p>
                      <button
                        type="button"
                        onClick={() => setShowQgisModal(true)}
                        className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-medium shadow-xs hover:bg-primary/90 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Unggah File GeoJSON
                      </button>
                    </div>
                  ) : (
                    uploadedLayers.map((layer) => {
                      const isHidden = hiddenLayers.has(layer.id);
                      return (
                        <div
                          key={layer.id}
                          className={`group flex items-center justify-between p-1.5 px-2 rounded-xl border transition-all ${
                            isHidden
                              ? 'bg-muted/30 border-dashed border-border/60 opacity-60'
                              : 'bg-card hover:bg-muted/40 border-border/70 shadow-xs'
                          }`}
                        >
                          {/* Indicator & File Details */}
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {/* Interactive Color Picker (Ubah Warna Langsung dari Layer) */}
                            <label
                              className="relative cursor-pointer group/color shrink-0 flex items-center justify-center p-0.5 rounded-md hover:bg-muted/80 transition-all"
                              title="Klik untuk ubah warna layer ini langsung di peta"
                            >
                              <input
                                type="color"
                                value={layer.color}
                                onChange={(e) => handleUpdateLayerColor(layer.id, e.target.value)}
                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                              />
                              {layer.geomType === 'line' ? (
                                <div
                                  className="w-4 h-2 rounded-full border border-black/20 shadow-xs transition-transform group-hover/color:scale-125"
                                  style={{ backgroundColor: layer.color, height: '5px' }}
                                />
                              ) : (
                                <div
                                  className="w-3.5 h-3.5 rounded-full border-1.5 border-white shadow-xs transition-transform group-hover/color:scale-125 flex items-center justify-center ring-1 ring-black/15"
                                  style={{ backgroundColor: layer.color }}
                                >
                                  <div className="w-1 h-1 rounded-full bg-white/95" />
                                </div>
                              )}
                            </label>

                            <div className="flex flex-col min-w-0 flex-1 pr-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`font-mono text-[11px] font-semibold truncate ${
                                    isHidden ? 'line-through text-muted-foreground' : 'text-foreground'
                                  }`}
                                  title={layer.name}
                                >
                                  {layer.name}
                                </span>
                                {layerColors[layer.id] && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleResetLayerColor(layer.id);
                                    }}
                                    className="text-[8.5px] px-1 py-0 rounded bg-muted/90 text-muted-foreground hover:text-foreground font-sans cursor-pointer hover:bg-muted border border-border/50"
                                    title="Reset ke warna standar"
                                  >
                                    Reset
                                  </button>
                                )}
                              </div>
                              <span className="text-[9px] text-muted-foreground truncate">
                                {layer.category} • <strong className="font-mono text-foreground/80">{layer.count.toLocaleString('id-ID')}</strong> {layer.geomType === 'line' ? 'jalur' : 'titik'}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons: Hide/Show Toggle + Delete Layer */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleLayerVisibility(layer.id)}
                              className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                                isHidden
                                  ? 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                                  : 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground shadow-xs'
                              }`}
                              title={isHidden ? `Tampilkan layer ${layer.name} di peta` : `Sembunyikan layer ${layer.name} dari peta`}
                            >
                              {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Hapus file layer "${layer.name}" dari peta?`)) {
                                  handleDeleteLayer(layer.id, layer.name);
                                }
                              }}
                              className="p-1.5 rounded-lg text-xs text-muted-foreground/50 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title={`Hapus file layer ${layer.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                  {uploadedLayers.length > 0 && (
                    <div className="text-[9px] text-muted-foreground px-1 pt-0.5 flex items-center justify-between">
                      <span className="italic">💡 Klik warna layer untuk mengubahnya</span>
                      {Object.keys(layerColors).length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setLayerColors({});
                            try {
                              localStorage.removeItem('pdam_layer_colors');
                            } catch {}
                          }}
                          className="text-[8.5px] text-primary hover:underline font-medium cursor-pointer"
                        >
                          Reset Semua Warna
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Tombol Tambah Layer & Toggle Simbol Teknis */}
                <div className="pt-1 flex items-center justify-between border-t border-border/40">
                  <button
                    type="button"
                    onClick={() => setShowQgisModal(true)}
                    className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-medium cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Tambah / Kelola File
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTechnicalSymbols(!showTechnicalSymbols)}
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                  >
                    <span>{showTechnicalSymbols ? 'Tutup Simbol' : 'Panduan Simbol'}</span>
                    {showTechnicalSymbols ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {/* 2. PANDUAN SIMBOL TEKNIS (Collapsible) */}
                {showTechnicalSymbols && (
                  <div className="pt-2 border-t border-border/50 space-y-2 animate-in fade-in">
                    <div className="text-[9.5px] font-mono uppercase text-muted-foreground font-bold px-0.5">
                      Spesifikasi Simbol QGIS
                    </div>

                    {/* Transmisi */}
                    <div className="flex items-center justify-between p-1 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-1.5 rounded-full bg-[#E11D48] shrink-0" style={{ height: '4px' }} />
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-[10.5px]">Pipa Transmisi</span>
                          <span className="text-[8.5px] text-muted-foreground">Diameter ≥ 200 mm</span>
                        </div>
                      </div>
                      {qgisBreakdown.transmisi > 0 && (
                        <Badge variant="outline" className="font-mono text-[9px] px-1 py-0 h-4 border-rose-300 text-rose-600">
                          {qgisBreakdown.transmisi}
                        </Badge>
                      )}
                    </div>

                    {/* Distribusi Primer */}
                    <div className="flex items-center justify-between p-1 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-1 rounded-full bg-[#2563EB] shrink-0" style={{ height: '3px' }} />
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-[10.5px]">Distribusi Primer</span>
                          <span className="text-[8.5px] text-muted-foreground">Diameter 100 - 160 mm</span>
                        </div>
                      </div>
                      {qgisBreakdown.distribusi > 0 && (
                        <Badge variant="outline" className="font-mono text-[9px] px-1 py-0 h-4 border-blue-300 text-blue-600">
                          {qgisBreakdown.distribusi}
                        </Badge>
                      )}
                    </div>

                    {/* Retikulasi */}
                    <div className="flex items-center justify-between p-1 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 rounded-full bg-[#0284C7] shrink-0" style={{ height: '2px' }} />
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-[10.5px]">Pipa Retikulasi</span>
                          <span className="text-[8.5px] text-muted-foreground">Diameter ≤ 90 mm</span>
                        </div>
                      </div>
                      {qgisBreakdown.retikulasi > 0 && (
                        <Badge variant="outline" className="font-mono text-[9px] px-1 py-0 h-4 border-sky-300 text-sky-600">
                          {qgisBreakdown.retikulasi}
                        </Badge>
                      )}
                    </div>

                    {/* Valve Types Swatch */}
                    <div className="grid grid-cols-2 gap-1 pt-1">
                      <div className="flex items-center gap-1.5 p-1 rounded bg-muted/20 text-[10px]">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#D97706] border border-white shrink-0" />
                        <span className="truncate">Gate Valve</span>
                      </div>
                      <div className="flex items-center gap-1.5 p-1 rounded bg-muted/20 text-[10px]">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#0284C7] border border-white shrink-0" />
                        <span className="truncate">Air Valve</span>
                      </div>
                      <div className="flex items-center gap-1.5 p-1 rounded bg-muted/20 text-[10px]">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#7C3AED] border border-white shrink-0" />
                        <span className="truncate">Washout</span>
                      </div>
                      <div className="flex items-center gap-1.5 p-1 rounded bg-muted/20 text-[10px]">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#059669] border border-white shrink-0" />
                        <span className="truncate">Reservoir/IPA</span>
                      </div>
                    </div>

                    {/* Skala Ukuran Titik Valve */}
                    <div className="p-2 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                      <div className="text-[8.5px] font-mono text-muted-foreground font-semibold flex items-center justify-between">
                        <span>Skala Titik Valve:</span>
                        <span className="text-primary font-sans">Proporsional</span>
                      </div>
                      <div className="flex items-center justify-between pt-0.5 px-0.5">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-amber-500 border border-white shadow-xs" />
                          <span className="text-[8.5px] font-mono text-muted-foreground">≤50mm</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white shadow-xs" />
                          <span className="text-[8.5px] font-mono text-muted-foreground">100mm</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-white shadow-xs flex items-center justify-center">
                            <div className="w-1 h-1 rounded-full bg-white" />
                          </div>
                          <span className="text-[8.5px] font-mono text-muted-foreground">≥200mm</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: Wilayah Pelanggan */}
          {legendTab === 'wilayah' && (
            <>
              <div className="p-1.5 text-[10px] text-muted-foreground border-b border-border/50 bg-muted/10 font-mono px-2.5 flex items-center justify-between">
                <span>Klik untuk zoom wilayah:</span>
                <Badge variant="outline" className="font-mono text-[9px] py-0 px-1 h-4 bg-background">
                  {filteredCustomers.length} Titik
                </Badge>
              </div>

              <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                {wilayahList.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground font-mono">
                    Tidak ada data wilayah acuan.
                  </div>
                ) : (
                  wilayahList.map((w: WilayahAcuan) => {
                    const isSelected = filters.wilayah === w.kode;
                    const countInWilayah = pelangganList.filter((p: Pelanggan) => p.kode_wilayah === w.kode).length;

                    return (
                      <div
                        key={w.kode}
                        onClick={() => handleLegendClick(w.kode)}
                        className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer text-xs transition-colors border ${
                          isSelected
                            ? 'bg-primary/10 border-primary/40 font-semibold text-primary'
                            : 'hover:bg-muted/60 border-transparent text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                            style={{ backgroundColor: safeColor(w.warna, '#3B6EA8') }}
                          />
                          <span className="font-mono text-[11px]">{w.kode}</span>
                          <span className="text-[11px] truncate">{w.nama}</span>
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground ml-2">
                          {countInWilayah}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </Card>
      )}

      {/* ── Bottom Left Status Pill ── */}
      <div className="absolute bottom-4 left-3 z-[450] flex flex-wrap items-center gap-1.5">
        <div className="px-3 py-1.5 rounded-xl bg-card/95 backdrop-blur-md border border-border shadow-md text-xs font-mono flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-muted-foreground">Aktif:</span>
          <span className="font-bold text-foreground">{filteredCustomers.length.toLocaleString('id-ID')} Titik</span>
        </div>

        {anomalyCount > 0 && (
          <div
            onClick={() => {
              const next = !onlyAnomaly;
              setOnlyAnomaly(next);
              if (next && filters.quality === 'colocation') {
                update({ quality: 'all' });
              }
            }}
            className="px-2.5 py-1.5 rounded-xl bg-rose-50/90 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-md hover:bg-rose-100 transition-colors"
          >
            <AlertOctagon className="w-3 h-3 text-rose-600 dark:text-rose-400" />
            <span className="text-rose-800 dark:text-rose-200 font-semibold">
              {anomalyCount} Anomali Batas
            </span>
          </div>
        )}

        {colocationCount > 0 && (
          <div
            onClick={() => {
              setOnlyAnomaly(false);
              update({ quality: filters.quality === 'colocation' ? 'all' : 'colocation' });
            }}
            className="px-2.5 py-1.5 rounded-xl bg-purple-50/90 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-800 text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-md hover:bg-purple-100 transition-colors"
          >
            <MapPin className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            <span className="text-purple-800 dark:text-purple-200 font-semibold">
              {colocationCount} Titik Dobel
            </span>
          </div>
        )}
      </div>

      {/* ── Leaflet Map Container ── */}
      <MapContainer
        center={CENTER_PRAYA_BARAT}
        zoom={DEFAULT_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        maxBounds={LOMBOK_BOUNDS}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={true}
        className="w-full h-full"
        zoomControl={false}
      >
        {basemapKey !== 'vektor' && (
          <TileLayer
            key={basemapKey}
            attribution={(BASEMAPS[basemapKey] || BASEMAPS.positron).attribution}
            url={(BASEMAPS[basemapKey] || BASEMAPS.positron).url}
            subdomains={basemapKey === 'positron' ? 'abcd' : 'abc'}
            maxZoom={MAX_ZOOM}
            bounds={LOMBOK_BOUNDS}
          />
        )}

        <MapLibreLayer active={basemapKey === 'vektor'} />
        <MapController targetPoint={targetPoint} />
        <PulseOverlay position={pulsePosition} active={pulseActive} />

        {/* ── QGIS Realtime Pipeline & Accessories Layer ── */}
        <QgisVectorLayer
          active={qgisLayerActive}
          data={qgisData}
          hiddenLayers={hiddenLayers}
          layerColors={layerColors}
        />

        {showCustomerPoints && (
          <CustomerClusterLayer
            customers={filteredCustomers}
            wilayahMap={wilayahMap}
            userRole={user?.role}
            onSelectCustomer={handleSelectCustomer}
          />
        )}
      </MapContainer>

      {/* ── Modal Dialog: QGIS Realtime Hub ── */}
      <Dialog open={showQgisModal} onOpenChange={setShowQgisModal}>
        <DialogContent className="sm:max-w-lg rounded-2xl border-border bg-card p-6 shadow-2xl">
          <DialogHeader className="space-y-1.5 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Radio className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <DialogTitle className="text-base font-bold font-heading text-foreground">
                  QGIS Realtime Sync
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Sinkronisasi live data pipa & aksesoris langsung dari software QGIS kantor
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Connection Status Card */}
            <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-semibold text-foreground">Status Terkoneksi</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                  {qgisAutoSync ? 'Auto-Sync Aktif' : 'Manual Sync'}
                </Badge>
              </div>

              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Folder File Target:</span>
                <span className="font-mono text-foreground font-medium bg-background/80 px-2 py-0.5 rounded border border-border">
                  public/qgis/jaringan_pipa.geojson
                </span>
              </div>

              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Terakhir Sinkron:</span>
                <span className="font-mono text-foreground font-medium">{qgisLastSyncTime || 'Baru saja'}</span>
              </div>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-xl border border-border bg-muted/40 text-center">
                <span className="text-[10px] uppercase font-mono text-muted-foreground block">Pipa Terdeteksi</span>
                <span className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">{qgisStats.pipes}</span>
                <span className="text-[9px] text-muted-foreground block">Jalur Vektor</span>
              </div>
              <div className="p-3 rounded-xl border border-border bg-muted/40 text-center">
                <span className="text-[10px] uppercase font-mono text-muted-foreground block">Aksesoris/Valve</span>
                <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">{qgisStats.valves}</span>
                <span className="text-[9px] text-muted-foreground block">Titik Katup</span>
              </div>
              <div className="p-3 rounded-xl border border-border bg-muted/40 text-center">
                <span className="text-[10px] uppercase font-mono text-muted-foreground block">Zona DMA</span>
                <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">{qgisStats.dma}</span>
                <span className="text-[9px] text-muted-foreground block">Poligon Wilayah</span>
              </div>
            </div>

            {/* Toggle Realtime Auto-Sync */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
              <div>
                <span className="font-semibold text-foreground block">Auto-Sync Setiap 5 Detik</span>
                <span className="text-[11px] text-muted-foreground">
                  Peta otomatis diperbarui saat Anda menekan Ctrl+S di QGIS
                </span>
              </div>
              <Switch checked={qgisAutoSync} onCheckedChange={setQgisAutoSync} />
            </div>

            {/* Drag & Drop Alternative File */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleProcessGeoJsonFiles(e.dataTransfer.files);
                }
              }}
              className="p-4 border-2 border-dashed border-border rounded-xl text-center bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.accept = '.geojson,.json';
                input.onchange = (e: any) => {
                  if (e.target?.files && e.target.files.length > 0) {
                    handleProcessGeoJsonFiles(e.target.files);
                  }
                };
                input.click();
              }}
            >
              <UploadCloud className="w-6 h-6 mx-auto text-blue-500 mb-1.5" />
              <span className="font-semibold text-foreground block">Unggah Layer GeoJSON (Bisa Pilih Banyak File)</span>
              <span className="text-[11px] text-muted-foreground block mb-2">
                Pilih atau drag file <code className="text-primary font-mono font-semibold">existing.geojson</code>, <code className="text-amber-500 font-mono font-semibold">valve.geojson</code>, <code className="text-sky-500 font-mono font-semibold">airvalve.geojson</code> sekaligus. Sistem otomatis menggabungkan seluruh layer dan menyimpannya ke Neon Cloud!
              </span>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-semibold hover:bg-primary/20 transition-colors">
                <Plus className="w-3 h-3" /> Pilih File GeoJSON (Multi-Layer)
              </div>
            </div>

            {/* Daftar File Layer Aktif & Opsi Hapus per File */}
            {uploadedLayers.length > 0 && (
              <div className="p-3 rounded-xl border border-border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    File Layer Aktif ({uploadedLayers.length})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (window.confirm('Bersihkan semua layer kustom dan muat ulang dari server?')) {
                        handleClearCustomLayers();
                      }
                    }}
                    className="h-6 text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1 px-2 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Reset Semua Layer</span>
                  </Button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {uploadedLayers.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/60 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {l.geomType === 'line' ? (
                          <div className="w-3.5 h-1 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full shrink-0 border border-white" style={{ backgroundColor: l.color }} />
                        )}
                        <span className="font-mono text-[11px] font-semibold truncate text-foreground">
                          {l.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate">
                          • {l.count} fitur ({l.category})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Hapus file "${l.name}" dari peta?`)) {
                            handleDeleteLayer(l.id, l.name);
                          }
                        }}
                        className="p-1 rounded text-muted-foreground/50 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                        title={`Hapus file layer ${l.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3 Step Guide */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-2">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                Cara Hubungkan dari QGIS Kantor (3 Langkah):
              </span>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-muted-foreground leading-relaxed">
                <li>Buka proyek QGIS di komputer atau server kantor Anda.</li>
                <li>Klik kanan layer pipa ➔ <strong>Export</strong> ➔ <strong>Save Features As GeoJSON</strong> ke folder: <code className="text-primary font-mono text-[10px]">public/qgis/jaringan_pipa.geojson</code> (CRS: <strong>EPSG:4326</strong>).</li>
                <li>Selesai! Selanjutnya tiap Anda edit di QGIS dan tekan <strong>Ctrl + S</strong>, peta di web ini otomatis berubah detik itu juga.</li>
              </ol>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQgisModal(false)}
              className="text-xs rounded-xl"
            >
              Tutup
            </Button>
            <Button
              size="sm"
              onClick={() => fetchQgisData(true)}
              disabled={qgisLoading}
              className="text-xs rounded-xl gap-1.5 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${qgisLoading ? 'animate-spin' : ''}`} />
              <span>Sinkronkan Sekarang</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
