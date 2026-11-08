import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Pelanggan, WilayahAcuan } from '@/types/pdam';
import { kecamatanName } from './pdamDataService';
import { PDAM_LOGO_BASE64 } from './logoBase64';

export interface PelangganOutlierItem extends Pelanggan {
  distanceToCenter: number;
  wilayahCenter: { lat: number; lng: number } | null;
  wilayahNamaAcuan: string;
  detectedWilayah: WilayahAcuan | null;
  distanceToDetectedCenter: number;
  isWrongDekade: boolean;
  ownNaturalRadius?: number;
  isMencar?: boolean;
}

export interface PdfReportOptions {
  outliers: PelangganOutlierItem[];
  totalPelangganScoped: number;
  selectedKecamatan: string;
  selectedWilayah: string;
  distanceThreshold: number;
  auditorName: string;
  auditorRole: string;
  wilayahList: WilayahAcuan[];
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('id-ID');
}

export function generateOutlierPdfReport(options: PdfReportOptions): void {
  const {
    outliers,
    totalPelangganScoped,
    selectedKecamatan,
    selectedWilayah,
    distanceThreshold,
    auditorName,
    auditorRole,
    wilayahList,
  } = options;

  // Setup A4 Landscape (297mm x 210mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2; // 273mm

  const today = new Date();
  const dateStr = today.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = today.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  // Find scope labels
  const kecLabel = selectedKecamatan === 'all' ? 'Semua Kecamatan' : `Kecamatan ${kecamatanName(selectedKecamatan)} (${selectedKecamatan})`;
  const wilLabel = selectedWilayah === 'all' ? 'Semua Wilayah / Dekade' : (() => {
    const w = wilayahList.find((item) => item.kode === selectedWilayah);
    return w ? `${w.kode} - ${w.nama}` : `Wilayah ${selectedWilayah}`;
  })();

  // Anomaly summary counts
  const wrongDekadeCount = outliers.filter((o) => o.isWrongDekade).length;
  const sesuaiDekadeCount = outliers.filter((o) => !o.isWrongDekade).length;
  const kritisCount = outliers.filter((o) => o.distanceToCenter >= 2000).length;
  const jauhCount = outliers.filter((o) => o.distanceToCenter >= 1000 && o.distanceToCenter < 2000).length;

  // ═══════════════════════════════════════════════════
  // 1. BRAND HEADER & KOP SURAT (DENGAN LOGO RESMI)
  // ═══════════════════════════════════════════════════

  // Top Accent Bar (Navy Blue + Cyan Stripe)
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, pageWidth, 5, 'F');
  doc.setFillColor(2, 132, 199); // #0284c7 cyan-blue accent
  doc.rect(0, 5, pageWidth, 1.5, 'F');

  // Title Box Background
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.roundedRect(marginX, 9.5, contentWidth, 26, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, 9.5, contentWidth, 26, 2, 2, 'S');

  // Official Logo (slip.png base64) on the Left
  try {
    doc.addImage(PDAM_LOGO_BASE64, 'PNG', marginX + 3.5, 11, 22, 22);
  } catch {
    // Fallback if image fails to load
    doc.setFillColor(2, 132, 199);
    doc.roundedRect(marginX + 3.5, 12, 20, 20, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('PDAM', marginX + 13.5, 24, { align: 'center' });
  }

  // Header Texts
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('PERUMDAM TIRTA ARDHIA RINJANI KABUPATEN LOMBOK TENGAH', marginX + 28, 16.5);

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Sistem Informasi Geografis & Validasi Data Spasial Pelanggan Berbasis Koordinat WGS84', marginX + 28, 21.5);

  // Title without the word "AUDIT" and with "DEKADE"
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('LAPORAN HASIL KOREKSI LOKASI & ANOMALI JARAK DEKADE', marginX + 28, 29);

  // Metadata on the Right (No. Dokumen completely removed as requested)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Tanggal Cetak : ${dateStr}, ${timeStr} WITA`, pageWidth - marginX - 4, 18, { align: 'right' });
  doc.text(`Pemeriksa : ${auditorName} (${auditorRole || 'Petugas'})`, pageWidth - marginX - 4, 23, { align: 'right' });
  doc.text(`Total Baris Dianalisis : ${formatNumber(outliers.length)} Data`, pageWidth - marginX - 4, 28, { align: 'right' });

  // ═══════════════════════════════════════════════════
  // 2. EXECUTIVE METRIC CARDS (4 Boxes)
  // ═══════════════════════════════════════════════════
  const cardY = 38.5;
  const cardHeight = 16;
  const cardGap = 3.5;
  const cardWidth = (contentWidth - cardGap * 3) / 4;

  // Use ">= " instead of unicode "≥" to prevent "e encoding bug
  const thresholdText = `>= ${formatDistance(distanceThreshold)}`;

  interface MetricCard {
    label: string;
    value: string;
    sub: string;
    color: [number, number, number];
    bg: [number, number, number];
  }

  const cards: MetricCard[] = [
    {
      label: 'TOTAL BASIS DATA',
      value: `${formatNumber(totalPelangganScoped)}`,
      sub: 'Pelanggan aktif ber-koordinat',
      color: [15, 23, 42],
      bg: [241, 245, 249],
    },
    {
      label: 'BEDA DEKADE (SALAH WILAYAH)',
      value: `${formatNumber(wrongDekadeCount)} Data`,
      sub: `Titik GPS berada di dekade lain`,
      color: [225, 29, 72], // Rose red
      bg: [255, 241, 242],
    },
    {
      label: 'AMBANG BATAS JARAK',
      value: thresholdText,
      sub: 'Radius dari titik pusat dekade',
      color: [217, 119, 6], // Amber
      bg: [254, 243, 199],
    },
    {
      label: 'CAKUPAN WILAYAH',
      value: kecLabel.length > 22 ? `${kecLabel.slice(0, 20)}...` : kecLabel,
      sub: wilLabel.length > 30 ? `${wilLabel.slice(0, 28)}...` : wilLabel,
      color: [2, 132, 199], // Blue
      bg: [240, 249, 255],
    },
  ];

  cards.forEach((card, i) => {
    const x = marginX + i * (cardWidth + cardGap);
    doc.setFillColor(...card.bg);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 1.5, 1.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(card.label, x + 3.5, cardY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...card.color);
    doc.text(card.value, x + 3.5, cardY + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(card.sub, x + 3.5, cardY + 14);
  });

  // ═══════════════════════════════════════════════════
  // 3. SUMMARY RIBBON: STATUS KESESUAIAN DEKADE
  // ═══════════════════════════════════════════════════
  const ribbonY = 57.5;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, ribbonY, contentWidth, 7.5, 1, 1, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.roundedRect(marginX, ribbonY, contentWidth, 7.5, 1, 1, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('Klasifikasi Hasil Analisis Spasial :', marginX + 3.5, ribbonY + 5);

  const ribbons = [
    { text: `Salah Dekade (Nyasar): ${wrongDekadeCount}`, color: [185, 28, 28] },
    { text: `Sesuai Dekade (Jarak Jauh): ${sesuaiDekadeCount}`, color: [180, 83, 9] },
    { text: `Jarak Kritis (>2 km): ${kritisCount}`, color: [194, 65, 12] },
    { text: `Jarak Jauh (1-2 km): ${jauhCount}`, color: [2, 132, 199] },
  ];

  let ribbonX = marginX + 50;
  ribbons.forEach((r) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(r.color[0], r.color[1], r.color[2]);
    doc.text(`• ${r.text}`, ribbonX, ribbonY + 5);
    ribbonX += 54;
  });

  // ═══════════════════════════════════════════════════
  // 4. TABEL DETAIL LOKASI PELANGGAN (autoTable)
  // ═══════════════════════════════════════════════════
  // Rekomendasi Audit column removed as requested!
  // Columns: NO | KODE PEL. | NAMA PELANGGAN | ALAMAT | DEKADE TERDAFTAR | DEKADE TERDETEKSI (TITIK GPS) | STATUS | JARAK DEV. | KOORDINAT GPS
  const tableData = outliers.map((p, idx) => {
    const terdaftarStr = `${p.kode_wilayah} - ${p.wilayahNamaAcuan}`;
    const terdeteksiStr = p.detectedWilayah
      ? `${p.detectedWilayah.kode} - ${p.detectedWilayah.nama}`
      : '-';

    const statusStr = p.isWrongDekade ? 'BEDA DEKADE' : 'SESUAI DEKADE';
    const gpsCoord = `${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}`;

    return [
      (idx + 1).toString(),
      p.kode_pelanggan,
      p.nama_pelanggan || '-',
      p.alamat ? (p.alamat.length > 28 ? `${p.alamat.slice(0, 26)}...` : p.alamat) : '-',
      terdaftarStr,
      terdeteksiStr,
      statusStr,
      formatDistance(p.distanceToCenter),
      gpsCoord,
    ];
  });

  autoTable(doc, {
    startY: 68,
    margin: { left: marginX, right: marginX, bottom: 20 },
    head: [[
      'NO',
      'KODE PEL.',
      'NAMA PELANGGAN',
      'ALAMAT RUMAH',
      'DEKADE TERDAFTAR',
      'DEKADE TERDETEKSI (TITIK GPS)',
      'KESESUAIAN',
      'JARAK KE PUSAT',
      'KOORDINAT GPS',
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 6.8,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [15, 23, 42], // Deep Navy #0f172a
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // #f8fafc
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' }, // No
      1: { cellWidth: 22, fontStyle: 'bold', halign: 'center' }, // Kode
      2: { cellWidth: 38 }, // Nama
      3: { cellWidth: 42 }, // Alamat
      4: { cellWidth: 36 }, // Dekade Terdaftar
      5: { cellWidth: 40, fontStyle: 'bold' }, // Dekade Terdeteksi
      6: { cellWidth: 26, halign: 'center', fontStyle: 'bold' }, // Kesesuaian
      7: { cellWidth: 25, fontStyle: 'bold', halign: 'right' }, // Jarak
      8: { cellWidth: 36, halign: 'center', font: 'courier' }, // GPS
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const rowIdx = data.row.index;
        const item = outliers[rowIdx];
        if (item) {
          // Highlight "KESESUAIAN" (col 6) and "DEKADE TERDETEKSI" (col 5) if wrong dekade
          if (item.isWrongDekade) {
            if (data.column.index === 5 || data.column.index === 6) {
              data.cell.styles.fillColor = [254, 242, 242]; // Light red
              data.cell.styles.textColor = [185, 28, 28]; // Dark red
            }
          } else {
            if (data.column.index === 6) {
              data.cell.styles.fillColor = [236, 253, 245]; // Light green
              data.cell.styles.textColor = [5, 150, 105]; // Green
            }
          }
          // Highlight distance column
          if (data.column.index === 7) {
            if (item.distanceToCenter >= 2000) {
              data.cell.styles.textColor = [185, 28, 28];
            } else if (item.distanceToCenter >= 1000) {
              data.cell.styles.textColor = [194, 65, 12];
            }
          }
        }
      }
    },
    didDrawPage: () => {
      // Footer on every page
      const pageNumber = doc.getNumberOfPages();
      doc.setFillColor(241, 245, 249);
      doc.rect(marginX, pageHeight - 11, contentWidth, 0.2, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        'Sistem Validasi Spasial PDAM Tirta Ardhia Rinjani Lombok Tengah — Data bersifat rahasia untuk keperluan validasi internal.',
        marginX,
        pageHeight - 6
      );
      doc.text(
        `Halaman ${pageNumber} | Dicetak pada ${dateStr} ${timeStr}`,
        pageWidth - marginX,
        pageHeight - 6,
        { align: 'right' }
      );
    },
  });

  // ═══════════════════════════════════════════════════
  // 5. SIGNATURE & LEMBAR PENGESAHAN (Halaman Terakhir)
  // ═══════════════════════════════════════════════════
  const finalY = (doc as any).lastAutoTable?.finalY || 140;
  let signY = finalY + 10;

  if (signY + 35 > pageHeight - 14) {
    doc.addPage();
    signY = 25;
  }

  const signBoxWidth = 85;
  const leftSignX = marginX + 15;
  const rightSignX = pageWidth - marginX - signBoxWidth - 15;

  // Left Signature: Pemeriksa / Petugas GIS
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Dibuat & Diverifikasi oleh :', leftSignX, signY);
  doc.setFont('helvetica', 'bold');
  doc.text('Petugas / Analis GIS Lapangan', leftSignX, signY + 4.5);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(leftSignX, signY + 22, leftSignX + signBoxWidth, signY + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(auditorName || 'Operator GIS PDAM', leftSignX, signY + 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Jabatan: ${auditorRole || 'Tim Verifikasi Data Master'}`, leftSignX, signY + 30);

  // Right Signature: Mengetahui / Pejabat PDAM
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Mengetahui & Menyetujui :', rightSignX, signY);
  doc.setFont('helvetica', 'bold');
  doc.text('Kepala Bagian Trandis / Hublang', rightSignX, signY + 4.5);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(rightSignX, signY + 22, rightSignX + signBoxWidth, signY + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('(......................................................)', rightSignX, signY + 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('NIP. .................................................', rightSignX, signY + 30);

  // Save the PDF
  const filename = `Laporan_Koreksi_Lokasi_PDAM_${selectedKecamatan === 'all' ? 'Semua' : `Kec_${selectedKecamatan}`}_${today.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
