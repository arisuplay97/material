import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

import { pdamService, KECAMATAN_LIST, KecamatanInfo } from '@/services/pdamDataService';
import { Pelanggan, WilayahAcuan, GolonganTarif, StatusSambungan } from '@/types/pdam';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocation } from 'wouter';
import {
  Search,
  Layers,
  MapPin,
  Navigation,
  Compass,
  Filter,
  Eye,
  EyeOff,
  AlertTriangle,
  Building2,
  AlertOctagon,
  X,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Strict boundary for Pulau Lombok, NTB (PRD: Lock all maps strictly to Lombok only)
const LOMBOK_BOUNDS: L.LatLngBoundsExpression = [
  [-9.12, 115.82], // Barat Daya (Sekotong / Samudera Hindia)
  [-8.18, 116.75], // Timur Laut (Lombok Timur / Laut Jawa)
];

// Default centers and zoom levels locked to Lombok
const CENTER_LOMBOK: [number, number] = [-8.7000, 116.2700];
const CENTER_PRAYA_BARAT: [number, number] = [-8.7892, 116.2051];
const DEFAULT_ZOOM = 12;
const MIN_ZOOM = 10; // Locked to Lombok: cannot zoom out beyond the island
const MAX_ZOOM = 18;

// Basemap Providers — all locked strictly to Pulau Lombok (Bebas API Key)
const BASEMAPS = {
  cerah: {
    name: 'Peta Cerah (Humaniter)',
    type: 'raster' as const,
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, Humanitarian OpenStreetMap Team',
  },
  osm: {
    name: 'OpenStreetMap (Standar)',
    type: 'raster' as const,
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  satellite: {
    name: 'Citra Satelit (Esri)',
    type: 'raster' as const,
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar',
  },
  topo: {
    name: 'Topografi & Kontur',
    type: 'raster' as const,
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap, SRTM | &copy; OpenTopoMap',
  },
  vektor: {
    name: 'Peta Vektor Mandiri (GL)',
    type: 'maplibre' as const,
    url: '',
    attribution: '© OpenFreeMap © OpenMapTiles',
  },
};

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper component for map control (flyTo, geolocation, search target)
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
      map.flyTo(targetPoint, zoomLevel, { duration: 1.2 });
    }
  }, [targetPoint, zoomLevel, map]);

  return null;
}

// ── Pulse overlay manager: adds a temporary pulsing ring to a specific marker location ──
function PulseOverlay({ position, active }: { position: [number, number] | null; active: boolean }) {
  const map = useMap();
  const pulseRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    // Clean up any existing pulse
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

// ── MapLibre GL layer via official Leaflet adapter (@maplibre/maplibre-gl-leaflet) ──
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
          // Dynamic imports
          const [{ lombokTengahStyle }, maplibreLeafletMod] = await Promise.all([
            import('@/lib/lombokTengahStyle'),
            import('@maplibre/maplibre-gl-leaflet'),
          ]);

          // Import MapLibre CSS
          await import('maplibre-gl/dist/maplibre-gl.css');

          if (cancelled) return;

          // Access the maplibreGL factory (handles ESM default/named export)
          const maplibreGL = maplibreLeafletMod.maplibreGL || (maplibreLeafletMod as any).default;
          if (!maplibreGL) {
            console.warn('@maplibre/maplibre-gl-leaflet: factory not found');
            return;
          }

          // Create a Leaflet layer backed by MapLibre GL
          const glLayer = maplibreGL({
            style: lombokTengahStyle as any,
            pane: 'tilePane', // render below markers
          } as any);

          if (cancelled) return;
          glLayer.addTo(map);
          layerRef.current = glLayer;

        } catch (err) {
          console.warn('MapLibre GL layer failed to load:', err);
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

// MarkerClusterLayer component (PRD G-3)
function CustomerClusterLayer({
  customers,
  wilayahMap,
  isPimpinan,
  onSelectCustomer,
}: {
  customers: Pelanggan[];
  wilayahMap: Map<string, WilayahAcuan>;
  isPimpinan: boolean;
  onSelectCustomer: (c: Pelanggan) => void;
}) {
  const map = useMap();
  const clusterGroupRef = useRef<any>(null);

  useEffect(() => {
    try {
      if (!clusterGroupRef.current) {
        let group: any = null;
        try {
          if (typeof (L as any).markerClusterGroup === 'function') {
            group = (L as any).markerClusterGroup({
              chunkedLoading: true,
              maxClusterRadius: 45,
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
                  iconSize: L.point(40, 40),
                });
              },
            });
          }
        } catch (e) {
          console.warn('MarkerClusterGroup init warning:', e);
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
      const color = wilayah?.warna || '#3B82F6';
      const isAnomaly = Boolean(c.spatial_anomaly);

      const customIcon = L.divIcon({
        className: 'gis-point-marker',
        html: `
          <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
            ${isAnomaly ? '<div class="gis-anomaly-ring"></div>' : ''}
            <div style="width: 14px; height: 14px; border-radius: 50%; background-color: ${color}; border: 2.5px solid ${isAnomaly ? '#EF4444' : '#FFFFFF'}; box-shadow: 0 1px 6px rgba(0,0,0,0.5);"></div>
            ${
              isAnomaly
                ? '<div style="position: absolute; top: -3px; right: -3px; width: 10px; height: 10px; border-radius: 50%; background-color: #EF4444; border: 1.5px solid white; display: flex; align-items: center; justify-content: center; font-size: 7px; color: white; font-weight: 800; font-family: monospace;">!</div>'
                : c.is_flagged
                ? '<div style="position: absolute; top: -2px; right: -2px; width: 6px; height: 6px; border-radius: 50%; background-color: #F59E0B; border: 1px solid white;"></div>'
                : ''
            }
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -12],
      });

      const marker = L.marker([c.latitude, c.longitude], { icon: customIcon });

      const displayName = isPimpinan
        ? c.nama_pelanggan.split(' ')[0] + ' ' + '*'.repeat(6)
        : c.nama_pelanggan;

      const popupHtml = `
        <div style="width: 250px; font-family: 'Inter', sans-serif; padding: 10px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(148, 163, 184, 0.2); padding-bottom: 6px; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${color};"></span>
              <span style="font-family: 'IBM Plex Mono', monospace; font-weight: 700; font-size: 13px;">${c.kode_pelanggan}</span>
            </div>
            <span style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: rgba(59, 130, 246, 0.1); color: #2563EB;">${c.golongan}</span>
          </div>

          <div style="font-size: 13px; font-weight: 600; margin-bottom: 2px;">${displayName}</div>
          <div style="font-size: 11px; color: #64748B; margin-bottom: 6px; line-height: 1.3;">${c.alamat}</div>

          ${
            isAnomaly
              ? `
            <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 6px; padding: 6px 8px; margin-bottom: 6px; font-size: 10px; color: #B91C1C;">
              <strong>⚠️ Anomali Batas:</strong> ${c.spatial_anomaly}
            </div>
          `
              : ''
          }

          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #64748B; margin-bottom: 8px;">
            <span>Status: <strong>${c.status_sambungan}</strong></span>
            <span>Wilayah: <strong>${c.nama_wilayah}</strong></span>
          </div>

          <button id="btn-detail-${c.kode_pelanggan}" style="width: 100%; border: none; padding: 6px 8px; font-size: 11px; font-weight: 600; border-radius: 6px; background: #2563EB; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
            Lihat Map View & Info Lengkap
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280 });

      marker.on('click', () => {
        onSelectCustomer(c);
      });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-detail-${c.kode_pelanggan}`);
        if (btn) {
          btn.onclick = () => {
            onSelectCustomer(c);
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
      console.warn('CustomerClusterLayer error:', err);
    }

    return () => {
      if (clusterGroupRef.current) {
        try {
          clusterGroupRef.current.clearLayers();
        } catch {}
      }
    };
  }, [customers, wilayahMap, isPimpinan, map, onSelectCustomer]);

  return null;
}

export default function GisMap() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [, setLocation] = useLocation();

  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [wilayahList, setWilayahList] = useState<WilayahAcuan[]>([]);

  // Basemap selector state — default to Peta Cerah (Humaniter)
  const [basemapKey, setBasemapKey] = useState<keyof typeof BASEMAPS>('cerah');

  // Filter States
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>('07'); // Default: 07 Praya Barat
  const [selectedWilayah, setSelectedWilayah] = useState<string>('all');
  const [selectedGolongan, setSelectedGolongan] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [onlyFlagged, setOnlyFlagged] = useState<boolean>(false);
  const [onlyAnomaly, setOnlyAnomaly] = useState<boolean>(false);

  // Search & Navigation States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [targetPoint, setTargetPoint] = useState<[number, number] | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Pelanggan | null>(null);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);

  // Pulse state — only when marker is clicked or searched
  const [pulsePosition, setPulsePosition] = useState<[number, number] | null>(null);
  const [pulseActive, setPulseActive] = useState<boolean>(false);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // UI Drawers
  const [showLegend, setShowLegend] = useState<boolean>(true);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Trigger a temporary pulse at a position (auto-clears after 4 seconds)
  const triggerPulse = useCallback((lat: number, lng: number) => {
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    setPulsePosition([lat, lng]);
    setPulseActive(true);
    pulseTimerRef.current = setTimeout(() => {
      setPulseActive(false);
      setPulsePosition(null);
    }, 4000);
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

  // Listen for external fullscreen changes (e.g. Esc key)
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Sync with service data
  useEffect(() => {
    const load = () => {
      setPelangganList(pdamService.getPelangganList());
      setWilayahList(pdamService.getWilayahList());
    };
    load();
    const unsub = pdamService.subscribe(load);
    return unsub;
  }, []);

  // Wilayah Map Lookup
  const wilayahMap = useMemo(() => {
    return new Map<string, WilayahAcuan>(wilayahList.map((w) => [w.kode, w]));
  }, [wilayahList]);

  // Handle URL search parameter (e.g. from Dashboard "Lihat di Peta")
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('search');
    if (codeParam && pelangganList.length > 0) {
      const match = pelangganList.find((p) => p.kode_pelanggan === codeParam);
      if (match) {
        setTargetPoint([match.latitude, match.longitude]);
        setSelectedCustomer(match);
        triggerPulse(match.latitude, match.longitude);
      }
    }
  }, [pelangganList, triggerPulse]);

  // Filter by kecamatan first
  const kecamatanCustomers = useMemo(() => {
    if (selectedKecamatan === 'all') return pelangganList;
    return pelangganList.filter((p) => p.kode_kecamatan === selectedKecamatan);
  }, [pelangganList, selectedKecamatan]);

  // Spatial Anomaly count in current kecamatan
  const anomalyCount = useMemo(() => {
    return kecamatanCustomers.filter((p) => Boolean(p.spatial_anomaly)).length;
  }, [kecamatanCustomers]);

  // Filter logic
  const filteredCustomers = useMemo(() => {
    return kecamatanCustomers.filter((item) => {
      if (selectedWilayah !== 'all' && item.kode_wilayah !== selectedWilayah) {
        return false;
      }
      if (selectedGolongan !== 'all' && item.golongan !== selectedGolongan) {
        return false;
      }
      if (selectedStatus !== 'all' && item.status_sambungan !== selectedStatus) {
        return false;
      }
      if (onlyAnomaly && !item.spatial_anomaly) {
        return false;
      }
      if (onlyFlagged && !item.is_flagged) {
        return false;
      }
      return true;
    });
  }, [kecamatanCustomers, selectedWilayah, selectedGolongan, selectedStatus, onlyFlagged, onlyAnomaly]);

  // Search results for fast lookup
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase().trim();
    return kecamatanCustomers
      .filter((p) => p.kode_pelanggan.toLowerCase().includes(q) || p.nama_pelanggan.toLowerCase().includes(q))
      .slice(0, 5);
  }, [searchQuery, kecamatanCustomers]);

  // Handle fly to customer from search or list (triggers pulse)
  const handleSelectSearchResult = (c: Pelanggan) => {
    setTargetPoint([c.latitude, c.longitude]);
    setSelectedCustomer(c);
    setSearchQuery('');
    triggerPulse(c.latitude, c.longitude);
  };

  // Reset Map View to default
  const handleResetMap = () => {
    setTargetPoint(CENTER_PRAYA_BARAT);
    setSelectedWilayah('all');
    setSelectedGolongan('all');
    setSelectedStatus('all');
    setOnlyFlagged(false);
    setOnlyAnomaly(false);
    setSelectedCustomer(null);
    setPulseActive(false);
    setPulsePosition(null);
  };

  // Geolocation
  const handleGeolocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setTargetPoint([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {
          alert('Tidak dapat mendeteksi lokasi GPS perangkat Anda.');
        }
      );
    }
  };

  // Click legend item to highlight/filter that wilayah
  const handleLegendClick = (kodeWilayah: string) => {
    if (selectedWilayah === kodeWilayah) {
      setSelectedWilayah('all');
    } else {
      setSelectedWilayah(kodeWilayah);
      const w = wilayahMap.get(kodeWilayah);
      if (w) {
        setTargetPoint([w.centerLat, w.centerLng]);
      }
    }
  };

  // Copy coordinates to clipboard
  const handleCopyCoords = (lat: number, lng: number) => {
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  const isPimpinan = user?.role === 'pimpinan';
  const selectedKecamatanObj = KECAMATAN_LIST.find((k) => k.kode === selectedKecamatan);

  return (
    <div
      ref={mapContainerRef}
      className={`relative w-full overflow-hidden bg-background ${isFullscreen ? 'h-screen' : 'h-[calc(100vh-3.5rem)]'}`}
    >
      {/* ── Top Control Bar — Clean, Compact, Organized (LEFT group) ── */}
      <div className="absolute top-3 left-3 z-[450] flex flex-col gap-2" style={{ maxWidth: 'calc(100% - 70px)' }}>
        {/* Row 1: Search + Kecamatan */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative shadow-md rounded-xl w-64 sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari kode atau nama pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 h-9 text-xs rounded-xl border-border bg-card backdrop-blur-sm shadow-xs font-sans text-foreground"
            />

            {/* Autocomplete Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-10 left-0 right-0 bg-card border border-border rounded-xl shadow-xl p-1.5 space-y-0.5 z-50">
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectSearchResult(item)}
                    className="p-2 rounded-lg hover:bg-muted/70 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: wilayahMap.get(item.kode_wilayah)?.warna || '#3B82F6' }}
                      />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-foreground">{item.kode_pelanggan}</span>
                          {item.spatial_anomaly && (
                            <span className="text-[9px] bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 px-1 rounded font-semibold">
                              Anomali
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {item.nama_pelanggan} ({item.nama_wilayah})
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {item.golongan}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Kecamatan Selector */}
          <div className="bg-card border border-border rounded-xl px-2 py-0.5 shadow-xs flex items-center gap-1.5 h-9">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Select
              value={selectedKecamatan}
              onValueChange={(val) => {
                setSelectedKecamatan(val);
                setSelectedWilayah('all');
                setSelectedCustomer(null);
              }}
            >
              <SelectTrigger className="h-7 border-0 bg-transparent text-xs font-medium focus:ring-0 p-0 pr-1 w-[130px]">
                <SelectValue placeholder="Kecamatan" />
              </SelectTrigger>
              <SelectContent className="max-h-80 border-border bg-card">
                <SelectItem value="all" className="text-xs">
                  Semua Kecamatan (13)
                </SelectItem>
                {KECAMATAN_LIST.map((k) => (
                  <SelectItem key={k.kode} value={k.kode} className="text-xs">
                    <span className="font-mono font-bold mr-1">{k.kode}</span> {k.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Quick Actions (Filter, Anomaly Toggle, Basemap) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Anomaly Quick Filter */}
          {anomalyCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOnlyAnomaly(!onlyAnomaly)}
              className={`h-8 px-2.5 rounded-xl border shadow-xs gap-1.5 text-[11px] font-medium bg-card backdrop-blur-sm ${
                onlyAnomaly
                  ? 'border-rose-500 bg-rose-50/80 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-semibold'
                  : 'border-border text-foreground hover:bg-muted'
              }`}
              title="Filter hanya pelanggan dengan anomali koordinat lintas batas"
            >
              <AlertOctagon className="w-3 h-3 text-rose-500" />
              <span className="hidden sm:inline">Anomali</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-mono">
                {anomalyCount}
              </span>
            </Button>
          )}

          {/* Filter Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`h-8 px-2.5 rounded-xl border-border shadow-xs gap-1.5 text-[11px] font-medium bg-card backdrop-blur-sm ${
              selectedWilayah !== 'all' || selectedGolongan !== 'all' || onlyFlagged
                ? 'border-primary text-primary font-semibold'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <Filter className="w-3 h-3" />
            <span>Filter</span>
            {(selectedWilayah !== 'all' || selectedGolongan !== 'all' || onlyFlagged) && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </Button>

          {/* Basemap Switcher */}
          <Select value={basemapKey} onValueChange={(val: any) => setBasemapKey(val)}>
            <SelectTrigger className="h-8 px-2.5 rounded-xl border-border bg-card backdrop-blur-sm shadow-xs text-[11px] font-medium w-auto sm:w-36">
              <Layers className="w-3 h-3 mr-1 text-primary shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border bg-card">
              <SelectItem value="cerah">Peta Cerah (Humaniter)</SelectItem>
              <SelectItem value="osm">OpenStreetMap (Standar)</SelectItem>
              <SelectItem value="satellite">Citra Satelit (Esri)</SelectItem>
              <SelectItem value="topo">Topografi & Kontur</SelectItem>
              <SelectItem value="vektor">Peta Vektor Mandiri (GL)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Expandable Filter Drawer ── */}
      {showFilters && (
        <Card className="absolute top-[6.5rem] left-3 z-[450] w-80 rounded-2xl border border-border bg-card backdrop-blur shadow-xl animate-in fade-in slide-in-from-top-2">
          <CardContent className="p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-heading font-semibold text-xs text-foreground flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-primary" />
                Filter Sebaran Titik GIS
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedWilayah('all');
                  setSelectedGolongan('all');
                  setSelectedStatus('all');
                  setOnlyFlagged(false);
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
              <Select value={selectedWilayah} onValueChange={setSelectedWilayah}>
                <SelectTrigger className="h-8 text-xs rounded-xl border-border bg-background">
                  <SelectValue placeholder="Semua Wilayah" />
                </SelectTrigger>
                <SelectContent className="max-h-56 border-border bg-card">
                  <SelectItem value="all">Semua Wilayah ({wilayahList.length})</SelectItem>
                  {wilayahList.map((w) => (
                    <SelectItem key={w.kode} value={w.kode}>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: w.warna }} />
                        <span>{w.kode} - {w.nama}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter Golongan & Status Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Golongan
                </label>
                <Select value={selectedGolongan} onValueChange={setSelectedGolongan}>
                  <SelectTrigger className="h-8 text-xs rounded-xl border-border bg-background">
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-card">
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="R1">R1</SelectItem>
                    <SelectItem value="R2">R2</SelectItem>
                    <SelectItem value="B1">B1</SelectItem>
                    <SelectItem value="S">S</SelectItem>
                    <SelectItem value="I">I</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Status
                </label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="h-8 text-xs rounded-xl border-border bg-background">
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-card">
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="Aktif">Aktif</SelectItem>
                    <SelectItem value="Nonaktif">Nonaktif</SelectItem>
                    <SelectItem value="Putus">Putus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Checkbox filters */}
            <div className="pt-2 border-t border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground">Anomali Batas Wilayah</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOnlyAnomaly(!onlyAnomaly)}
                  className={`h-6 px-2 rounded-lg text-xs font-mono ${
                    onlyAnomaly
                      ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                      : 'text-muted-foreground border-border'
                  }`}
                >
                  {onlyAnomaly ? 'Aktif' : 'Semua'}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground">Data Bertanda (Flag)</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOnlyFlagged(!onlyFlagged)}
                  className={`h-6 px-2 rounded-lg text-xs font-mono ${
                    onlyFlagged
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                      : 'text-muted-foreground border-border'
                  }`}
                >
                  {onlyFlagged ? 'Aktif' : 'Semua'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Floating Right Action Buttons (organized vertically) ── */}
      <div className="absolute top-3 right-3 z-[450] flex flex-col gap-1.5">
        {/* Fullscreen Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          className="w-9 h-9 p-0 rounded-xl border-border bg-card backdrop-blur-sm shadow-xs hover:bg-muted text-foreground"
          title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4 text-primary" /> : <Maximize2 className="w-4 h-4 text-primary" />}
        </Button>

        {/* Geolocation Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleGeolocation}
          className="w-9 h-9 p-0 rounded-xl border-border bg-card backdrop-blur-sm shadow-xs hover:bg-muted text-foreground"
          title="Lokasi GPS Saya"
        >
          <Navigation className="w-4 h-4 text-primary" />
        </Button>

        {/* Reset View Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetMap}
          className="w-9 h-9 p-0 rounded-xl border-border bg-card backdrop-blur-sm shadow-xs hover:bg-muted text-foreground"
          title="Reset Sudut Pandang"
        >
          <Compass className="w-4 h-4 text-muted-foreground" />
        </Button>

        {/* Toggle Legend Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLegend(!showLegend)}
          className={`w-9 h-9 p-0 rounded-xl border-border bg-card backdrop-blur-sm shadow-xs hover:bg-muted ${
            showLegend ? 'text-primary' : 'text-muted-foreground'
          }`}
          title="Tampilkan / Sembunyikan Legenda"
        >
          {showLegend ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </Button>
      </div>

      {/* ── Notice Banner if Other Kecamatan Selected ── */}
      {selectedKecamatan !== 'all' && selectedKecamatan !== '07' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[450] bg-card/95 backdrop-blur border border-amber-300 dark:border-amber-800 rounded-2xl p-4 shadow-xl max-w-md text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs">
            <Building2 className="w-4 h-4" />
            <span>Kecamatan {selectedKecamatanObj?.nama || selectedKecamatan}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Belum ada data titik GIS untuk kecamatan ini. Data pilot saat ini aktif untuk{' '}
            <strong>Kecamatan 07 Praya Barat</strong> (642 titik).
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

      {/* ── INLINE DETAIL & MAP VIEW DRAWER (User Requirement: NO NEW TAB!) ── */}
      {selectedCustomer && (
        <Card className="absolute top-3 right-14 bottom-4 z-[500] w-full max-w-sm rounded-2xl border border-border bg-card backdrop-blur-sm shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4">
          {/* Drawer Header */}
          <div className="p-3 border-b border-border/80 flex items-center justify-between bg-muted/40">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                style={{
                  backgroundColor: wilayahMap.get(selectedCustomer.kode_wilayah)?.warna || '#3B82F6',
                }}
              />
              <span className="font-heading font-semibold text-sm text-foreground">
                Detail Pelanggan & Map View
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedCustomer(null);
                setPulseActive(false);
                setPulsePosition(null);
              }}
              className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Spatial Anomaly High-Visibility Alert */}
            {selectedCustomer.spatial_anomaly && (
              <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-semibold">
                  <AlertOctagon className="w-4 h-4 text-rose-600" />
                  <span>Anomali Batas Wilayah Terdeteksi</span>
                </div>
                <p className="text-rose-800 dark:text-rose-200 leading-relaxed text-[11px]">
                  {selectedCustomer.spatial_anomaly}
                </p>
                <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                  Rekomendasi: Lakukan survei GPS ulang ke lokasi pelanggan untuk penyesuaian kode wilayah acuan.
                </div>
              </div>
            )}

            {/* General Flag Reason */}
            {!selectedCustomer.spatial_anomaly && selectedCustomer.is_flagged && (
              <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Data Bertanda (Perlu Verifikasi)</span>
                </div>
                <p className="text-[11px]">{selectedCustomer.flag_reasons.join(', ')}</p>
              </div>
            )}

            {/* Identification Header Card */}
            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-2">
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
                      selectedCustomer.status_sambungan === 'Aktif'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                        : selectedCustomer.status_sambungan === 'Nonaktif'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
                    }`}
                  >
                    {selectedCustomer.status_sambungan}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Nama Pelanggan</div>
                <div className="text-sm font-semibold text-foreground">
                  {isPimpinan
                    ? selectedCustomer.nama_pelanggan.split(' ')[0] + ' ' + '*'.repeat(6)
                    : selectedCustomer.nama_pelanggan}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Alamat</div>
                <div className="text-xs text-foreground/90 leading-relaxed">
                  {selectedCustomer.alamat}
                </div>
              </div>
            </div>

            {/* ── Street View Preview (PRD: langsung street view jalan) ── */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  Pratinjau Street View & Lokasi
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  WGS84
                </span>
              </div>

              {/* Coordinates Box */}
              <div className="p-2.5 rounded-xl border border-border bg-card flex items-center justify-between">
                <div className="font-mono text-xs text-foreground">
                  <span className="text-muted-foreground mr-1">Lat:</span>
                  <span className="font-semibold">{selectedCustomer.latitude.toFixed(6)}</span>
                  <span className="mx-1.5 text-border">|</span>
                  <span className="text-muted-foreground mr-1">Lng:</span>
                  <span className="font-semibold">{selectedCustomer.longitude.toFixed(6)}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyCoords(selectedCustomer.latitude, selectedCustomer.longitude)}
                  className="h-6 px-2 text-[10px] rounded-lg gap-1 border-border"
                >
                  {copiedCoords ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCoords ? 'Tersalin' : 'Salin'}</span>
                </Button>
              </div>

              {/* Street View iframe — directly show Google Street View of the road */}
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

                {/* Overlay footer with Street View link */}
                <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 py-2 flex items-center justify-between pointer-events-auto">
                  <div className="flex items-center gap-1.5 text-white/90">
                    <Navigation className="w-3 h-3 text-emerald-400" />
                    <span className="text-[11px] font-semibold">Street View Interaktif</span>
                  </div>
                  <a
                    href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${selectedCustomer.latitude},${selectedCustomer.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-emerald-300 hover:text-emerald-200 font-medium flex items-center gap-1 transition-colors bg-black/50 hover:bg-black/70 px-2 py-0.5 rounded-md"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Buka Street View
                  </a>
                </div>
              </div>
            </div>

            {/* Administrative & Technical Details */}
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
                  {KECAMATAN_LIST.find(k => k.kode === selectedCustomer.kode_kecamatan)?.nama || 'Praya Barat'}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  Kode: {selectedCustomer.kode_kecamatan}
                </div>
              </div>

              <div className="p-2.5 rounded-xl border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-mono">Nomor Meter</span>
                <div className="font-mono font-medium text-foreground truncate mt-0.5">
                  {selectedCustomer.nomor_meter || '-'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-mono">Tanggal Pasang</span>
                <div className="font-medium text-foreground truncate mt-0.5">
                  {selectedCustomer.tanggal_pasang || '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-2.5 border-t border-border bg-muted/30 flex items-center gap-2">
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
              <span>Fokuskan Peta</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSelectedCustomer(null);
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

      {/* ── Interactive Wilayah Legend Card ── */}
      {showLegend && !selectedCustomer && (
        <Card className="absolute bottom-5 right-3 z-[450] w-64 max-h-[350px] rounded-2xl border border-border bg-card backdrop-blur-sm shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <div className="p-2.5 border-b border-border flex items-center justify-between bg-muted/40">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span className="font-heading font-semibold text-xs text-foreground">
                Legenda Wilayah
              </span>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5 h-4.5 bg-background">
              {filteredCustomers.length} Titik
            </Badge>
          </div>

          <div className="p-1.5 text-[10px] text-muted-foreground border-b border-border/50 bg-muted/10 font-mono px-2.5">
            Klik wilayah untuk filter:
          </div>

          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {wilayahList.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground font-mono">
                Tidak ada wilayah acuan aktif.
              </div>
            ) : (
              wilayahList.map((w) => {
                const isSelected = selectedWilayah === w.kode;
                const countInWilayah = pelangganList.filter((p) => p.kode_wilayah === w.kode).length;

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
                        style={{ backgroundColor: w.warna }}
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
        </Card>
      )}

      {/* ── Bottom Left Live Status Pill ── */}
      <div className="absolute bottom-4 left-3 z-[450] flex flex-wrap items-center gap-1.5">
        <div className="px-3 py-1.5 rounded-xl bg-card backdrop-blur-sm border border-border shadow-md text-xs font-mono flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-muted-foreground">Aktif:</span>
          <span className="font-bold text-foreground">{filteredCustomers.length.toLocaleString('id-ID')} Titik</span>
        </div>

        {anomalyCount > 0 && (
          <div
            onClick={() => setOnlyAnomaly(!onlyAnomaly)}
            className="px-2.5 py-1.5 rounded-xl bg-rose-50/90 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-md hover:bg-rose-100 transition-colors"
          >
            <AlertOctagon className="w-3 h-3 text-rose-600 dark:text-rose-400" />
            <span className="text-rose-800 dark:text-rose-200 font-semibold">
              {anomalyCount} Anomali
            </span>
          </div>
        )}
      </div>

      {/* ── Main Leaflet Map Container ── */}
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
        {/* Base raster tile layer — hidden when vector basemap is active */}
        {basemapKey !== 'vektor' && (
          <TileLayer
            key={basemapKey}
            attribution={(BASEMAPS[basemapKey] || BASEMAPS.cerah).attribution}
            url={(BASEMAPS[basemapKey] || BASEMAPS.cerah).url}
            maxZoom={MAX_ZOOM}
            bounds={LOMBOK_BOUNDS}
          />
        )}

        {/* MapLibre GL vector basemap overlay when 'vektor' is active */}
        <MapLibreLayer active={basemapKey === 'vektor'} />

        {/* Controller for map navigation */}
        <MapController targetPoint={targetPoint} />

        {/* Pulse overlay — only when a marker is clicked or searched */}
        <PulseOverlay position={pulsePosition} active={pulseActive} />

        {/* High performance cluster marker layer */}
        <CustomerClusterLayer
          customers={filteredCustomers}
          wilayahMap={wilayahMap}
          isPimpinan={isPimpinan}
          onSelectCustomer={(c) => {
            setSelectedCustomer(c);
            setTargetPoint([c.latitude, c.longitude]);
            triggerPulse(c.latitude, c.longitude);
          }}
        />
      </MapContainer>
    </div>
  );
}
