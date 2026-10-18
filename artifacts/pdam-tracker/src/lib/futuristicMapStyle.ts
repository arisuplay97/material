/**
 * MapLibre GL Style Spec v8 — "Modern Futuristik (Cyber Neon / Sci-Fi GIS)"
 *
 * Source: OpenFreeMap Vector Tiles (OpenMapTiles schema, 100% Free, No API Key)
 * Theme: Ultra-modern, cyberpunk / sci-fi futuristic command center aesthetic
 *
 * Palette:
 * - Background: Deep Cosmic Obsidian (#080c14)
 * - Water: Luminescent Deep Abyss (#061424) with glowing cyan shores (#00f2fe)
 * - Landcover & Greenery: Subtle holographic deep emerald / teal (#071c1f)
 * - Built-up Areas & Residential: Dark geometric cyber slate (#0d1929)
 * - Buildings: Glowing tech footprint with cyber edges (#0a2538)
 * - Motorways & Arterials: Electric Cyan Glowing Conduits (#00e5ff)
 * - Secondary & Local Roads: Precision Neon Slate / Teal (#134062 & #0b253b)
 * - Typography: High-legibility glowing tech labels with crisp dark halo
 */

const NAME_EXPR: any = ['coalesce', ['get', 'name:id'], ['get', 'name']];

export const futuristicMapStyle: Record<string, any> = {
  version: 8,
  name: 'Modern Futuristik (Cyber Neon)',
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    openmaptiles: {
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
    },
  },
  layers: [
    /* ─────────── 1. DEEP SPACE / OBSIDIAN BACKGROUND ─────────── */
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#080c14',
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
        'fill-color': '#09181c',
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
        'fill-color': '#1a1f18',
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
        'fill-color': '#0d1928',
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
        'fill-color': '#0c2236',
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
        'fill-color': '#112233',
        'fill-opacity': 0.7,
      },
    },

    /* ─────────── 4. WATER BODIES (LUMINESCENT DEEP ABYSS) ─────────── */
    {
      id: 'water-fill',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'water',
      paint: {
        'fill-color': '#051221',
        'fill-opacity': 0.95,
      },
    },
    {
      id: 'water-shoreline-glow',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'water',
      paint: {
        'line-color': '#00d2ff',
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.4, 12, 1.2, 16, 2.0],
        'line-opacity': 0.4,
        'line-blur': 1.0,
      },
    },
    {
      id: 'waterway-line',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'waterway',
      paint: {
        'line-color': '#00b4d8',
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 14, 1.8],
        'line-opacity': 0.55,
      },
    },

    /* ─────────── 5. BUILDING FOOTPRINTS (3D/2D CYBER MESH) ─────────── */
    {
      id: 'building-glow',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 13,
      paint: {
        'fill-color': '#0a1e30',
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.3, 16, 0.75],
        'fill-outline-color': '#00e5ff',
      },
    },

    /* ─────────── 6. TRANSPORTATION (NEON GRID CONDUITS) ─────────── */
    // Minor / Service Roads
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
      minzoom: 12,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#0d283e',
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.6, 16, 1.6],
        'line-opacity': 0.7,
      },
    },

    // Secondary & Tertiary Roads
    {
      id: 'road-secondary-casing',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['any',
        ['==', 'class', 'secondary'],
        ['==', 'class', 'tertiary'],
      ],
      minzoom: 10,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#004369',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.2, 14, 3.2, 17, 5.0],
        'line-opacity': 0.6,
      },
    },
    {
      id: 'road-secondary-core',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['any',
        ['==', 'class', 'secondary'],
        ['==', 'class', 'tertiary'],
      ],
      minzoom: 10,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#176694',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 14, 2.0, 17, 3.2],
        'line-opacity': 0.9,
      },
    },

    // Primary & Trunk Highways (Glowing Electric Cyan)
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
        'line-color': '#00e5ff',
        'line-width': ['interpolate', ['linear'], ['zoom'], 7, 1.8, 12, 4.5, 16, 7.5],
        'line-opacity': 0.35,
        'line-blur': 2.0,
      },
    },
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
        'line-color': '#00f2fe',
        'line-width': ['interpolate', ['linear'], ['zoom'], 7, 1.0, 12, 2.4, 16, 4.2],
        'line-opacity': 0.95,
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
        'line-color': '#00f2fe',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 14, 6, 17, 14],
        'line-opacity': 0.85,
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
        'line-color': '#00b4d8',
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 15, 3],
        'line-opacity': 0.65,
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
        'line-color': '#4cc9f0',
        'line-width': 1.5,
        'line-dasharray': [3, 2],
        'line-opacity': 0.6,
      },
    },
    {
      id: 'boundary-province',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'boundary',
      filter: ['any', ['==', 'admin_level', 4], ['==', 'admin_level', 6]],
      paint: {
        'line-color': '#3a86ff',
        'line-width': 1.0,
        'line-dasharray': [4, 3],
        'line-opacity': 0.5,
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
        'text-letter-spacing': 0.1,
      },
      paint: {
        'text-color': '#70b8e8',
        'text-halo-color': '#060d17',
        'text-halo-width': 2.0,
        'text-halo-blur': 0.5,
      },
    },

    /* ─────────── 9. PLACE & SETTLEMENT LABELS ─────────── */
    // Villages / Hamlets / Suburbs
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
      minzoom: 12,
      layout: {
        'text-field': NAME_EXPR,
        'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10, 16, 12],
        'text-font': ['Noto Sans Regular'],
        'text-transform': 'none',
      },
      paint: {
        'text-color': '#a0cce8',
        'text-halo-color': '#080c14',
        'text-halo-width': 1.8,
      },
    },

    // Towns / Kecamatan (Praya, Bonder, Penujak, dll)
    {
      id: 'place-town',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      filter: ['==', 'class', 'town'],
      layout: {
        'text-field': NAME_EXPR,
        'text-size': ['interpolate', ['linear'], ['zoom'], 9, 11, 14, 14],
        'text-font': ['Noto Sans Bold'],
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.12,
      },
      paint: {
        'text-color': '#00f2fe',
        'text-halo-color': '#040810',
        'text-halo-width': 2.5,
        'text-halo-blur': 1.0,
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
        'text-size': ['interpolate', ['linear'], ['zoom'], 7, 12, 12, 16],
        'text-font': ['Noto Sans Bold'],
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.15,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#005273',
        'text-halo-width': 3.0,
        'text-halo-blur': 1.5,
      },
    },
  ],
};
