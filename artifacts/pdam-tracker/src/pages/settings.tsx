import React, { useState, useRef, useCallback, useMemo } from 'react';
import { pdamService, kecamatanName, KECAMATAN_BOUNDS, boundsCenter } from '@/services/pdamDataService';
import { ValidationService, ValidationOutput } from '@/services/validationService';
import { WilayahAcuan, UploadSnapshot } from '@/types/pdam';
import { useAuth } from '@/contexts/AuthContext';
import { usePdamData } from '@/hooks/usePdamData';
import { safeColor } from '@/lib/escape';
import { MAX_UPLOAD_BYTES, formatNumber } from '@/lib/constants';
import { toast } from 'sonner';
import { Link } from 'wouter';
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
  History,
  ArrowRight,
  RefreshCw,
  Plus,
  Lock,
  ArrowLeft,
  FileText,
  Check,
  Building2,
  Database,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export default function Settings() {
  const { user, logout } = useAuth();
  const { wilayah: wilayahList, snapshots, activeSnapshot, pelanggan: pelangganList } = usePdamData();

  // Upload States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<ValidationOutput | null>(null);
  const [uploadMode, setUploadMode] = useState<'replace' | 'update'>('replace');

  // Wilayah editing state
  const [newWilayahKode, setNewWilayahKode] = useState<string>('');
  const [newWilayahNama, setNewWilayahNama] = useState<string>('');
  const [newWilayahWarna, setNewWilayahWarna] = useState<string>('#3B6EA8');
  const [showAddWilayahModal, setShowAddWilayahModal] = useState<boolean>(false);

  // Rollback confirmation modal
  const [confirmRollbackId, setConfirmRollbackId] = useState<string | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);

  const isAdmin = user?.role === 'admin';

  // Access guard for non-admin (Removed backdoor S1)
  if (!isAdmin) {
    return (
      <div className="p-6 md:p-12 max-w-2xl mx-auto mt-12 text-center space-y-5 animate-in fade-in">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl md:text-2xl font-heading font-bold text-foreground">
            Akses Terbatas — Khusus Admin Data (IT)
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            Menu <strong>Pengaturan & Upload Data</strong> hanya dapat diakses oleh akun dengan peran <strong>Admin Data (IT)</strong> untuk menjamin keamanan serta integritas master data pelanggan PDAM.
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Button asChild variant="outline" className="rounded-xl text-xs font-semibold gap-2">
            <Link href="/dashboard">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Dashboard</span>
            </Link>
          </Button>
          <Button
            variant="destructive"
            onClick={logout}
            className="rounded-xl text-xs font-semibold gap-2"
          >
            <span>Keluar Akun</span>
          </Button>
        </div>
      </div>
    );
  }

  // Handle File Selection with 20MB limit validation
  const processFile = async (file: File) => {
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error('Ukuran file melebihi batas maksimal 20 MB.');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      toast.error('Format file tidak didukung. Harap gunakan file Excel (.xlsx, .xls) atau CSV.');
      return;
    }

    setSelectedFile(file);
    setIsParsing(true);
    setValidationResult(null);

    try {
      const result = await ValidationService.parseAndValidateFile(file, wilayahList);
      setValidationResult(result);
      if (result.summary.canProceed) {
        toast.success(`Validasi selesai: ${result.summary.validCount} data lolos bersih.`);
      } else {
        toast.error(`Validasi gagal: Ditemukan ${result.summary.errorCount} kesalahan fatal.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memproses file upload.');
      setSelectedFile(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // Apply Validated Data
  const handleApplyUpload = () => {
    if (!validationResult || !validationResult.summary.canProceed || !selectedFile) {
      toast.error('Data belum siap untuk diterapkan.');
      return;
    }

    try {
      const newSnapshot = pdamService.applyUploadedData(
        validationResult.parsedRecords,
        uploadMode,
        selectedFile.name,
        user?.name || 'Administrator IT',
        `Upload file ${selectedFile.name} (${uploadMode === 'replace' ? 'Ganti Total' : 'Perbarui per ID'}).`
      );

      toast.success(
        `Berhasil menerapkan ${validationResult.parsedRecords.length} data pelanggan ke snapshot baru!`
      );
      setSelectedFile(null);
      setValidationResult(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      toast.error(err.message || 'Gagal menerapkan data.');
    }
  };

  // Execute Rollback snapshot
  const handleRollback = (snapshotId: string) => {
    const success = pdamService.restoreSnapshot(snapshotId);
    if (success) {
      toast.success('Snapshot berhasil dipulihkan ke versi tanggal terpilih!');
      setConfirmRollbackId(null);
    } else {
      toast.error('Gagal memulihkan snapshot.');
    }
  };

  // Handle Wilayah Color Change
  const handleColorChange = (kode: string, warna: string) => {
    const cleaned = safeColor(warna, '#3B6EA8');
    pdamService.updateWilayahColor(kode, cleaned);
    toast.success(`Warna wilayah ${kode} diperbarui.`);
  };

  // Reset Wilayah Colors
  const handleResetColors = () => {
    pdamService.resetWilayahColors();
    toast.success('Palet warna wilayah telah dikembalikan ke standar.');
  };

  // Missing wilayah codes detected during validation
  const missingWilayahCodes = useMemo(() => {
    if (!validationResult) return [];
    const codes = new Set<string>();
    validationResult.summary.errors.forEach((err) => {
      if (err.field === 'kode_wilayah' && err.value && /^\d{4}$/.test(String(err.value))) {
        codes.add(String(err.value));
      }
    });
    return Array.from(codes).sort();
  }, [validationResult]);

  // Auto-register missing wilayah codes and re-validate
  const handleAutoRegisterMissingWilayah = () => {
    if (missingWilayahCodes.length === 0) return;

    const AUTO_COLORS = [
      '#0284C7', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16'
    ];

    missingWilayahCodes.forEach((code, idx) => {
      const kodeKec = code.slice(0, 2);
      const namaKec = kecamatanName(kodeKec);
      const bounds = KECAMATAN_BOUNDS[kodeKec];
      const center = bounds ? boundsCenter(bounds) : [-8.7892, 116.2051];
      const warna = AUTO_COLORS[idx % AUTO_COLORS.length];

      pdamService.addWilayah({
        kode: code,
        nama: `Wilayah ${code} (${namaKec})`,
        kodeKecamatan: kodeKec,
        namaKecamatan: namaKec,
        warna,
        centerLat: Number(center[0].toFixed(5)),
        centerLng: Number(center[1].toFixed(5)),
      });
    });

    toast.success(`${missingWilayahCodes.length} kode wilayah baru (${missingWilayahCodes.join(', ')}) berhasil didaftarkan! Memvalidasi ulang...`);

    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  // Add New Wilayah
  const handleAddNewWilayah = () => {
    if (!newWilayahKode || !newWilayahNama) {
      toast.error('Kode dan nama wilayah wajib diisi.');
      return;
    }
    if (!/^\d{4}$/.test(newWilayahKode)) {
      toast.error('Kode wilayah harus 4 digit angka (format KKWW, contoh: 1001 atau 0733).');
      return;
    }

    const kodeKec = newWilayahKode.slice(0, 2);
    const namaKec = kecamatanName(kodeKec);
    const bounds = KECAMATAN_BOUNDS[kodeKec];
    const center = bounds ? boundsCenter(bounds) : [-8.7892, 116.2051];

    pdamService.addWilayah({
      kode: newWilayahKode,
      nama: newWilayahNama,
      kodeKecamatan: kodeKec,
      namaKecamatan: namaKec,
      warna: safeColor(newWilayahWarna, '#3B6EA8'),
      centerLat: Number(center[0].toFixed(5)),
      centerLng: Number(center[1].toFixed(5)),
    });

    toast.success(`Wilayah ${newWilayahKode} - ${newWilayahNama} (Kec. ${namaKec}) berhasil ditambahkan.`);
    setNewWilayahKode('');
    setNewWilayahNama('');
    setShowAddWilayahModal(false);
  };

  // Sinkronisasi data dari PostgreSQL Neon Cloud
  const handleSyncCloud = async () => {
    setIsSyncingCloud(true);
    try {
      const res = await pdamService.syncFromCloud(true);
      if (res.ok) {
        toast.success(res.message || 'Sinkronisasi dengan database Neon Cloud berhasil!');
      } else {
        toast.error(res.message || 'Gagal sinkron dari cloud.');
      }
    } catch (e: any) {
      toast.error('Gagal menghubungi server cloud: ' + e.message);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Unggah paksa data lokal ke database Neon Cloud
  const handlePushCloud = async () => {
    setIsSyncingCloud(true);
    try {
      const res = await pdamService.pushToCloud(pelangganList, 'replace');
      if (res.ok) {
        toast.success(res.message || 'Data lokal berhasil dikirim dan tersimpan di database Neon Cloud!');
      } else {
        toast.error(res.error || 'Gagal menyimpan ke server cloud.');
      }
    } catch (e: any) {
      toast.error('Gagal mengirim data ke server cloud: ' + e.message);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
              Pengaturan & Master Data
            </h1>
            <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30 bg-primary/5">
              Admin Data (IT)
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Unggah dataset pelanggan, validasi integritas format, konfigurasi kode acuan wilayah dan riwayat snapshot.
          </p>
        </div>

        {/* Template Downloads */}
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

      {/* ── Main Tabbed Content ── */}
      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="h-10 bg-muted/50 p-1 border border-border rounded-xl">
          <TabsTrigger value="upload" className="rounded-lg text-xs font-medium gap-2">
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload & Validasi Data</span>
          </TabsTrigger>
          <TabsTrigger value="wilayah" className="rounded-lg text-xs font-medium gap-2">
            <Palette className="w-3.5 h-3.5" />
            <span>Acuan Wilayah & Palet Warna</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg text-xs font-medium gap-2">
            <History className="w-3.5 h-3.5" />
            <span>Riwayat Snapshot & Rollback</span>
          </TabsTrigger>
          <TabsTrigger value="sync" className="rounded-lg text-xs font-medium gap-2">
            <Database className="w-3.5 h-3.5" />
            <span>Pindah / Sinkron Perangkat</span>
          </TabsTrigger>
        </TabsList>

        {/* ════ TAB 1: UPLOAD & VALIDASI ════ */}
        <TabsContent value="upload" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload Zone & Mode Settings */}
            <Card className="rounded-2xl border border-border bg-card shadow-sm space-y-4">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-base font-heading font-semibold text-foreground flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-primary" />
                  Unggah File Pelanggan
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Mendukung file Excel (.xlsx, .xls) dan CSV hingga 20 MB.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Drag & drop box */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40'
                  }`}
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

                {/* Upload Mode Selector */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <label className="text-xs font-heading font-semibold text-foreground">
                    Mode Penerapan Data
                  </label>
                  <RadioGroup
                    value={uploadMode}
                    onValueChange={(val: any) => setUploadMode(val)}
                    className="space-y-2 text-xs"
                  >
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl border border-border bg-muted/20">
                      <RadioGroupItem value="replace" id="mode-replace" className="mt-0.5" />
                      <div className="flex flex-col">
                        <Label htmlFor="mode-replace" className="font-semibold text-xs cursor-pointer">
                          Ganti Total (Snapshot Baru)
                        </Label>
                        <span className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          Seluruh data aktif digantikan dengan data baru. Snapshot lama diarsipkan secara aman di riwayat.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl border border-border bg-muted/20">
                      <RadioGroupItem value="update" id="mode-update" className="mt-0.5" />
                      <div className="flex flex-col">
                        <Label htmlFor="mode-update" className="font-semibold text-xs cursor-pointer">
                          Perbarui / Upsert per ID Pelanggan
                        </Label>
                        <span className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          Data dengan ID yang cocok diperbarui nilainya; ID baru otomatis ditambahkan ke daftar.
                        </span>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            {/* Validation Report & Preview */}
            <Card className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-sm flex flex-col">
              <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-heading font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Laporan Hasil Validasi Data
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Pemeriksaan format 9 digit KKWWxxxxx, kesesuaian kode wilayah acuan, dan rentang koordinat Pulau Lombok.
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
                    <span>Sedang memvalidasi integritas data di Web Worker...</span>
                  </div>
                ) : !validationResult ? (
                  <div className="py-16 text-center space-y-2 text-muted-foreground text-xs">
                    <Database className="w-8 h-8 mx-auto opacity-30 text-primary" />
                    <span>Pilih file di panel sebelah kiri untuk memulai pemeriksaan validasi data.</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary Counters */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 rounded-xl bg-muted/40 border border-border text-center">
                        <span className="text-[10px] font-mono uppercase text-muted-foreground block">Total Baris</span>
                        <span className="text-xl font-mono font-bold text-foreground">
                          {formatNumber(validationResult.summary.totalRows)}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                        <span className="text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400 block">Lolos Bersih</span>
                        <span className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatNumber(validationResult.summary.validCount)}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                        <span className="text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400 block">Peringatan (Flag)</span>
                        <span className="text-xl font-mono font-bold text-amber-600 dark:text-amber-400">
                          {formatNumber(validationResult.summary.flaggedCount)}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                        <span className="text-[10px] font-mono uppercase text-rose-600 dark:text-rose-400 block">Error Fatal</span>
                        <span className="text-xl font-mono font-bold text-rose-600 dark:text-rose-400">
                          {formatNumber(validationResult.summary.errorCount)}
                        </span>
                      </div>
                    </div>

                    {/* Status Notice */}
                    {!validationResult.summary.canProceed ? (
                      <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs space-y-1">
                        <div className="flex items-center gap-2 font-bold">
                          <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
                          <span>Penerapan Ditolak — Ditemukan Format Kolom / Kode Fatal</span>
                        </div>
                        <p className="text-[11px] leading-relaxed pl-6 text-rose-800 dark:text-rose-200">
                          Data master aktif yang sedang berjalan di PDAM <strong>TIDAK AKAN DIUBAH</strong>. Harap perbaiki baris data yang bermasalah pada tabel di bawah lalu unggah kembali file Anda.
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span>Validasi berhasil. File siap diterapkan ke sistem aktif PDAM Tirta Ardhia Rinjani.</span>
                      </div>
                    )}

                    {/* Helper: Auto-Register Missing Wilayah Banner */}
                    {missingWilayahCodes.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 text-xs space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary shrink-0" />
                            <span className="font-semibold text-foreground">
                              Ditemukan {missingWilayahCodes.length} Kode Wilayah Baru Belum Terdaftar: {missingWilayahCodes.join(', ')}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            onClick={handleAutoRegisterMissingWilayah}
                            className="h-8 px-3 rounded-xl text-xs gap-1.5 font-semibold shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Daftarkan Otomatis & Validasi Ulang</span>
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Kode ini belum ada di tabel acuan wilayah: {missingWilayahCodes.map((k) => `${k} (Kec. ${kecamatanName(k.slice(0, 2))})`).join(', ')}. Klik tombol di atas untuk mendaftarkannya otomatis ke sistem agar data pelanggan Anda langsung lolos validasi.
                        </p>
                      </div>
                    )}

                    {/* Detailed Errors Table */}
                    <div className="border border-border rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse font-sans">
                        <thead>
                          <tr className="bg-muted/50 border-b border-border text-[10px] font-mono text-muted-foreground uppercase">
                            <th className="py-2.5 px-3">Baris</th>
                            <th className="py-2.5 px-3">Kolom</th>
                            <th className="py-2.5 px-3">Keterangan Validasi</th>
                            <th className="py-2.5 px-3">Tingkat</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {validationResult.summary.errors.length === 0 &&
                          validationResult.summary.warnings.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-muted-foreground text-xs font-mono">
                                Tidak ada error atau catatan anomali pada file ini.
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
                                      <Badge variant="outline" className="font-mono text-[9px] py-0 px-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
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

        {/* ════ TAB 2: ACUAN WILAYAH & WARNA ════ */}
        <TabsContent value="wilayah" className="space-y-6">
          <Card className="rounded-2xl border border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-heading font-semibold text-foreground flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />
                  Tabel Acuan Wilayah & Palet Warna Titik Spasial
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Kode wilayah (4 digit KKWW) digunakan sebagai acuan validasi ID pelanggan dan penentuan warna marker pada peta GIS.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetColors}
                  className="h-8 px-3 rounded-xl border-border text-xs gap-1.5 hover:bg-muted"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowAddWilayahModal(true)}
                  className="h-8 px-3 rounded-xl text-xs gap-1.5"
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
                      <th className="py-3 px-4 font-semibold">Kode Acuan</th>
                      <th className="py-3 px-4 font-semibold">Nama Wilayah</th>
                      <th className="py-3 px-4 font-semibold">Kecamatan</th>
                      <th className="py-3 px-4 font-semibold">Jumlah Pelanggan</th>
                      <th className="py-3 px-4 font-semibold">Warna Marker</th>
                      <th className="py-3 px-4 font-semibold">Kode HEX</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-sans">
                    {wilayahList.map((w: WilayahAcuan) => (
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
                          {formatNumber(w.totalPelanggan || 0)} Pelanggan
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
                              style={{ backgroundColor: safeColor(w.warna, '#3B6EA8') }}
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
            <Card className="rounded-2xl border border-border bg-card shadow-2xl p-5 max-w-md mx-auto space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="font-heading font-semibold text-sm text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
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

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground block mb-1">
                    Kode Wilayah (4 Digit Angka, misal: 1001 atau 0733)
                  </label>
                  <Input
                    placeholder="Contoh: 1001"
                    value={newWilayahKode}
                    maxLength={4}
                    onChange={(e) => setNewWilayahKode(e.target.value)}
                    className="h-9 rounded-xl text-xs font-mono"
                  />
                  {newWilayahKode.length >= 2 && (
                    <div className="mt-1.5 p-2 rounded-lg bg-primary/10 border border-primary/20 text-[11px] text-foreground flex items-center gap-1.5 flex-wrap">
                      <span className="text-muted-foreground">Kecamatan:</span>
                      <strong className="text-primary font-semibold">{kecamatanName(newWilayahKode.slice(0, 2))}</strong>
                      <span className="text-muted-foreground font-mono">({newWilayahKode.slice(0, 2)})</span>
                      {newWilayahKode.length === 4 && (
                        <>
                          <span className="text-muted-foreground ml-1.5">• Sub-wilayah:</span>
                          <strong className="font-mono">{newWilayahKode.slice(2, 4)}</strong>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground block mb-1">
                    Nama Wilayah / Dusun
                  </label>
                  <Input
                    placeholder="Contoh: Desa Kateng"
                    value={newWilayahNama}
                    onChange={(e) => setNewWilayahNama(e.target.value)}
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground block mb-1">
                    Pilih Warna Marker
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={newWilayahWarna}
                      onChange={(e) => setNewWilayahWarna(e.target.value)}
                      className="w-10 h-8 rounded-lg cursor-pointer border border-border"
                    />
                    <span className="font-mono text-xs uppercase text-foreground">{newWilayahWarna}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddWilayahModal(false)}
                  className="rounded-xl text-xs h-8 px-3"
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddNewWilayah}
                  className="rounded-xl text-xs h-8 px-4"
                >
                  Simpan Wilayah
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ════ TAB 3: RIWAYAT SNAPSHOT & ROLLBACK ════ */}
        <TabsContent value="history" className="space-y-6">
          <Card className="rounded-2xl border border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-heading font-semibold text-foreground flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Riwayat Snapshot Dataset
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Daftar potret data yang tersimpan di sistem. Administrator dapat memulihkan (rollback) data aktif ke versi snapshot sebelumnya secara instan.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-mono text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4 font-semibold">Tanggal Unggah (WITA)</th>
                      <th className="py-3 px-4 font-semibold">Nama File</th>
                      <th className="py-3 px-4 font-semibold">Pengunggah</th>
                      <th className="py-3 px-4 font-semibold">Total Baris</th>
                      <th className="py-3 px-4 font-semibold">Lolos / Flag</th>
                      <th className="py-3 px-4 font-semibold">Status Versi</th>
                      <th className="py-3 px-4 font-semibold text-right">Tindakan</th>
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
                          }) +
                            `, ${new Date(snap.uploaded_at).getHours().toString().padStart(2, '0')}:${new Date(
                              snap.uploaded_at
                            )
                              .getMinutes()
                              .toString()
                              .padStart(2, '0')} WITA`}
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          {snap.filename}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {snap.uploader_name}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-foreground">
                          {formatNumber(snap.total_rows)}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            {formatNumber(snap.valid_rows)}
                          </span>{' '}
                          /{' '}
                          <span className="text-amber-600 dark:text-amber-400 font-bold">
                            {formatNumber(snap.flagged_rows)}
                          </span>
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
                              onClick={() => setConfirmRollbackId(snap.id)}
                              className="h-7 px-2.5 text-[11px] rounded-lg border-border hover:bg-muted"
                              title="Pulihkan data aktif ke versi snapshot ini"
                            >
                              <RotateCcw className="w-3 h-3 mr-1 text-primary" />
                              <span>Pulihkan</span>
                            </Button>
                          ) : (
                            <span className="text-[11px] font-mono text-primary font-semibold">
                              Aktif
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

          {/* Rollback confirmation modal */}
          {confirmRollbackId && (
            <Card className="rounded-2xl border border-border bg-card shadow-2xl p-5 max-w-md mx-auto space-y-4 animate-in fade-in">
              <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm text-foreground">
                    Konfirmasi Pemulihan Data (Rollback)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ID Snapshot: <span className="font-mono font-semibold">{confirmRollbackId}</span>
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Apakah Anda yakin ingin memulihkan seluruh data aktif ke versi snapshot ini? Data pelanggan yang sedang berjalan akan digantikan dengan data pada arsip snapshot terpilih.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmRollbackId(null)}
                  className="rounded-xl text-xs h-8 px-3"
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleRollback(confirmRollbackId)}
                  className="rounded-xl text-xs h-8 px-4 bg-primary text-primary-foreground"
                >
                  Ya, Pulihkan Versi Ini
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ════ TAB 4: PINDAH / SINKRON PERANGKAT ════ */}
        <TabsContent value="sync" className="space-y-6">
          <Card className="rounded-2xl border border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-heading font-semibold text-foreground flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  Sinkronisasi Cloud Database (Neon PostgreSQL & PostGIS)
                </CardTitle>
                <Badge variant="outline" className="border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-[10px] font-mono gap-1.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Cloud Sync Online
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Data pelanggan dan jaringan pipa tersinkronisasi otomatis antar-perangkat (Laptop Kantor, Rumah, HP) melalui server database Neon Cloud.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 space-y-6">
              {/* Cloud Sync Status & Actions */}
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold">
                    <Database className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Sinkronisasi Realtime Terhubung</span>
                  </div>
                  <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-bold">
                    {pelangganList.length.toLocaleString('id-ID')} Titik Aktif
                  </span>
                </div>
                <p className="text-blue-800 dark:text-blue-200 leading-relaxed text-[11.5px]">
                  Setiap kali Anda mengunggah file Excel pelanggan atau file QGIS di laptop kantor, sistem otomatis menyimpannya ke Neon Cloud. Perangkat lain akan langsung memuat data terbaru secara otomatis saat membuka aplikasi.
                </p>
                <div className="pt-1 flex items-center gap-2.5 flex-wrap">
                  <Button
                    size="sm"
                    onClick={handleSyncCloud}
                    disabled={isSyncingCloud}
                    className="h-8 text-xs rounded-xl gap-1.5 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                    <span>Tarik Data Terbaru dari Cloud (Neon)</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePushCloud}
                    disabled={isSyncingCloud || pelangganList.length === 0}
                    className="h-8 text-xs rounded-xl gap-1.5 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100/60 cursor-pointer shadow-xs"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Kirim Data Perangkat Ini ke Cloud</span>
                  </Button>
                </div>
              </div>

              {/* Offline Manual Backup & Restore Section */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Cadangan File Manual (Offline Backup & Restore)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Langkah 1: Ekspor dari perangkat ini */}
                  <div className="p-4 rounded-2xl border border-border bg-muted/10 space-y-3 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">1</span>
                        <h4 className="text-xs font-semibold text-foreground">Unduh File Cadangan (.json)</h4>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Unduh salinan arsip lokal ({pelangganList.length.toLocaleString('id-ID')} titik) untuk cadangan di flashdisk atau arsip internal.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        pdamService.exportDatabaseBackup();
                        toast.success('File backup database PDAM berhasil diunduh.');
                      }}
                      className="w-full h-8 rounded-xl text-xs gap-2"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Backup (.json)</span>
                    </Button>
                  </div>

                  {/* Langkah 2: Pulihkan di perangkat lain */}
                  <div className="p-4 rounded-2xl border border-border bg-muted/10 space-y-3 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs flex items-center justify-center">2</span>
                        <h4 className="text-xs font-semibold text-foreground">Pulihkan dari File Cadangan</h4>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Pilih file backup (.json) untuk memulihkan seluruh data dan snapshot jika perangkat sedang offline tanpa internet.
                      </p>
                    </div>
                    <div>
                      <input
                        type="file"
                        accept=".json"
                        id="restore-backup-input"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const content = event.target?.result as string;
                            const res = pdamService.restoreDatabaseBackup(content);
                            if (res.ok) {
                              toast.success(`Berhasil memulihkan ${res.count?.toLocaleString('id-ID')} data pelanggan ke perangkat ini!`);
                            } else {
                              toast.error(res.reason || 'Gagal memulihkan database.');
                            }
                          };
                          reader.readAsText(file);
                          e.target.value = '';
                        }}
                      />
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById('restore-backup-input')?.click()}
                        className="w-full h-8 rounded-xl text-xs gap-2 border-border hover:bg-muted"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Pilih File Backup (.json) & Pulihkan</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
