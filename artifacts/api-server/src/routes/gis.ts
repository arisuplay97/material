import { Router, Request, Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const router = Router();

/**
 * GET /api/gis/pipa
 * Mengembalikan jaringan pipa dalam format GeoJSON FeatureCollection.
 * Mendukung Bounding Box (bbox) query untuk performa tinggi puluhan ribu pipa:
 * ?bbox=minLng,minLat,maxLng,maxLat
 */
router.get("/gis/pipa", async (req: Request, res: Response): Promise<void> => {
  try {
    const { bbox } = req.query;

    let query = sql`
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
        ST_AsGeoJSON(geom)::json AS geometry
      FROM gis_pipa
    `;

    // Filter Bounding Box jika browser mengirimkan koordinat viewport layar
    if (typeof bbox === "string") {
      const parts = bbox.split(",").map(Number);
      if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
        const [minLng, minLat, maxLng, maxLat] = parts;
        query = sql`
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
            ST_AsGeoJSON(geom)::json AS geometry
          FROM gis_pipa
          WHERE geom && ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)
        `;
      }
    }

    const rows: any = await db.execute(query);

    const features = (rows.rows || rows || []).map((row: any) => ({
      type: "Feature",
      geometry: row.geometry,
      properties: {
        id: row.id,
        kode_pipa: row.kode_pipa,
        nama_jalur: row.nama_jalur,
        kategori: row.kategori,
        material: row.material,
        diameter_mm: row.diameter_mm,
        panjang_m: row.panjang_m,
        tekanan_bar: row.tekanan_bar,
        status: row.status,
        tahun_pasang: row.tahun_pasang,
        zona_dma: row.zona_dma,
        sumber_air: row.sumber_air,
      },
    }));

    res.json({
      type: "FeatureCollection",
      name: "Jaringan_Pipa_PostGIS",
      crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
      features,
    });
  } catch (error: any) {
    console.warn("PostGIS /gis/pipa query fallback (tabel belum dimigrasi di DB):", error.message);
    res.status(200).json({
      type: "FeatureCollection",
      name: "Jaringan_Pipa_Fallback",
      features: [],
      notice: "Tabel PostGIS belum dibuat di database. Jalankan skrip postgis_pdam_schema.sql",
    });
  }
});

/**
 * GET /api/gis/aksesoris
 * Mengembalikan katup/valve, pompa, dan tandon dari PostGIS
 */
router.get("/gis/aksesoris", async (_req: Request, res: Response): Promise<void> => {
  try {
    const query = sql`
      SELECT 
        id,
        kode_aksesoris,
        nama_aksesoris,
        kategori,
        tipe,
        status,
        tekanan_bar,
        kondisi,
        jadwal_cek,
        ST_AsGeoJSON(geom)::json AS geometry
      FROM gis_aksesoris
    `;

    const rows: any = await db.execute(query);

    const features = (rows.rows || rows || []).map((row: any) => ({
      type: "Feature",
      geometry: row.geometry,
      properties: {
        id: row.id,
        kode_aksesoris: row.kode_aksesoris,
        nama_aksesoris: row.nama_aksesoris,
        kategori: row.kategori,
        tipe: row.tipe,
        status: row.status,
        tekanan_bar: row.tekanan_bar,
        kondisi: row.kondisi,
        jadwal_cek: row.jadwal_cek,
      },
    }));

    res.json({
      type: "FeatureCollection",
      name: "Aksesoris_PostGIS",
      features,
    });
  } catch (error: any) {
    res.status(200).json({
      type: "FeatureCollection",
      features: [],
    });
  }
});

/**
 * GET /api/gis/status
 * Cek status koneksi PostGIS database kantor
 */
router.get("/gis/status", async (_req: Request, res: Response): Promise<void> => {
  try {
    const result: any = await db.execute(sql`
      SELECT 
        PostGIS_Version() AS postgis_version,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'gis_pipa') AS has_pipa_table
    `);

    const row = (result.rows || result || [])[0] || {};
    res.json({
      connected: true,
      postgisAvailable: Boolean(row.postgis_version),
      postgisVersion: row.postgis_version || "Belum aktif",
      hasPipaTable: row.has_pipa_table > 0,
    });
  } catch (err: any) {
    res.json({
      connected: false,
      error: err.message,
      recommendation: "Pastikan DATABASE_URL mengarah ke server PostgreSQL dengan PostGIS.",
    });
  }
});

export default router;
