/**
 * MapLibre GL Style Spec v8 — "Modern Futuristik Terang (Aero White GL)"
 *
 * Source: OpenFreeMap Vector Tiles (OpenMapTiles schema, 100% Free, No Watermark, No API Key)
 * Theme: Modern High-Tech Precision Cartography (Light / Day Mode)
 *
 * Palette:
 * - Canvas Background: Cool Arctic Porcelain Slate (#f1f5f9)
 * - Greenery / Nature: Lush energetic botanical mint emerald (#cbf3d2)
 * - Sand / Beaches: Warm champagne ivory (#fde68a)
 * - Urban Landuse: Clean titanium slate (#e2e8f0 / #dbeafe)
 * - Water & Lakes: Vibrant Cerulean Azure (#38bdf8) with deep azure shorelines (#0284c7)
 * - Rivers (Sungai Biru): Vivid Cerulean Blue (#0284c7) with bold definition
 * - Road Network: High-contrast royal blue conduits & slate secondary roads
 * - BIL Airport: Graphite runway (#0f172a) with azure taxiways (#0284c7)
 * - Typography: High-legibility Slate-900 with clean white halos (#ffffff)
 */

const NAME_EXPR: any = ['coalesce', ['get', 'name:id'], ['get', 'name']];

export const futuristicLightMapStyle: Record<string, any> = {
  version: 8,
  name: 'Modern Futuristik Terang (Aero White GL)',
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    openmaptiles: {
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
    },
  },
  layers: [
    /* ─────────── 1. BASE CANVAS BACKGROUND ─────────── */
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#f1f5f9',
      },
    },

    /* ─────────── 2. LANDCOVER & NATURAL AREAS ─────────── */
    {
      id: 'landcover-general',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landcover',
      filter: ['any',
        ['==', 'class', 'grass'],
        ['==', 'class', 'wood'],
        ['==', 'class', 'scrub'],
        ['==', 'class', 'farmland'],
      ],
      paint: {
        'fill-color': '#cbf3d2',
        'fill-opacity': 0.75,
      },
    },
    {
      id: 'landcover-sand',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landcover',
      filter: ['==', 'class', 'sand'],
      paint: {
        'fill-color': '#fde68a',
        'fill-opacity': 0.6,
      },
    },

    /* ─────────── 3. LANDUSE / URBAN ZONES ─────────── */
    {
      id: 'landuse-residential',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landuse',
      filter: ['==', 'class', 'residential'],
      paint: {
        'fill-color': '#e2e8f0',
        'fill-opacity': 0.8,
      },
    },
    {
      id: 'landuse-commercial',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landuse',
      filter: ['any',
        ['==', 'class', 'commercial'],
        ['==', 'class', 'retail'],
      ],
      paint: {
        'fill-color': '#dbeafe',
        'fill-opacity': 0.75,
      },
    },
    {
      id: 'landuse-industrial',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landuse',
      filter: ['==', 'class', 'industrial'],
      paint: {
        'fill-color': '#e0e7ff',
        'fill-opacity': 0.7,
      },
    },

    /* ─────────── 4. WATER BODIES (SUNGAI BIRU & DANAU VIBRANT) ─────────── */
    {
      id: 'water-fill',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'water',
      paint: {
        'fill-color': '#38bdf8',
        'fill-opacity': 0.95,
      },
    },
    {
      id: 'water-shoreline-glow',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'water',
      paint: {
        'line-color': '#0284c7',
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.6, 12, 1.8, 16, 2.8],
        'line-opacity': 0.85,
      },
    },
    {
      id: 'waterway-line',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'waterway',
      paint: {
        'line-color': '#0284c7',
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.5, 14, 3.5, 17, 6.0],
        'line-opacity': 0.95,
      },
    },

    /* ─────────── 5. BUILDING FOOTPRINTS ─────────── */
    {
      id: 'building-glow',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 13,
      paint: {
        'fill-color': '#cbd5e1',
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.45, 16, 0.85],
        'fill-outline-color': '#64748b',
      },
    },

    /* ─────────── 6. TRANSPORTATION (HIGH-CONTRAST CONDUITS) ─────────── */
    // Minor / Service / Local Roads
    {
      id: 'road-minor',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['any',
        ['==', 'class', 'minor'],
        ['==', 'class', 'service'],
        ['==', 'class', 'track'],
      ],
      minzoom: 10,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#94a3b8',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 14, 1.8, 16, 2.6],
        'line-opacity': 0.85,
      },
    },

    // Secondary & Tertiary Roads - Casing
    {
      id: 'road-secondary-casing',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['any',
        ['==', 'class', 'secondary'],
        ['==', 'class', 'tertiary'],
      ],
      minzoom: 9,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#475569',
        'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.8, 14, 4.0, 17, 6.5],
        'line-opacity': 0.7,
      },
    },
    // Secondary & Tertiary Roads - Core
    {
      id: 'road-secondary-core',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['any',
        ['==', 'class', 'secondary'],
        ['==', 'class', 'tertiary'],
      ],
      minzoom: 9,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#ffffff',
        'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.0, 14, 2.6, 17, 4.5],
        'line-opacity': 1.0,
      },
    },

    // Primary & Arterials - Deep Royal Blue Casing
    {
      id: 'road-primary-glow',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['any',
        ['==', 'class', 'primary'],
        ['==', 'class', 'trunk'],
        ['==', 'class', 'motorway'],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#1d4ed8',
        'line-width': ['interpolate', ['linear'], ['zoom'], 7, 2.2, 12, 5.2, 16, 9.0],
        'line-opacity': 0.8,
      },
    },
    // Primary & Arterials - Electric Sky Blue Core
    {
      id: 'road-primary-core',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['any',
        ['==', 'class', 'primary'],
        ['==', 'class', 'trunk'],
        ['==', 'class', 'motorway'],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#0ea5e9',
        'line-width': ['interpolate', ['linear'], ['zoom'], 7, 1.2, 12, 3.2, 16, 5.5],
        'line-opacity': 1.0,
      },
    },

    /* ─────────── 6b. AEROWAYS (BANDARA BIL / AIRPORT RUNWAYS) ─────────── */
    {
      id: 'aeroway-runway',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'aeroway',
      filter: ['==', 'class', 'runway'],
      minzoom: 10,
      layout: { 'line-cap': 'square', 'line-join': 'miter' },
      paint: {
        'line-color': '#0f172a',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2.5, 14, 7, 17, 15],
        'line-opacity': 0.95,
      },
    },
    {
      id: 'aeroway-taxiway',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'aeroway',
      filter: ['==', 'class', 'taxiway'],
      minzoom: 12,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#0284c7',
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1.2, 15, 3.5],
        'line-opacity': 0.8,
      },
    },

    /* ─────────── 7. ADMINISTRATIVE BOUNDARIES ─────────── */
    {
      id: 'boundary-country',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'boundary',
      filter: ['==', 'admin_level', 2],
      paint: {
        'line-color': '#3b82f6',
        'line-width': 1.8,
        'line-dasharray': [3, 2],
        'line-opacity': 0.75,
      },
    },
    {
      id: 'boundary-province',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'boundary',
      filter: ['any', ['==', 'admin_level', 4], ['==', 'admin_level', 6]],
      paint: {
        'line-color': '#8b5cf6',
        'line-width': 1.4,
        'line-dasharray': [4, 3],
        'line-opacity': 0.7,
      },
    },

    /* ─────────── 8. ROAD LABELS ─────────── */
    {
      id: 'road-name-labels',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'transportation_name',
      minzoom: 13,
      layout: {
        'symbol-placement': 'line',
        'text-field': NAME_EXPR,
        'text-size': ['interpolate', ['linear'], ['zoom'], 13, 9, 16, 11],
        'text-font': ['Noto Sans Regular'],
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.08,
      },
      paint: {
        'text-color': '#334155',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2.2,
      },
    },

    /* ─────────── 9. PLACE & SETTLEMENT LABELS ─────────── */
    // Villages / Hamlets / Suburbs (Bonder, Batujai, Penujak, dll)
    {
      id: 'place-suburb-village',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      filter: ['any',
        ['==', 'class', 'village'],
        ['==', 'class', 'suburb'],
        ['==', 'class', 'hamlet'],
      ],
      minzoom: 11,
      layout: {
        'text-field': NAME_EXPR,
        'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10, 15, 12],
        'text-font': ['Noto Sans Regular'],
        'text-transform': 'none',
      },
      paint: {
        'text-color': '#1e293b',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2.5,
      },
    },

    // Towns / Kecamatan (Praya, Kuripan, Kopang, Jonggat, dll)
    {
      id: 'place-town',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      filter: ['==', 'class', 'town'],
      layout: {
        'text-field': NAME_EXPR,
        'text-size': ['interpolate', ['linear'], ['zoom'], 8, 11, 14, 15],
        'text-font': ['Noto Sans Bold'],
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.1,
      },
      paint: {
        'text-color': '#0f172a',
        'text-halo-color': '#ffffff',
        'text-halo-width': 3.0,
      },
    },

    // Major Cities (Kota Mataram / Lombok)
    {
      id: 'place-city',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      filter: ['==', 'class', 'city'],
      layout: {
        'text-field': NAME_EXPR,
        'text-size': ['interpolate', ['linear'], ['zoom'], 7, 13, 12, 17],
        'text-font': ['Noto Sans Bold'],
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.12,
      },
      paint: {
        'text-color': '#0284c7',
        'text-halo-color': '#ffffff',
        'text-halo-width': 3.5,
      },
    },
  ],
};

export default futuristicLightMapStyle;
