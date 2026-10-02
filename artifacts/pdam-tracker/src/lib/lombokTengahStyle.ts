/**
 * MapLibre GL Style Spec v8 — "Peta Vektor Mandiri"
 *
 * Source: OpenFreeMap (OpenMapTiles schema, no API key)
 * Palette: warm tropical theme inspired by Lombok's landscape
 *
 * TECHNICAL RULES FOLLOWED:
 * - ["zoom"] only at outermost level of "interpolate" / "step"
 * - "match" placed INSIDE interpolate stops, never wrapping zoom
 * - line-cap / line-join: "round" for all road layers
 * - Indonesian name preference via coalesce
 */

const NAME_EXPR: any = ['coalesce', ['get', 'name:id'], ['get', 'name']];

export const lombokTengahStyle: Record<string, any> = {
  version: 8,
  name: 'Peta Vektor Mandiri',
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    openmaptiles: {
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
    },
  },
  layers: [
    /* ─────────── BACKGROUND ─────────── */
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#f7ecd6' },
    },

    /* ─────────── LANDCOVER ─────────── */
    {
      id: 'landcover-grass',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landcover',
      filter: ['any',
        ['==', 'class', 'grass'],
        ['==', 'subclass', 'wetland'],
      ],
      paint: {
        'fill-color': '#a8e0a0',
        'fill-opacity': 0.6,
      },
    },
    {
      id: 'landcover-farmland',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landcover',
      filter: ['==', 'class', 'farmland'],
      paint: {
        'fill-color': '#d8ec8a',
        'fill-opacity': 0.55,
      },
    },
    {
      id: 'landcover-wood',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landcover',
      filter: ['==', 'class', 'wood'],
      paint: {
        'fill-color': '#6fcf8f',
        'fill-opacity': 0.5,
      },
    },
    {
      id: 'landcover-sand',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landcover',
      filter: ['==', 'class', 'sand'],
      paint: {
        'fill-color': '#ffe3a3',
        'fill-opacity': 0.6,
      },
    },

    /* ─────────── LANDUSE ─────────── */
    {
      id: 'landuse-residential',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landuse',
      filter: ['==', 'class', 'residential'],
      paint: {
        'fill-color': '#f8d9c6',
        'fill-opacity': 0.45,
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
        'fill-color': '#f5e0c4',
        'fill-opacity': 0.4,
      },
    },
    {
      id: 'landuse-industrial',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landuse',
      filter: ['==', 'class', 'industrial'],
      paint: {
        'fill-color': '#e8d5be',
        'fill-opacity': 0.4,
      },
    },

    /* ─────────── PARK ─────────── */
    {
      id: 'park',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'park',
      paint: {
        'fill-color': '#a8e0a0',
        'fill-opacity': 0.4,
      },
    },

    /* ─────────── WATER ─────────── */
    {
      id: 'water',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'water',
      paint: {
        'fill-color': '#3fc1d8',
      },
    },

    /* ─────────── WATERWAY ─────────── */
    {
      id: 'waterway',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'waterway',
      paint: {
        'line-color': '#25a9c4',
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          8, 0.5,
          14, 2,
          18, 4,
        ],
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
    },

    /* ─────────── BOUNDARY ─────────── */
    {
      id: 'boundary',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'boundary',
      filter: ['all',
        ['>=', 'admin_level', 4],
        ['<=', 'admin_level', 6],
      ],
      paint: {
        'line-color': '#8b5cf6',
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          4, 0.8,
          10, 1.5,
          14, 2.5,
        ],
        'line-dasharray': [3, 2],
        'line-opacity': 0.8,
      },
    },

    /* ─────────── ROAD CASING ─────────── */
    {
      id: 'road-casing',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['==', '$type', 'LineString'],
      minzoom: 5,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': [
          'match', ['get', 'class'],
          'motorway', '#d9533a',
          'trunk', '#d9533a',
          'primary', '#d9533a',
          'secondary', '#d9533a',
          'tertiary', '#d9533a',
          '#e0c9a8', // local road casing
        ],
        'line-width': [
          'interpolate', ['exponential', 1.5], ['zoom'],
          5, [
            'match', ['get', 'class'],
            'motorway', 1.8,
            'trunk', 1.5,
            'primary', 1.2,
            'secondary', 1.0,
            'tertiary', 0.8,
            0.5,
          ],
          14, [
            'match', ['get', 'class'],
            'motorway', 10,
            'trunk', 8,
            'primary', 7,
            'secondary', 5.5,
            'tertiary', 4,
            2.5,
          ],
          18, [
            'match', ['get', 'class'],
            'motorway', 24,
            'trunk', 20,
            'primary', 18,
            'secondary', 14,
            'tertiary', 10,
            6,
          ],
        ],
      },
    },

    /* ─────────── ROAD FILL ─────────── */
    {
      id: 'road',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['==', '$type', 'LineString'],
      minzoom: 5,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': [
          'match', ['get', 'class'],
          'motorway', '#ff7a59',
          'trunk', '#ff7a59',
          'primary', '#ff7a59',
          'secondary', '#fca468',
          'tertiary', '#fca468',
          '#ffffff', // local road fill
        ],
        'line-width': [
          'interpolate', ['exponential', 1.5], ['zoom'],
          5, [
            'match', ['get', 'class'],
            'motorway', 0.8,
            'trunk', 0.6,
            'primary', 0.5,
            'secondary', 0.4,
            'tertiary', 0.3,
            0.15,
          ],
          14, [
            'match', ['get', 'class'],
            'motorway', 7,
            'trunk', 5.5,
            'primary', 5,
            'secondary', 3.5,
            'tertiary', 2.5,
            1.5,
          ],
          18, [
            'match', ['get', 'class'],
            'motorway', 20,
            'trunk', 16,
            'primary', 14,
            'secondary', 10,
            'tertiary', 7,
            4,
          ],
        ],
      },
    },

    /* ─────────── BUILDING 3D ─────────── */
    {
      id: 'building-3d',
      type: 'fill-extrusion',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 14,
      paint: {
        'fill-extrusion-color': '#f2a3b6',
        'fill-extrusion-height': [
          'interpolate', ['linear'], ['zoom'],
          14, 0,
          16, ['coalesce', ['get', 'render_height'], 4],
        ],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': [
          'interpolate', ['linear'], ['zoom'],
          14, 0.3,
          16, 0.65,
        ],
      },
    },

    /* ─────────── LABEL: WATER ─────────── */
    {
      id: 'label-water',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'water_name',
      layout: {
        'text-field': NAME_EXPR,
        'text-font': ['Noto Sans Regular'],
        'text-size': [
          'interpolate', ['linear'], ['zoom'],
          6, 10,
          14, 14,
        ],
        'text-max-width': 8,
      },
      paint: {
        'text-color': '#0a6a82',
        'text-halo-color': '#fff8ea',
        'text-halo-width': 1.5,
      },
    },

    /* ─────────── LABEL: ROAD ─────────── */
    {
      id: 'label-road',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'transportation_name',
      minzoom: 12,
      layout: {
        'text-field': NAME_EXPR,
        'text-font': ['Noto Sans Regular'],
        'text-size': [
          'interpolate', ['linear'], ['zoom'],
          12, 9,
          16, 12,
        ],
        'symbol-placement': 'line',
        'text-max-angle': 30,
        'text-padding': 4,
      },
      paint: {
        'text-color': '#3b2a52',
        'text-halo-color': '#fff8ea',
        'text-halo-width': 1.2,
      },
    },

    /* ─────────── LABEL: SETTLEMENT (small) ─────────── */
    {
      id: 'label-settlement-small',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      minzoom: 11,
      filter: ['any',
        ['==', 'class', 'village'],
        ['==', 'class', 'hamlet'],
        ['==', 'class', 'suburb'],
        ['==', 'class', 'neighbourhood'],
        ['==', 'class', 'quarter'],
        ['==', 'class', 'isolated_dwelling'],
      ],
      layout: {
        'text-field': NAME_EXPR,
        'text-font': ['Noto Sans Regular'],
        'text-size': [
          'interpolate', ['linear'], ['zoom'],
          11, 10,
          14, 13,
        ],
        'text-max-width': 7,
        'text-anchor': 'center',
      },
      paint: {
        'text-color': '#3b2a52',
        'text-halo-color': '#fff8ea',
        'text-halo-width': 1.5,
      },
    },

    /* ─────────── LABEL: CITY & ISLAND (bold) ─────────── */
    {
      id: 'label-city',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      filter: ['any',
        ['==', 'class', 'city'],
        ['==', 'class', 'town'],
        ['==', 'class', 'island'],
      ],
      layout: {
        'text-field': NAME_EXPR,
        'text-font': ['Noto Sans Bold'],
        'text-size': [
          'interpolate', ['linear'], ['zoom'],
          4, 10,
          8, 14,
          14, 20,
        ],
        'text-max-width': 8,
        'text-anchor': 'center',
      },
      paint: {
        'text-color': '#3b2a52',
        'text-halo-color': '#fff8ea',
        'text-halo-width': 2,
      },
    },
  ],
};

export default lombokTengahStyle;
