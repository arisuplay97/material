import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Pelanggan, WilayahAcuan } from '@/types/pdam';
import { kecamatanName } from './pdamDataService';

export interface PelangganOutlierItem extends Pelanggan {
  distanceToCenter: number;
  wilayahCenter: { lat: number; lng: number } | null;
  wilayahNamaAcuan: string;
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

function getSeverityInfo(meters: number): { label: string; bg: [number, number, number]; text: [number, number, number]; action: string } {
  if (meters < 200) {
    return { label: 'Normal (<200m)', bg: [236, 253, 245], text: [5, 150, 105], action: 'Sesuai Wilayah' };
  }
  if (meters < 500) {
    return { label: 'Wajar (200-500m)', bg: [240, 249, 255], text: [2, 132, 199], action: 'Monitor Rutin' };
  }
  if (meters < 1000) {
    return { label: 'Agak Jauh (0.5-1km)', bg: [254, 252, 232], text: [180, 83, 9], action: 'Tinjau Batas Dekadi' };
  }
  if (meters < 2000) {
    return { label: 'Jauh (1-2km)', bg: [255, 247, 237], text: [194, 65, 12], action: 'Verifikasi Titik Fisik' };
  }
  return { label: 'Kritis (>2km)', bg: [254, 242, 242], text: [185, 28, 28], action: 'Urgensi Mutasi / Re-tag' };
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
  const docId = `AUDIT-GIS-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Find scope labels
  const kecLabel = selectedKecamatan === 'all' ? 'Semua Kecamatan' : `Kecamatan ${kecamatanName(selectedKecamatan)} (${selectedKecamatan})`;
  const wilLabel = selectedWilayah === 'all' ? 'Semua Wilayah / Dekadi' : (() => {
    const w = wilayahList.find((item) => item.kode === selectedWilayah);
    return w ? `${w.kode} - ${w.nama}` : `Wilayah ${selectedWilayah}`;
  })();

  // Severity buckets for the summary card
  const kritisCount = outliers.filter((o) => o.distanceToCenter >= 2000).length;
  const jauhCount = outliers.filter((o) => o.distanceToCenter >= 1000 && o.distanceToCenter < 2000).length;
  const sedangCount = outliers.filter((o) => o.distanceToCenter >= 500 && o.distanceToCenter < 1000).length;
  const ringanCount = outliers.filter((o) => o.distanceToCenter < 500).length;

  // ═══════════════════════════════════════════════════
  // 1. BRAND HEADER & KOP SURAT
  // ═══════════════════════════════════════════════════

  // Top Accent Bar (Gradient imitation: Deep Navy + Cyan Stripe)
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, pageWidth, 5, 'F');
  doc.setFillColor(2, 132, 199); // #0284c7 cyan-blue accent
  doc.rect(0, 5, pageWidth, 1.5, 'F');

  // Title Box Background
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.roundedRect(marginX, 10, contentWidth, 25, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, 10, contentWidth, 25, 2, 2, 'S');

  // Decorative Icon/Badge Placeholder on the Left
  doc.setFillColor(2, 132, 199);
  doc.roundedRect(marginX + 3, 13, 19, 19, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PDAM', marginX + 12.5, 22, { align: 'center' });
  doc.setFontSize(7);
  doc.text('GIS', marginX + 12.5, 27, { align: 'center' });

  // Header Texts
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('PERUMDAM TIRTA ARDHIA RINJANI KABUPATEN LOMBOK TENGAH', marginX + 26, 17);

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Sistem Informasi Geografis & Validasi Data Spasial Pelanggan Berbasis Koordinat WGS84', marginX + 26, 22);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('LAPORAN HASIL AUDIT KOREKSI LOKASI & ANOMALI JARAK DEKADI', marginX + 26, 29);

  // Document Metadata on the Right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`No. Dokumen : ${docId}`, pageWidth - marginX - 4, 16, { align: 'right' });
  doc.text(`Tanggal Cetak : ${dateStr}, ${timeStr} WITA`, pageWidth - marginX - 4, 21, { align: 'right' });
  doc.text(`Pemeriksa : ${auditorName} (${auditorRole || 'Petugas'})`, pageWidth - marginX - 4, 26, { align: 'right' });

  // ═══════════════════════════════════════════════════
  // 2. EXECUTIVE METRIC CARDS (4 Boxes)
  // ═══════════════════════════════════════════════════
  const cardY = 38;
  const cardHeight = 16;
  const cardGap = 3.5;
  const cardWidth = (contentWidth - cardGap * 3) / 4;

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
      label: 'ANOMALI TERDETEKSI',
      value: `${formatNumber(outliers.length)}`,
      sub: `Melebihi ambang batas (${totalPelangganScoped ? ((outliers.length / totalPelangganScoped) * 100).toFixed(1) : '0'}%)`,
      color: [225, 29, 72], // Rose red
      bg: [255, 241, 242],
    },
    {
      label: 'AMBANG BATAS JARAK',
      value: `≥ ${formatDistance(distanceThreshold)}`,
      sub: 'Radius dari titik pusat dekadi',
      color: [217, 119, 6], // Amber
      bg: [254, 243, 199],
    },
    {
      label: 'CAKUPAN WILAYAH AUDIT',
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
  // 3. SEVERITY BREAKDOWN RIBBON
  // ═══════════════════════════════════════════════════
  const ribbonY = 57;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, ribbonY, contentWidth, 7.5, 1, 1, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.roundedRect(marginX, ribbonY, contentWidth, 7.5, 1, 1, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('Tingkat Keparahan Anomali :', marginX + 3.5, ribbonY + 5);

  const badges = [
    { text: `Kritis (>2 km): ${kritisCount}`, color: [185, 28, 28] },
    { text: `Jauh (1-2 km): ${jauhCount}`, color: [194, 65, 12] },
    { text: `Agak Jauh (500m-1km): ${sedangCount}`, color: [180, 83, 9] },
    { text: `Wajar (<500m): ${ringanCount}`, color: [5, 150, 105] },
  ];

  let badgeX = marginX + 42;
  badges.forEach((b) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(b.color[0], b.color[1], b.color[2]);
    doc.text(`• ${b.text}`, badgeX, ribbonY + 5);
    badgeX += 54;
  });

  // ═══════════════════════════════════════════════════
  // 4. TABEL DETAIL OUTLIER (autoTable)
  // ═══════════════════════════════════════════════════
  const tableData = outliers.map((p, idx) => {
    const sev = getSeverityInfo(p.distanceToCenter);
    const gpsCoord = `${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}`;
    const centerCoord = p.wilayahCenter
      ? `${p.wilayahCenter.lat.toFixed(5)}, ${p.wilayahCenter.lng.toFixed(5)}`
      : '-';

    return [
      (idx + 1).toString(),
      p.kode_pelanggan,
      p.nama_pelanggan || '-',
      p.alamat ? (p.alamat.length > 25 ? `${p.alamat.slice(0, 23)}...` : p.alamat) : '-',
      `${p.kode_wilayah} - ${p.wilayahNamaAcuan}`,
      kecamatanName(p.kode_kecamatan),
      formatDistance(p.distanceToCenter),
      sev.label,
      gpsCoord,
      centerCoord,
      sev.action,
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
      'WILAYAH / DEKADI',
      'KECAMATAN',
      'JARAK',
      'KEPARAHAN',
      'GPS PELANGGAN',
      'PUSAT DEKADI',
      'REKOMENDASI AUDIT',
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 6.5,
      cellPadding: 1.6,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [15, 23, 42], // Deep Navy #0f172a
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // #f8fafc
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' }, // No
      1: { cellWidth: 20, fontStyle: 'bold', halign: 'center' }, // Kode
      2: { cellWidth: 32 }, // Nama
      3: { cellWidth: 35 }, // Alamat
      4: { cellWidth: 32 }, // Wilayah
      5: { cellWidth: 22 }, // Kecamatan
      6: { cellWidth: 16, fontStyle: 'bold', halign: 'right' }, // Jarak
      7: { cellWidth: 26, halign: 'center', fontStyle: 'bold' }, // Keparahan
      8: { cellWidth: 28, halign: 'center', font: 'courier' }, // GPS Pelanggan
      9: { cellWidth: 28, halign: 'center', font: 'courier' }, // Pusat Dekadi
      10: { cellWidth: 26, halign: 'center', fontStyle: 'bold' }, // Rekomendasi
    },
    didParseCell: (data) => {
      // Highlight Jarak & Keparahan column based on severity
      if (data.section === 'body') {
        const rowIdx = data.row.index;
        const outlierItem = outliers[rowIdx];
        if (outlierItem) {
          const sev = getSeverityInfo(outlierItem.distanceToCenter);
          // Highlight column 6 (Jarak) and 7 (Keparahan) and 10 (Rekomendasi)
          if (data.column.index === 6 || data.column.index === 7) {
            data.cell.styles.fillColor = sev.bg;
            data.cell.styles.textColor = sev.text;
          }
          if (data.column.index === 10) {
            if (outlierItem.distanceToCenter >= 2000) {
              data.cell.styles.textColor = [185, 28, 28];
            }
          }
        }
      }
    },
    didDrawPage: (data) => {
      // Footer on every page
      const pageNumber = doc.getNumberOfPages();
      doc.setFillColor(241, 245, 249);
      doc.rect(marginX, pageHeight - 11, contentWidth, 0.2, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        'Sistem Audit Spasial PDAM Tirta Ardhia Rinjani Lombok Tengah — Data bersifat rahasia untuk keperluan validasi internal.',
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
  // Let's check available vertical space on the last page
  const finalY = (doc as any).lastAutoTable?.finalY || 140;
  let signY = finalY + 10;

  // If there's not enough space for signature block (needs ~35mm), add a new page
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
  const filename = `Laporan_Audit_Koreksi_Spasial_PDAM_${selectedKecamatan === 'all' ? 'Semua' : `Kec_${selectedKecamatan}`}_${today.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
