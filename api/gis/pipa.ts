import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  // Setup CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return res.status(200).json({
      type: 'FeatureCollection',
      name: 'Jaringan_Pipa_Fallback',
      features: [],
      error: 'DATABASE_URL belum dikonfigurasi di Environment Variables.',
    });
  }

  try {
    const sql = neon(databaseUrl);

    // Periksa tabel apa saja yang tersedia di Neon
    const tableCheck = await sql.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN (
          'existing', 'gis_pipa', 'valve', 'airvalve', 'washout', 
          'reservoir', 'ipa', 'bpt', 'air_baku', 'dop', 'Manometer', 'gis_aksesoris'
        )
    `);

    const availableTables = new Set((tableCheck || []).map((t: any) => t.table_name));
    const allFeatures: any[] = [];

    // 1. Ambil Data Garis Pipa (dari tabel 'existing' QGIS atau 'gis_pipa')
    if (availableTables.has('existing')) {
      const pipeRows = await sql.query(`
        SELECT 
          fid as id,
          COALESCE(nama, 'Pipa ' || fid) as kode_pipa,
          COALESCE(nama, 'Jalur Pipa') as nama_jalur,
          COALESCE(jns_pipa, 'Distribusi') as kategori,
          COALESCE(materipipa, 'PVC') as material,
          COALESCE(NULLIF(regexp_replace(diameter, '[^0-9.]', '', 'g'), '')::numeric, 100) as diameter_mm,
          COALESCE(panjang, 0) as panjang_m,
          COALESCE(zona, '-') as zona_dma,
          COALESCE(sumber, '-') as sumber_air,
          COALESCE(kondisi, 'Baik') as status,
          COALESCE(thn_pasang, 2020) as tahun_pasang,
          ST_AsGeoJSON(geom)::json as geometry
        FROM existing
        WHERE geom IS NOT NULL
      `);

      for (const r of pipeRows || []) {
        allFeatures.push({
          type: 'Feature',
          geometry: r.geometry,
          properties: {
            id: r.id,
            kode_pipa: r.kode_pipa,
            nama_jalur: r.nama_jalur,
            kategori: r.kategori,
            material: r.material,
            diameter_mm: r.diameter_mm,
            panjang_m: r.panjang_m,
            zona_dma: r.zona_dma,
            sumber_air: r.sumber_air,
            status: r.status,
            tahun_pasang: r.tahun_pasang,
          },
        });
      }
    } else if (availableTables.has('gis_pipa')) {
      const pipeRows = await sql.query(`
        SELECT 
          id,
          kode_pipa,
          nama_jalur,
          kategori,
          material,
          diameter_mm,
          panjang_m,
          tekanan_bar,
          status,
          tahun_pasang,
          zona_dma,
          sumber_air,
          ST_AsGeoJSON(geom)::json as geometry
        FROM gis_pipa
        WHERE geom IS NOT NULL
      `);

      for (const r of pipeRows || []) {
        allFeatures.push({
          type: 'Feature',
          geometry: r.geometry,
          properties: {
            id: r.id,
            kode_pipa: r.kode_pipa,
            nama_jalur: r.nama_jalur,
            kategori: r.kategori,
            material: r.material,
            diameter_mm: r.diameter_mm,
            panjang_m: r.panjang_m,
            tekanan_bar: r.tekanan_bar,
            status: r.status,
            tahun_pasang: r.tahun_pasang,
            zona_dma: r.zona_dma,
            sumber_air: r.sumber_air,
          },
        });
      }
    }

    // 2. Ambil Titik Aksesoris (Valve, Washout, Airvalve, dll)
    const accessoryQueries: string[] = [];

    if (availableTables.has('valve')) {
      accessoryQueries.push(`
        SELECT 
          fid as id, 
          COALESCE(kode, 'V-' || fid) as kode_aksesoris,
          COALESCE(jns_valve, 'Gate Valve') as nama_aksesoris,
          'valve' as kategori,
          COALESCE(fungsi, 'Distribusi') as tipe,
          COALESCE(kondisi, 'Baik') as kondisi,
          diameter as diameter_mm,
          ST_AsGeoJSON(geom)::json as geometry
        FROM valve WHERE geom IS NOT NULL
      `);
    }

    if (availableTables.has('airvalve')) {
      accessoryQueries.push(`
        SELECT 
          fid as id, 
          'AV-' || fid as kode_aksesoris,
          COALESCE(jenis, 'Air Valve') as nama_aksesoris,
          'airvalve' as kategori,
          COALESCE(fungsi, 'Pelepas Udara') as tipe,
          COALESCE(kondisi, 'Baik') as kondisi,
          dimensi_av as diameter_mm,
          ST_AsGeoJSON(geom)::json as geometry
        FROM airvalve WHERE geom IS NOT NULL
      `);
    }

    if (availableTables.has('washout')) {
      accessoryQueries.push(`
        SELECT 
          fid as id, 
          'WO-' || fid as kode_aksesoris,
          COALESCE(jenis_valve, 'Washout') as nama_aksesoris,
          'washout' as kategori,
          'Penguras' as tipe,
          'Baik' as kondisi,
          NULL::numeric as diameter_mm,
          ST_AsGeoJSON(geom)::json as geometry
        FROM washout WHERE geom IS NOT NULL
      `);
    }

    if (availableTables.has('reservoir')) {
      accessoryQueries.push(`
        SELECT 
          fid as id, 
          'RES-' || fid as kode_aksesoris,
          COALESCE(nama, 'Reservoir') as nama_aksesoris,
          'reservoir' as kategori,
          COALESCE(kondisi, 'Operasional') as tipe,
          COALESCE(kondisi, 'Baik') as kondisi,
          NULL::numeric as diameter_mm,
          ST_AsGeoJSON(geom)::json as geometry
        FROM reservoir WHERE geom IS NOT NULL
      `);
    }

    if (availableTables.has('ipa')) {
      accessoryQueries.push(`
        SELECT 
          fid as id, 
          'IPA-' || fid as kode_aksesoris,
          COALESCE(nama, 'Instalasi Pengolahan Air') as nama_aksesoris,
          'ipa' as kategori,
          COALESCE(tp_pnglhn, 'Pengolahan') as tipe,
          COALESCE(kondisi, 'Baik') as kondisi,
          NULL::numeric as diameter_mm,
          ST_AsGeoJSON(geom)::json as geometry
        FROM ipa WHERE geom IS NOT NULL
      `);
    }

    if (availableTables.has('bpt')) {
      accessoryQueries.push(`
        SELECT 
          fid as id, 
          'BPT-' || fid as kode_aksesoris,
          COALESCE(nama, 'Bak Pelepas Tekan') as nama_aksesoris,
          'bpt' as kategori,
          'Pelepas Tekan' as tipe,
          COALESCE(kondisi, 'Baik') as kondisi,
          NULL::numeric as diameter_mm,
          ST_AsGeoJSON(geom)::json as geometry
        FROM bpt WHERE geom IS NOT NULL
      `);
    }

    if (availableTables.has('air_baku')) {
      accessoryQueries.push(`
        SELECT 
          fid as id, 
          'AB-' || fid as kode_aksesoris,
          COALESCE(nama, 'Sumber Air Baku') as nama_aksesoris,
          'air_baku' as kategori,
          COALESCE(jns_smbr, 'Air Baku') as tipe,
          COALESCE(kondisi, 'Baik') as kondisi,
          NULL::numeric as diameter_mm,
          ST_AsGeoJSON(geom)::json as geometry
        FROM air_baku WHERE geom IS NOT NULL
      `);
    }

    if (availableTables.has('dop')) {
      accessoryQueries.push(`
        SELECT 
          fid as id, 
          'DOP-' || fid as kode_aksesoris,
          'End Cap (Dop)' as nama_aksesoris,
          'dop' as kategori,
          COALESCE(jenis, 'Penutup') as tipe,
          'Baik' as kondisi,
          NULL::numeric as diameter_mm,
          ST_AsGeoJSON(geom)::json as geometry
        FROM dop WHERE geom IS NOT NULL
      `);
    }

    if (availableTables.has('Manometer')) {
      accessoryQueries.push(`
        SELECT 
          fid as id, 
          'MANO-' || fid as kode_aksesoris,
          'Manometer' as nama_aksesoris,
          'manometer' as kategori,
          COALESCE(fungsi, 'Tekanan') as tipe,
          COALESCE("Kondisi", 'Baik') as kondisi,
          NULL::numeric as diameter_mm,
          ST_AsGeoJSON(geom)::json as geometry
        FROM "Manometer" WHERE geom IS NOT NULL
      `);
    }

    if (availableTables.has('gis_aksesoris')) {
      accessoryQueries.push(`
        SELECT 
          id, 
          kode_aksesoris,
          nama_aksesoris,
          kategori,
          tipe,
          kondisi,
          NULL::numeric as diameter_mm,
          ST_AsGeoJSON(geom)::json as geometry
        FROM gis_aksesoris WHERE geom IS NOT NULL
      `);
    }

    if (accessoryQueries.length > 0) {
      const accessoryRows = await sql.query(accessoryQueries.join(' UNION ALL '));
      for (const a of accessoryRows || []) {
        allFeatures.push({
          type: 'Feature',
          geometry: a.geometry,
          properties: {
            id: a.id,
            kode_aksesoris: a.kode_aksesoris,
            nama_aksesoris: a.nama_aksesoris,
            kategori: a.kategori,
            tipe: a.tipe,
            kondisi: a.kondisi,
            diameter_mm: a.diameter_mm,
          },
        });
      }
    }

    return res.status(200).json({
      type: 'FeatureCollection',
      name: 'Jaringan_Pipa_dan_Aksesoris_PostGIS',
      crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
      features: allFeatures,
      stats: {
        totalFeatures: allFeatures.length,
        tablesDetected: Array.from(availableTables),
      },
    });
  } catch (err: any) {
    console.error('Error fetching QGIS data from Neon:', err.message);
    return res.status(200).json({
      type: 'FeatureCollection',
      name: 'Jaringan_Pipa_Error',
      features: [],
      error: err.message,
    });
  }
}
