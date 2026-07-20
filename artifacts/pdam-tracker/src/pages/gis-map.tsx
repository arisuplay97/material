import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet markers in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Mock Material Data
const materials = [
    {
        id: 1,
        kode: 'MTR-2026-0847',
        nama: 'Pipa HDPE Ø110mm',
        lokasi: 'Praya, Lombok Tengah',
        status: 'Dalam Pengiriman',
        lat: -8.70,
        lng: 116.27,
        color: '#3b82f6' // Blue
    },
    {
        id: 2,
        kode: 'MTR-2026-0912',
        nama: 'Gate Valve 4"',
        lokasi: 'Pujut, Lombok Tengah',
        status: 'Terpasang',
        lat: -8.7997,
        lng: 116.2917,
        color: '#16a34a' // Green
    },
    {
        id: 3,
        kode: 'MTR-2026-0731',
        nama: 'Water Meter DN25',
        lokasi: 'Jonggat, Lombok Tengah',
        status: 'Di Gudang',
        lat: -8.6811,
        lng: 116.2166,
        color: '#64748b' // Gray
    },
    {
        id: 4,
        kode: 'MTR-2026-1024',
        nama: 'Pipa Distribusi',
        lokasi: 'Kawasan Mandalika, Lombok Tengah',
        status: 'Dalam Pengiriman',
        lat: -8.8872,
        lng: 116.2825,
        color: '#3b82f6'
    },
    {
        id: 5,
        kode: 'MTR-2026-0551',
        nama: 'Water Meter Induk',
        lokasi: 'Batukliang Utara, Lombok Tengah',
        status: 'Terpasang',
        lat: -8.5772,
        lng: 116.3215,
        color: '#16a34a'
    },
    {
        id: 6,
        kode: 'MTR-2026-1102',
        nama: 'Fitting & Clamp',
        lokasi: 'Kopang, Lombok Tengah',
        status: 'Dalam Pengiriman',
        lat: -8.6433,
        lng: 116.3575,
        color: '#3b82f6'
    }
];

export default function GisMap() {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const createCustomIcon = (color: string) => {
        return L.divIcon({
            className: 'custom-gis-marker',
            html: `
        <div class="gis-marker-container">
          <div class="gis-marker-core" style="background-color: ${color};"></div>
          <div class="gis-marker-pulse" style="border-color: ${color};"></div>
        </div>
      `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -12],
        });
    };

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            <style>{`
        .custom-gis-marker {
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
        }
        
        .gis-marker-container {
          position: relative;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .gis-marker-core {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          z-index: 2;
          box-shadow: 0 0 6px rgba(0,0,0,0.3);
          border: 1.5px solid #ffffff;
        }

        .gis-marker-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px solid;
          opacity: 0;
          z-index: 1;
          animation: ringPulse 2.5s infinite cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        @keyframes ringPulse {
          0% {
            width: 12px;
            height: 12px;
            opacity: 0.8;
          }
          100% {
            width: 44px;
            height: 44px;
            opacity: 0;
          }
        }
      `}</style>

            <div className="p-6 md:p-8 bg-card border-b z-10 shadow-sm relative">
                <h1 className="text-2xl font-serif font-bold text-foreground tracking-tight">GIS Material Tracking</h1>
                <p className="text-muted-foreground font-mono text-xs mt-1 uppercase tracking-widest">
                    Sistem Monitor Distribusi Kabupaten Lombok Tengah
                </p>
            </div>

            <div className="flex-1 w-full relative z-0">
                {isMounted && (
                    <MapContainer
                        center={[-8.70, 116.27]}
                        zoom={11}
                        scrollWheelZoom={true}
                        style={{ height: '100%', width: '100%', minHeight: '500px' }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        />

                        {materials.map((m) => (
                            <Marker
                                key={m.id}
                                position={[m.lat, m.lng]}
                                icon={createCustomIcon(m.color)}
                            >
                                <Popup className="font-sans">
                                    <div className="p-1 space-y-2">
                                        <div className="font-bold text-sm text-slate-800 border-b pb-1 border-slate-100">{m.kode}</div>
                                        <div className="text-xs text-slate-600">
                                            <strong>Material:</strong> {m.nama}<br />
                                            <strong>Lokasi:</strong> {m.lokasi}<br />
                                        </div>
                                        <div className="pt-1">
                                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: m.color }}>
                                                {m.status}
                                            </span>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}

                    </MapContainer>
                )}

                {/* Legend Overlay */}
                <div className="absolute bottom-6 right-6 z-[400] bg-white/95 backdrop-blur shadow-lg rounded-lg border border-slate-200 p-4 min-w-[200px]">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 border-b border-slate-100 pb-2">Legenda Status</h3>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-[#16a34a] ring-4 ring-[#16a34a]/20"></div>
                            <span className="text-sm font-medium text-slate-700">Terpasang</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-[#3b82f6] ring-4 ring-[#3b82f6]/20"></div>
                            <span className="text-sm font-medium text-slate-700">Dalam Pengiriman</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-[#64748b] ring-4 ring-[#64748b]/20"></div>
                            <span className="text-sm font-medium text-slate-700">Di Gudang</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
