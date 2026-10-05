import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  // Setup CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

  // Handle POST: Upload GeoJSON directly to Neon database
  if (req.method === 'POST') {
    try {
      const sql = neon(databaseUrl);
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const features = Array.isArray(body?.features) ? body.features : [];

      if (features.length === 0) {
        return res.status(400).json({ error: 'Tidak ada features dalam GeoJSON yang diunggah.' });
      }

      let savedPipes = 0;
      let savedValves = 0;

      // Filter fitur LineString / MultiLineString (Jalur Pipa)
      const lines = features.filter((f: any) => {
        const t = f?.geometry?.type;
        return t === 'LineString' || t === 'MultiLineString';
      });

      // Filter fitur Point (Katup Valve, Air Valve, Aksesoris)
      const points = features.filter((f: any) => f?.geometry?.type === 'Point');

      // 1. Batch insert garis pipa ke tabel 'existing'
      if (lines.length > 0) {
        try {
          await sql.query('TRUNCATE TABLE existing');
        } catch {}

        for (let i = 0; i < lines.length; i += 50) {
          const chunk = lines.slice(i, i + 50);
          const valueClauses: string[] = [];
          const params: any[] = [];
          let pIdx = 1;

          for (const item of chunk) {
            const props = item.properties || {};
            const geomStr = JSON.stringify(item.geometry);
            const nama = String(props.nama || props.nama_jalur || props.name || `Pipa ${savedPipes + 1}`).slice(0, 255);
            const diameter = String(props.diameter || props.diameter_mm || props.dia || '100').slice(0, 50);
            const jns_pipa = String(props.jns_pipa || props.kategori || 'Distribusi').slice(0, 50);
            const materipipa = String(props.materipipa || props.material || 'PVC').slice(0, 50);
            const panjang = Number(props.panjang || props.panjang_m) || 0;

            valueClauses.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, ST_SetSRID(ST_GeomFromGeoJSON($${pIdx++}), 4326))`);
            params.push(nama, diameter, jns_pipa, materipipa, panjang, geomStr);
            savedPipes++;
          }

          if (valueClauses.length > 0) {
            await sql.query(
              `INSERT INTO existing (nama, diameter, jns_pipa, materipipa, panjang, geom) VALUES ${valueClauses.join(', ')}`,
              params
            );
          }
        }
      }

      // 2. Batch insert titik aksesoris ke tabel 'valve'
      if (points.length > 0) {
        try {
          await sql.query('TRUNCATE TABLE valve');
        } catch {}

        for (let i = 0; i < points.length; i += 50) {
          const chunk = points.slice(i, i + 50);
          const valueClauses: string[] = [];
          const params: any[] = [];
          let pIdx = 1;

          for (const item of chunk) {
            const props = item.properties || {};
            const geomStr = JSON.stringify(item.geometry);
            const jns_valve = String(props.jns_valve || props.jenis || props.nama || props.nama_aksesoris || 'Gate Valve').slice(0, 255);
            const rawDiam = String(props.diameter || props.diameter_mm || props.dimensi || props.dimensi_av || props.dia || props.dn || '100').replace(/[^\d.]/g, '');
            let diameter = Number(rawDiam) || 100;
            if (diameter > 0 && diameter <= 24 && (String(props.diameter || '').includes('"') || String(props.dimensi || '').includes('"') || diameter <= 12)) {
              diameter = Math.round(diameter * 25.4);
            }
            const fungsi = String(props.fungsi || props.tipe || 'Distribusi').slice(0, 255);
            const kondisi = String(props.kondisi || 'Baik').slice(0, 50);

            valueClauses.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, ST_SetSRID(ST_GeomFromGeoJSON($${pIdx++}), 4326))`);
            params.push(jns_valve, diameter, fungsi, kondisi, geomStr);
            savedValves++;
          }

          if (valueClauses.length > 0) {
            await sql.query(
              `INSERT INTO valve (jns_valve, diameter, fungsi, kondisi, geom) VALUES ${valueClauses.join(', ')}`,
              params
            );
          }
        }
      }

      return res.status(200).json({
        ok: true,
        savedPipes,
        savedValves,
        savedCount: savedPipes + savedValves,
        message: `Berhasil mengunggah ${savedPipes} pipa dan ${savedValves} aksesoris ke Neon Cloud!`,
      });
    } catch (postErr: any) {
      console.error('Error saving uploaded GeoJSON to Neon:', postErr);
      return res.status(500).json({ error: postErr.message });
    }
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
          COALESCE(NULLIF(regexp_replace(diameter::text, '[^0-9.]', '', 'g'), '')::numeric, 100) as diameter_mm,
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
          COALESCE(NULLIF(regexp_replace(dimensi_av::text, '[^0-9.]', '', 'g'), '')::numeric, 50) as diameter_mm,
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
