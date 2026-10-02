import React, { useState, useEffect, useRef } from 'react';
import { pdamService, DEFAULT_WILAYAH_LIST } from '@/services/pdamDataService';
import { ValidationService, ValidationOutput } from '@/services/validationService';
import { Pelanggan, WilayahAcuan, UploadSnapshot, ValidationErrorItem } from '@/types/pdam';
import { useAuth } from '@/contexts/AuthContext';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Palette,
  Shield,
  RotateCcw,
  Sliders,
  History,
  Layers,
  ArrowRight,
  RefreshCw,
  Plus,
  Trash2,
  Lock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export default function Settings() {
  const { user, switchRole } = useAuth();

  const [wilayahList, setWilayahList] = useState<WilayahAcuan[]>([]);
  const [snapshots, setSnapshots] = useState<UploadSnapshot[]>([]);
  const [activeSnapshot, setActiveSnapshot] = useState<UploadSnapshot | undefined>();

  // Upload States (S-1, S-2, S-3, S-4)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<ValidationOutput | null>(null);
  const [uploadMode, setUploadMode] = useState<'replace' | 'update'>('replace');
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string>('');

  // Wilayah editing state (S-6)
  const [newWilayahKode, setNewWilayahKode] = useState<string>('');
  const [newWilayahNama, setNewWilayahNama] = useState<string>('');
  const [newWilayahWarna, setNewWilayahWarna] = useState<string>('#3B82F6');
  const [showAddWilayahModal, setShowAddWilayahModal] = useState<boolean>(false);

  // Sync with service data
  useEffect(() => {
    const load = () => {
      setWilayahList(pdamService.getWilayahList());
      setSnapshots(pdamService.getSnapshots());
      setActiveSnapshot(pdamService.getActiveSnapshot());
    };
    load();
    const unsub = pdamService.subscribe(load);
    return unsub;
  }, []);

  const isAdmin = user?.role === 'admin';

  // Access guard for non-admin (PRD S-7)
  if (!isAdmin) {
    return (
      <div className="p-8 max-w-2xl mx-auto mt-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-heading font-bold text-foreground">
          Akses Khusus Admin Data (IT)
        </h2>
        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
          Menu <strong>Settingan & Upload</strong> hanya dapat diakses oleh peran <strong>Admin Data (IT)</strong> untuk menjamin keamanan dan integritas master data pelanggan (PRD ID: S-7).
        </p>
        <div className="pt-4">
          <Button
            onClick={() => switchRole('admin')}
            className="rounded-xl px-5 text-xs font-semibold gap-2"
          >
            <Shield className="w-4 h-4" />
            <span>Alihkan ke Peran Admin Data</span>
          </Button>
        </div>
      </div>
    );
  }

  // Handle File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsParsing(true);
    setUploadSuccessMessage('');
    setValidationResult(null);

    try {
      const result = await ValidationService.parseAndValidateFile(file, wilayahList);
      setValidationResult(result);
    } catch (err: any) {
      alert(err.message || 'Gagal memproses file upload.');
    } finally {
      setIsParsing(false);
    }
  };

  // Handle Applying Validated Data (S-3, S-4)
  const handleApplyUpload = () => {
    if (!validationResult || !validationResult.summary.canProceed || !selectedFile) {
      return;
    }

    const newSnapshot = pdamService.applyUploadedData(
      validationResult.parsedRecords,
      uploadMode,
      selectedFile.name,
      user?.name || 'Muh Sofiyan Hawari',
      `Upload file ${selectedFile.name} (${uploadMode === 'replace' ? 'Ganti Total' : 'Perbarui per ID'}).`
    );

    setUploadSuccessMessage(
      `Berhasil menerapkan ${validationResult.parsedRecords.length} data pelanggan ke sistem snapshot (${newSnapshot.id}).`
    );
    setSelectedFile(null);
    setValidationResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Rollback snapshot (S-5)
  const handleRollback = (snapshotId: string) => {
    const success = pdamService.restoreSnapshot(snapshotId);
    if (success) {
      alert('Snapshot berhasil dipulihkan ke versi tanggal terpilih!');
    }
  };

  // Handle Wilayah Color Change (S-6)
  const handleColorChange = (kode: string, warna: string) => {
    pdamService.updateWilayahColor(kode, warna);
  };

  // Handle Reset Wilayah Colors
  const handleResetColors = () => {
    if (confirm('Kembalikan semua warna wilayah ke konfigurasi awal PRD?')) {
      pdamService.resetWilayahColors();
    }
  };

  // Handle Add New Wilayah
  const handleAddNewWilayah = () => {
    if (!newWilayahKode || !newWilayahNama) {
      alert('Kode dan nama wilayah wajib diisi.');
      return;
    }
    if (!/^\d{4}$/.test(newWilayahKode)) {
      alert('Kode wilayah harus 4 digit angka (format KKWW, contoh: 0733).');
      return;
    }

    pdamService.addWilayah({
      kode: newWilayahKode,
      nama: newWilayahNama,
      kodeKecamatan: newWilayahKode.slice(0, 2),
      namaKecamatan: 'Praya Barat',
      warna: newWilayahWarna,
      centerLat: -8.7892,
      centerLng: 116.2051,
    });

    setNewWilayahKode('');
    setNewWilayahNama('');
    setShowAddWilayahModal(false);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
              Settingan & Upload Data
            </h1>
            <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30 bg-primary/5">
              Khusus Admin (IT)
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Unggah file pelanggan, validasi data, pengaturan tabel acuan wilayah dan palet warna titik GIS.
          </p>
        </div>

        {/* Template Downloads (S-1) */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => pdamService.generateTemplate('xlsx')}
            className="h-9 px-3 rounded-xl border-border gap-2 text-xs font-medium hover:bg-muted"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Unduh Template Excel</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => pdamService.generateTemplate('csv')}
            className="h-9 px-3 rounded-xl border-border gap-2 text-xs font-medium hover:bg-muted"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Template CSV</span>
          </Button>
        </div>
      </div>

      {/* ── Success Alert Message ── */}
      {uploadSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-medium">{uploadSuccessMessage}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUploadSuccessMessage('')}
            className="h-6 px-2 text-xs hover:bg-emerald-500/20"
          >
            Tutup
          </Button>
        </div>
      )}

      {/* ── Main Tabbed Content ── */}
      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="h-10 bg-muted/50 p-1 border border-border rounded-xl">
          <TabsTrigger value="upload" className="rounded-lg text-xs font-medium gap-2">
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload File & Validasi</span>
          </TabsTrigger>
          <TabsTrigger value="wilayah" className="rounded-lg text-xs font-medium gap-2">
            <Palette className="w-3.5 h-3.5" />
            <span>Acuan Wilayah & Warna</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg text-xs font-medium gap-2">
            <History className="w-3.5 h-3.5" />
            <span>Riwayat Upload & Rollback</span>
          </TabsTrigger>
        </TabsList>

        {/* ════ TAB 1: UPLOAD DATA & VALIDATION ENGINE (S-1, S-2, S-3, S-4) ════ */}
        <TabsContent value="upload" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload Zone & Mode Settings (1/3 width) */}
            <Card className="rounded-xl border border-border bg-card shadow-sm space-y-4">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-base font-heading font-semibold text-foreground flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-primary" />
                  Unggah File Pelanggan (S-1)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Format file didukung: Excel (.xlsx, .xls) dan CSV.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Drag and drop box */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-muted/40"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold text-foreground block">
                    {selectedFile ? selectedFile.name : 'Pilih atau Tarik File ke Sini'}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-1 block">
                    {selectedFile
                      ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                      : 'File Excel (.xlsx) atau CSV sesuai template baku'}
                  </span>
                </div>

                {/* Upload Mode Selector (S-4) */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <label className="text-xs font-heading font-semibold text-foreground">
                    Mode Penerapan Data (S-4)
                  </label>
                  <RadioGroup
                    value={uploadMode}
                    onValueChange={(val: any) => setUploadMode(val)}
                    className="space-y-2 text-xs"
                  >
                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-muted/20">
                      <RadioGroupItem value="replace" id="mode-replace" className="mt-0.5" />
                      <div className="flex flex-col">
                        <Label htmlFor="mode-replace" className="font-semibold text-xs cursor-pointer">
                          Ganti Seluruh Data (Snapshot Baru)
                        </Label>
                        <span className="text-[11px] text-muted-foreground mt-0.5">
                          Seluruh data aktif digantikan dengan data baru di file. Data lama diarsipkan di riwayat.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-muted/20">
                      <RadioGroupItem value="update" id="mode-update" className="mt-0.5" />
                      <div className="flex flex-col">
                        <Label htmlFor="mode-update" className="font-semibold text-xs cursor-pointer">
                          Perbarui Berdasarkan ID Pelanggan (Upsert)
                        </Label>
                        <span className="text-[11px] text-muted-foreground mt-0.5">
                          ID yang cocok diperbarui datanya; ID baru otomatis ditambahkan ke daftar pelanggan.
                        </span>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            {/* Validation Report & Preview (2/3 width) (S-2, S-3) */}
            <Card className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm flex flex-col">
              <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-heading font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Laporan Hasil Validasi (S-2)
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Pemeriksaan format 9 digit KKWWxxxxx, kode wilayah acuan, dan rentang koordinat WGS84.
                  </CardDescription>
                </div>

                {validationResult && (
                  <Button
                    onClick={handleApplyUpload}
                    disabled={!validationResult.summary.canProceed}
                    className="rounded-xl text-xs font-semibold gap-1.5 h-9"
                  >
                    <span>Terapkan Data</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </CardHeader>

              <CardContent className="p-4 flex-1 flex flex-col justify-between">
                {isParsing ? (
                  <div className="py-16 text-center space-y-3 font-mono text-xs text-primary animate-pulse">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto" />
                    <span>Sedang memvalidasi aturan data PRD...</span>
                  </div>
                ) : !validationResult ? (
                  <div className="py-16 text-center space-y-2 text-muted-foreground text-xs">
                    <Shield className="w-8 h-8 mx-auto opacity-30 text-primary" />
                    <span>Pilih file di panel sebelah kiri untuk memulai proses validasi data.</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary Counters */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 rounded-lg bg-muted/40 border border-border text-center">
                        <span className="text-[10px] font-mono uppercase text-muted-foreground block">Total Baris</span>
                        <span className="text-xl font-mono font-bold text-foreground">
                          {validationResult.summary.totalRows}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                        <span className="text-[10px] font-mono uppercase text-emerald-500 block">Lolos Bersih</span>
                        <span className="text-xl font-mono font-bold text-emerald-500">
                          {validationResult.summary.validCount}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                        <span className="text-[10px] font-mono uppercase text-amber-500 block">Peringatan (Flag)</span>
                        <span className="text-xl font-mono font-bold text-amber-500">
                          {validationResult.summary.flaggedCount}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                        <span className="text-[10px] font-mono uppercase text-red-500 block">Error Blokir</span>
                        <span className="text-xl font-mono font-bold text-red-500">
                          {validationResult.summary.errorCount}
                        </span>
                      </div>
                    </div>

                    {/* Fatal Error Status Notice (S-3) */}
                    {!validationResult.summary.canProceed ? (
                      <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs space-y-1">
                        <div className="flex items-center gap-2 font-bold">
                          <XCircle className="w-4 h-4 shrink-0" />
                          <span>Upload Ditolak — Terdapat Error Format Fatal (S-3)</span>
                        </div>
                        <p className="text-[11px] text-destructive/90 leading-relaxed pl-6">
                          Sesuai aturan PRD ID S-3, data lama <strong>TIDAK AKAN TERTIMPA</strong> jika validasi gagal. Perbaiki baris di bawah pada file master Excel Anda lalu upload ulang.
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Validasi lolos. File siap diterapkan ke sistem aktif PDAM Tiara.</span>
                      </div>
                    )}

                    {/* Detailed Errors / Warnings Table */}
                    <div className="border border-border rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse font-sans">
                        <thead>
                          <tr className="bg-muted/50 border-b border-border text-[10px] font-mono text-muted-foreground uppercase">
                            <th className="py-2 px-3">Baris</th>
                            <th className="py-2 px-3">Kolom</th>
                            <th className="py-2 px-3">Pesan Validasi</th>
                            <th className="py-2 px-3">Tingkat</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {validationResult.summary.errors.length === 0 &&
                          validationResult.summary.warnings.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-muted-foreground text-xs font-mono">
                                Tidak ada error atau catatan peringatan ditemukan pada file ini.
                              </td>
                            </tr>
                          ) : (
                            [...validationResult.summary.errors, ...validationResult.summary.warnings].map(
                              (item, idx) => (
                                <tr key={idx} className="hover:bg-muted/30">
                                  <td className="py-2 px-3 font-mono font-bold text-foreground">
                                    {item.rowNumber}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-muted-foreground">
                                    {item.field}
                                  </td>
                                  <td className="py-2 px-3 text-foreground text-[11px]">
                                    {item.message}
                                  </td>
                                  <td className="py-2 px-3">
                                    {item.severity === 'error' ? (
                                      <Badge variant="destructive" className="font-mono text-[9px] py-0 px-1.5">
                                        Error
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="font-mono text-[9px] py-0 px-1.5 bg-amber-500/10 text-amber-500 border-amber-500/20">
                                        Warning
                                      </Badge>
                                    )}
                                  </td>
                                </tr>
                              )
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ════ TAB 2: ACUAN WILAYAH & WARNA PER KODE (S-6, D-8, G-1) ════ */}
        <TabsContent value="wilayah" className="space-y-6">
          <Card className="rounded-xl border border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-heading font-semibold text-foreground flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />
                  Tabel Acuan Wilayah & Pengaturan Warna (S-6)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Warna tiap kode wilayah (0701-0732) langsung tercermin di Bar Chart Dashboard dan titik sebaran GIS.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetColors}
                  className="h-8 px-3 rounded-lg border-border text-xs gap-1.5 hover:bg-muted"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Warna Default</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowAddWilayahModal(true)}
                  className="h-8 px-3 rounded-lg text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Wilayah</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-mono text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4 font-semibold">Kode (4 Digit)</th>
                      <th className="py-3 px-4 font-semibold">Nama Wilayah</th>
                      <th className="py-3 px-4 font-semibold">Kecamatan</th>
                      <th className="py-3 px-4 font-semibold">Jumlah Pelanggan</th>
                      <th className="py-3 px-4 font-semibold">Warna Titik GIS</th>
                      <th className="py-3 px-4 font-semibold">HEX Code</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-sans">
                    {wilayahList.map((w) => (
                      <tr key={w.kode} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-foreground">
                          {w.kode}
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          {w.nama}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {w.kodeKecamatan} ({w.namaKecamatan})
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground">
                          {w.totalPelanggan || 0} Pelanggan
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="color"
                              value={w.warna}
                              onChange={(e) => handleColorChange(w.kode, e.target.value)}
                              className="w-8 h-8 rounded-lg cursor-pointer border border-border p-0.5 bg-background"
                              title={`Ubah warna wilayah ${w.nama}`}
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm border border-white/50"
                              style={{ backgroundColor: w.warna }}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs uppercase text-muted-foreground">
                          {w.warna}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Add Wilayah Modal Inline */}
          {showAddWilayahModal && (
            <Card className="rounded-xl border border-border bg-card shadow-xl p-4 max-w-md mx-auto space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="font-heading font-semibold text-sm text-foreground">
                  Tambah Acuan Wilayah Baru
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddWilayahModal(false)}
                  className="h-6 w-6 p-0 text-muted-foreground"
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground block mb-1">
                    Kode Wilayah (4 Digit, misal: 0733)
                  </label>
                  <Input
                    placeholder="0733"
                    value={newWilayahKode}
                    onChange={(e) => setNewWilayahKode(e.target.value)}
                    className="h-8.5 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground block mb-1">
                    Nama Wilayah
                  </label>
                  <Input
                    placeholder="Nama desa / dusun"
                    value={newWilayahNama}
                    onChange={(e) => setNewWilayahNama(e.target.value)}
                    className="h-8.5 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground block mb-1">
                    Pilih Warna
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={newWilayahWarna}
                      onChange={(e) => setNewWilayahWarna(e.target.value)}
                      className="w-10 h-8 rounded-lg cursor-pointer"
                    />
                    <span className="font-mono text-xs uppercase">{newWilayahWarna}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddWilayahModal(false)}
                  className="rounded-lg text-xs h-8"
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddNewWilayah}
                  className="rounded-lg text-xs h-8"
                >
                  Simpan Wilayah
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ════ TAB 3: RIWAYAT UPLOAD & ROLLBACK (S-5) ════ */}
        <TabsContent value="history" className="space-y-6">
          <Card className="rounded-xl border border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-heading font-semibold text-foreground flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Riwayat Snapshot Upload (S-5)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Daftar potret data yang pernah diunggah. Admin dapat memulihkan (rollback) data ke versi sebelumnya.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-mono text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4 font-semibold">Tanggal & Waktu</th>
                      <th className="py-3 px-4 font-semibold">Nama File</th>
                      <th className="py-3 px-4 font-semibold">Pengunggah</th>
                      <th className="py-3 px-4 font-semibold">Total Baris</th>
                      <th className="py-3 px-4 font-semibold">Valid / Flag</th>
                      <th className="py-3 px-4 font-semibold">Status Versi</th>
                      <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-sans">
                    {snapshots.map((snap) => (
                      <tr key={snap.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-foreground">
                          {new Date(snap.uploaded_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          }) + `, ${new Date(snap.uploaded_at).getHours().toString().padStart(2, '0')}:${new Date(snap.uploaded_at).getMinutes().toString().padStart(2, '0')} WITA`}
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          {snap.filename}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {snap.uploader_name} ({snap.uploader_role})
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-foreground">
                          {snap.total_rows}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className="text-emerald-500 font-bold">{snap.valid_rows}</span> /{' '}
                          <span className="text-amber-500 font-bold">{snap.flagged_rows}</span>
                        </td>
                        <td className="py-3 px-4">
                          {snap.is_active ? (
                            <Badge className="font-mono text-[10px] bg-primary text-primary-foreground border-transparent">
                              Aktif Sekarang
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground border-border">
                              Arsip
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!snap.is_active ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRollback(snap.id)}
                              className="h-7 px-2.5 text-[11px] rounded-lg border-border hover:bg-muted"
                              title="Pulihkan data aktif ke versi snapshot ini"
                            >
                              <RotateCcw className="w-3 h-3 mr-1 text-primary" />
                              <span>Pulihkan</span>
                            </Button>
                          ) : (
                            <span className="text-[11px] font-mono text-primary font-semibold">
                              Sedang Digunakan
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
