import React, { useState, useRef, useCallback, useMemo } from 'react';
import { pdamService, kecamatanName, KECAMATAN_BOUNDS, boundsCenter } from '@/services/pdamDataService';
import { ValidationService, ValidationOutput } from '@/services/validationService';
import { WilayahAcuan, UploadSnapshot } from '@/types/pdam';
import { useAuth } from '@/contexts/AuthContext';
import { usePdamData } from '@/hooks/usePdamData';
import { safeColor } from '@/lib/escape';
import { cn } from '@/lib/utils';
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
  Pencil,
  X,
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [parsingProgress, setParsingProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  const [fileSummaries, setFileSummaries] = useState<{ name: string; rows: number; size: number }[]>([]);
  const selectedFile = selectedFiles[0] || null;
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<ValidationOutput | null>(null);
  const [uploadMode, setUploadMode] = useState<'replace' | 'update'>('update');

  // Wilayah editing state
  const [newWilayahKode, setNewWilayahKode] = useState<string>('');
  const [newWilayahNama, setNewWilayahNama] = useState<string>('');
  const [newWilayahWarna, setNewWilayahWarna] = useState<string>('#3B6EA8');
  const [showAddWilayahModal, setShowAddWilayahModal] = useState<boolean>(false);
  const [editingWilayahKode, setEditingWilayahKode] = useState<string | null>(null);
  const [editingWilayahNama, setEditingWilayahNama] = useState<string>('');

  // Rollback confirmation modal
  const [confirmRollbackId, setConfirmRollbackId] = useState<string | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [cloudProgress, setCloudProgress] = useState<{ sent: number; total: number } | null>(null);

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

  // Handle File Selection (supports single or multiple files)
  const processFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    for (const f of files) {
      if (f.size > MAX_UPLOAD_BYTES) {
        toast.error(`File "${f.name}" melebihi batas maksimal 20 MB.`);
        continue;
      }
      const ext = f.name.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
        toast.error(`File "${f.name}" diabaikan (format harus .xlsx, .xls, atau .csv).`);
        continue;
      }
      validFiles.push(f);
    }

    if (validFiles.length === 0) {
      toast.error('Tidak ada file Excel atau CSV yang valid untuk diproses.');
      return;
    }

    setSelectedFiles(validFiles);
    setIsParsing(true);
    setValidationResult(null);
    setFileSummaries([]);

    try {
      if (validFiles.length === 1) {
        setParsingProgress({ current: 1, total: 1, fileName: validFiles[0].name });
        const result = await ValidationService.parseAndValidateFile(validFiles[0], wilayahList);
        setValidationResult(result);
        setFileSummaries([{ name: validFiles[0].name, rows: result.parsedRecords.length, size: validFiles[0].size }]);
        if (result.summary.canProceed) {
          toast.success(`Validasi selesai: ${result.summary.validCount.toLocaleString('id-ID')} data siap diterapkan.`);
        } else {
          toast.error(`Validasi menemukan ${result.summary.errorCount} format kolom tidak valid.`);
        }
      } else {
        const result = await ValidationService.parseAndValidateMultipleFiles(
          validFiles,
          wilayahList,
          (current, total, fileName) => {
            setParsingProgress({ current, total, fileName });
          }
        );
        setValidationResult(result);
        setFileSummaries(result.fileSummaries);
        if (result.summary.canProceed) {
          toast.success(
            `Validasi ${validFiles.length} file sukses: Total ${result.summary.validCount.toLocaleString('id-ID')} data siap diterapkan!`
          );
        } else {
          toast.error(`Validasi ${validFiles.length} file selesai dengan ${result.summary.errorCount} kesalahan.`);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memproses file upload.');
      setSelectedFiles([]);
      setFileSummaries([]);
    } finally {
      setIsParsing(false);
      setParsingProgress(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) processFiles(files);
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
    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    if (files.length > 0) processFiles(files);
  };

  // Apply Validated Data
  const handleApplyUpload = async () => {
    if (!validationResult || !validationResult.summary.canProceed || selectedFiles.length === 0) {
      toast.error('Data belum siap untuk diterapkan.');
      return;
    }

    try {
      setIsSyncingCloud(true);
      const fileLabel =
        selectedFiles.length === 1
          ? selectedFiles[0].name
          : `${selectedFiles.length} File Excel (${selectedFiles.map((f) => f.name.replace(/\.[^/.]+$/, '')).slice(0, 3).join(', ')}${selectedFiles.length > 3 ? '...' : ''})`;

      const newSnapshot = pdamService.applyUploadedData(
        validationResult.parsedRecords,
        uploadMode,
        fileLabel,
        user?.name || 'Administrator IT',
        `Upload ${fileLabel} (${uploadMode === 'replace' ? 'Ganti Total' : 'Perbarui/Gabungkan ID'}).`
      );

      const allRecords = pdamService.getPelangganList();
      toast.success(
        `Berhasil menerapkan ${validationResult.parsedRecords.length.toLocaleString('id-ID')} data pelanggan dari ${selectedFiles.length} file (${uploadMode === 'update' ? 'digabungkan' : 'ganti total'}). Menyimpan ke Neon Cloud...`
      );
      setSelectedFiles([]);
      setFileSummaries([]);
      setValidationResult(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      const cloudRes = await pdamService.pushToCloud(allRecords, 'replace', (sent, total) => {
        setCloudProgress({ sent, total });
      });

      if (cloudRes.ok) {
        toast.success(`Sinkronisasi selesai! Total ${allRecords.length.toLocaleString('id-ID')} pelanggan tersimpan di Neon Cloud.`);
      } else {
        toast.warning(`Tersimpan lokal, namun sinkronisasi Neon Cloud gagal: ${cloudRes.error}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menerapkan data.');
    } finally {
      setIsSyncingCloud(false);
      setCloudProgress(null);
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

  // Handle Wilayah Name Edit
  const handleStartEditWilayah = (w: WilayahAcuan) => {
    setEditingWilayahKode(w.kode);
    setEditingWilayahNama(w.nama);
  };

  const handleSaveEditWilayah = (kode: string) => {
    const trimmed = editingWilayahNama.trim();
    if (!trimmed) {
      toast.error('Nama wilayah tidak boleh kosong.');
      return;
    }
    pdamService.updateWilayahName(kode, trimmed);
    toast.success(`Nama wilayah ${kode} berhasil diperbarui menjadi "${trimmed}".`);
    setEditingWilayahKode(null);
  };

  const handleCancelEditWilayah = () => {
    setEditingWilayahKode(null);
    setEditingWilayahNama('');
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

  // Detected Kecamatans in the parsed records (useful for multi-file verification)
  const detectedKecamatans = useMemo(() => {
    if (!validationResult || !validationResult.parsedRecords) return [];
    const counts = new Map<string, number>();
    for (const p of validationResult.parsedRecords) {
      const kec = p.kode_kecamatan || p.kode_pelanggan.slice(0, 2);
      counts.set(kec, (counts.get(kec) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
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

    if (selectedFiles.length > 0) {
      processFiles(selectedFiles);
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
    setCloudProgress({ sent: 0, total: pelangganList.length });
    try {
      const res = await pdamService.pushToCloud(pelangganList, 'replace', (sent, total) => {
        setCloudProgress({ sent, total });
      });
      if (res.ok) {
        toast.success(res.message || 'Data lokal berhasil dikirim dan tersimpan di database Neon Cloud!');
      } else {
        toast.error(res.error || 'Gagal menyimpan ke server cloud.');
      }
    } catch (e: any) {
      toast.error('Gagal mengirim data ke server cloud: ' + e.message);
    } finally {
      setIsSyncingCloud(false);
      setCloudProgress(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1440px] mx-auto text-[#18181b] dark:text-zinc-100">
      {/* ── Top Overview Container Card (Cloudflare Style) ── */}
      <div className="rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[16px] font-semibold text-[#18181b] dark:text-zinc-100 tracking-[-0.01em]">
              Master &amp; database
            </h1>
            <span className="rounded-full border border-dashed border-[#d4d4d8] dark:border-zinc-700 px-2.5 py-0.5 text-[11px] font-medium text-[#52525b] dark:text-zinc-300">
              Admin IT
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pdamService.generateTemplate('csv')}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Template CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pdamService.generateTemplate('xlsx')}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Template Excel</span>
            </Button>
            <Button
              size="sm"
              onClick={handleSyncCloud}
              disabled={isSyncingCloud}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
              <span>Sinkron Neon Cloud</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Main Tabbed Content ── */}
      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-0.5">
          <TabsTrigger value="upload">
            Upload &amp; validasi data
          </TabsTrigger>
          <TabsTrigger value="wilayah">
            Acuan wilayah &amp; warna
          </TabsTrigger>
          <TabsTrigger value="history">
            Riwayat snapshot &amp; rollback
          </TabsTrigger>
          <TabsTrigger value="sync">
            Sinkronisasi perangkat
          </TabsTrigger>
        </TabsList>

        {/* ════ TAB 1: UPLOAD & VALIDASI ════ */}
        <TabsContent value="upload" className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Upload Zone & Mode Settings */}
            <Card className="overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#e5e7eb] dark:border-zinc-800">
                <h2 className="text-[15px] font-semibold text-[#18181b] dark:text-zinc-100">
                  Unggah file pelanggan
                </h2>
                <p className="text-[12px] text-[#71717a] dark:text-zinc-400 mt-0.5">
                  Mendukung file Excel (.xlsx, .xls) dan CSV hingga 20 MB.
                </p>
              </div>
              <CardContent className="p-5 space-y-4">
                {/* Drag & drop box */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-[#1368f6] bg-[#1368f6]/5'
                      : 'border-[#d4d4d8] dark:border-zinc-700 hover:border-[#18181b] dark:hover:border-zinc-500 bg-[#fafafa] dark:bg-zinc-900/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {selectedFiles.length === 0 ? (
                    <>
                      <FileSpreadsheet className="w-6 h-6 text-[#71717a] mx-auto mb-2.5 stroke-[1.6]" />
                      <span className="text-[13px] font-medium text-[#18181b] dark:text-zinc-100 block">
                        Pilih atau tarik file ke sini
                      </span>
                      <span className="text-[12px] text-[#71717a] dark:text-zinc-400 mt-1 block">
                        Bisa pilih 1 file atau banyak file Excel sekaligus
                      </span>
                    </>
                  ) : selectedFiles.length === 1 ? (
                    <>
                      <FileSpreadsheet className="w-6 h-6 text-[#1368f6] mx-auto mb-2 stroke-[1.6]" />
                      <span className="text-[13px] font-medium text-[#18181b] dark:text-zinc-100 block truncate">
                        {selectedFiles[0].name}
                      </span>
                      <span className="text-[12px] text-[#71717a] mt-0.5 block">
                        {(selectedFiles[0].size / 1024).toFixed(1)} KB • Klik untuk ganti file
                      </span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-6 h-6 text-[#1368f6] mx-auto mb-2 stroke-[1.6]" />
                      <span className="text-[13px] font-medium text-[#18181b] dark:text-zinc-100 block">
                        {selectedFiles.length} file Excel terpilih
                      </span>
                      <span className="text-[12px] text-[#71717a] mt-0.5 block">
                        Total {(selectedFiles.reduce((acc, f) => acc + f.size, 0) / 1024).toFixed(1)} KB • Klik untuk pilih ulang
                      </span>
                    </>
                  )}
                </div>

                {/* File list preview if multiple files are selected */}
                {selectedFiles.length > 1 && (
                  <div className="space-y-1.5 p-3 rounded-lg border border-[#e5e7eb] dark:border-zinc-800 bg-[#fafafa] dark:bg-zinc-900/50 max-h-40 overflow-y-auto">
                    <div className="text-[12px] text-[#71717a] flex items-center justify-between">
                      <span>{selectedFiles.length} file terunggah:</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFiles([]);
                          setFileSummaries([]);
                          setValidationResult(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-[#71717a] hover:text-red-600 text-[12px] cursor-pointer"
                      >
                        Bersihkan
                      </button>
                    </div>
                    <div className="space-y-1">
                      {selectedFiles.map((f, idx) => {
                        const summary = fileSummaries.find((s) => s.name === f.name);
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-[12px] px-2.5 py-1.5 rounded-md bg-white dark:bg-zinc-900 border border-[#e5e7eb] dark:border-zinc-800"
                          >
                            <span className="truncate font-medium text-[#18181b] dark:text-zinc-100">{f.name}</span>
                            <span className="text-[11.5px] text-[#71717a] shrink-0 ml-2 tabular-nums">
                              {summary ? `${summary.rows.toLocaleString('id-ID')} baris` : `${(f.size / 1024).toFixed(0)} KB`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Upload Mode Selector */}
                <div className="space-y-2.5 pt-3 border-t border-[#e5e7eb] dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-medium text-[#18181b] dark:text-zinc-100">
                      Mode penerapan data
                    </label>
                    <span className="text-[12px] text-[#71717a] tabular-nums">
                      Aktif: {pelangganList.length.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <RadioGroup
                    value={uploadMode}
                    onValueChange={(val: any) => setUploadMode(val)}
                    className="space-y-2 text-[13px]"
                  >
                    <div
                      className={cn(
                        'flex items-start gap-2.5 p-3 rounded-lg border transition-colors cursor-pointer',
                        uploadMode === 'update'
                          ? 'bg-[#fafafa] dark:bg-zinc-800/60 border-[#18181b] dark:border-zinc-400'
                          : 'bg-white dark:bg-zinc-900 border-[#e5e7eb] dark:border-zinc-800'
                      )}
                    >
                      <RadioGroupItem value="update" id="mode-update" className="mt-0.5" />
                      <div className="flex flex-col">
                        <Label htmlFor="mode-update" className="font-medium text-[13px] cursor-pointer flex items-center gap-2 text-[#18181b] dark:text-zinc-100">
                          <span>Gabungkan data (tambah &amp; perbarui ID)</span>
                          <span className="rounded-full border border-dashed border-[#d4d4d8] dark:border-zinc-700 px-2 py-0.2 text-[10.5px] font-normal text-[#52525b] dark:text-zinc-300">
                            Rekomendasi
                          </span>
                        </Label>
                        <span className="text-[12px] text-[#71717a] dark:text-zinc-400 mt-0.5 leading-relaxed">
                          Menambah atau memperbarui data per kecamatan tanpa menghapus kecamatan lain yang sudah tersimpan.
                        </span>
                      </div>
                    </div>

                    <div
                      className={cn(
                        'flex items-start gap-2.5 p-3 rounded-lg border transition-colors cursor-pointer',
                        uploadMode === 'replace'
                          ? 'bg-[#fafafa] dark:bg-zinc-800/60 border-[#18181b] dark:border-zinc-400'
                          : 'bg-white dark:bg-zinc-900 border-[#e5e7eb] dark:border-zinc-800'
                      )}
                    >
                      <RadioGroupItem value="replace" id="mode-replace" className="mt-0.5" />
                      <div className="flex flex-col">
                        <Label htmlFor="mode-replace" className="font-medium text-[13px] cursor-pointer text-[#18181b] dark:text-zinc-100">
                          Ganti total seluruh data (reset master)
                        </Label>
                        <span className="text-[12px] text-[#71717a] dark:text-zinc-400 mt-0.5 leading-relaxed">
                          Seluruh data master aktif digantikan sepenuhnya hanya dengan file ini.
                        </span>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            {/* Validation Report & Preview */}
            <Card className="lg:col-span-2 overflow-hidden flex flex-col">
              <div className="px-5 py-3.5 border-b border-[#e5e7eb] dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold text-[#18181b] dark:text-zinc-100">
                    Laporan hasil validasi data
                  </h2>
                  <p className="text-[12px] text-[#71717a] dark:text-zinc-400 mt-0.5">
                    Pemeriksaan format 9 digit KKWWxxxxx, kesesuaian kode wilayah acuan, dan rentang koordinat Pulau Lombok.
                  </p>
                </div>

                {validationResult && (
                  <Button
                    size="sm"
                    onClick={handleApplyUpload}
                    disabled={!validationResult.summary.canProceed || isSyncingCloud}
                  >
                    {isSyncingCloud ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{cloudProgress ? `Sinkron (${cloudProgress.sent}/${cloudProgress.total})...` : 'Menyimpan...'}</span>
                      </>
                    ) : (
                      <>
                        <span>Terapkan data</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                )}
              </div>

              <CardContent className="p-5 flex-1 flex flex-col justify-between">
                {isParsing ? (
                  <div className="py-16 text-center space-y-3 text-[13px] text-[#71717a]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#1368f6]" />
                    <span className="block">
                      {parsingProgress
                        ? `Sedang membaca & memvalidasi file ${parsingProgress.current} dari ${parsingProgress.total} (${parsingProgress.fileName})...`
                        : 'Sedang memvalidasi integritas data...'}
                    </span>
                  </div>
                ) : !validationResult ? (
                  <div className="py-16 text-center space-y-1.5 text-[#71717a] text-[13px]">
                    <p className="font-medium text-[#18181b] dark:text-zinc-100">Belum ada file dipilih</p>
                    <p className="text-[12.5px]">Pilih file di panel sebelah kiri untuk memulai pemeriksaan validasi data.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary Counters (Cloudflare Clean Metric Boxes) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        <span className="text-[12px] text-[#71717a] block">Total baris</span>
                        <span className="text-[20px] font-semibold text-[#18181b] dark:text-zinc-100 tabular-nums mt-0.5 block">
                          {formatNumber(validationResult.summary.totalRows)}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        <span className="text-[12px] text-[#71717a] block">Lolos bersih</span>
                        <span className="text-[20px] font-semibold text-[#18181b] dark:text-zinc-100 tabular-nums mt-0.5 block">
                          {formatNumber(validationResult.summary.validCount)}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        <span className="text-[12px] text-[#71717a] block">Peringatan (flag)</span>
                        <span className="text-[20px] font-semibold text-[#18181b] dark:text-zinc-100 tabular-nums mt-0.5 block">
                          {formatNumber(validationResult.summary.flaggedCount)}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        <span className="text-[12px] text-[#71717a] block">Error fatal</span>
                        <span className="text-[20px] font-semibold text-[#18181b] dark:text-zinc-100 tabular-nums mt-0.5 block">
                          {formatNumber(validationResult.summary.errorCount)}
                        </span>
                      </div>
                    </div>

                    {/* Detected Kecamatans Breakdown across all uploaded files */}
                    {detectedKecamatans.length > 0 && (
                      <div className="p-3.5 rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-[#fafafa] dark:bg-zinc-900/50 space-y-2">
                        <div className="flex items-center justify-between text-[12.5px] font-medium text-[#18181b] dark:text-zinc-100">
                          <span>Cakupan kecamatan ({detectedKecamatans.length} kecamatan terdeteksi)</span>
                          {selectedFiles.length > 1 && (
                            <span className="rounded-full border border-dashed border-[#d4d4d8] px-2.5 py-0.5 text-[11px] text-[#52525b]">
                              {selectedFiles.length} file digabung
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {detectedKecamatans.map(([kec, count]) => (
                            <div
                              key={kec}
                              className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-[#e5e7eb] dark:border-zinc-800 text-[12px] flex items-center gap-1.5"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#1368f6]" />
                              <span className="font-medium text-[#18181b] dark:text-zinc-100">Kec. {kec} ({kecamatanName(kec)})</span>
                              <span className="text-[#71717a] tabular-nums">• {count.toLocaleString('id-ID')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Helper: Auto-Register Missing Wilayah Banner */}
                    {missingWilayahCodes.length > 0 && (
                      <div className="p-4 rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[13px] space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="font-medium text-[#18181b] dark:text-zinc-100">
                            Ditemukan {missingWilayahCodes.length} kode wilayah baru belum terdaftar: {missingWilayahCodes.join(', ')}
                          </span>
                          <Button
                            size="sm"
                            onClick={handleAutoRegisterMissingWilayah}
                            className="shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Daftarkan otomatis &amp; validasi ulang</span>
                          </Button>
                        </div>
                        <p className="text-[12px] text-[#71717a] leading-relaxed">
                          Klik tombol di atas untuk mendaftarkan kode wilayah tersebut secara otomatis agar data pelanggan langsung lolos validasi.
                        </p>
                      </div>
                    )}

                    {/* Detailed Errors Table */}
                    <div className="border border-[#e5e7eb] dark:border-zinc-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                      <table className="w-full text-left text-[12.5px] border-collapse">
                        <thead>
                          <tr className="bg-[#fafafa] dark:bg-zinc-900/50 border-b border-[#e5e7eb] dark:border-zinc-800 text-[12px] text-[#71717a]">
                            <th className="py-2.5 px-4 font-medium">Baris</th>
                            <th className="py-2.5 px-4 font-medium">Kolom</th>
                            <th className="py-2.5 px-4 font-medium">Keterangan validasi</th>
                            <th className="py-2.5 px-4 font-medium">Tingkat</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5e7eb] dark:divide-zinc-800">
                          {validationResult.summary.errors.length === 0 &&
                          validationResult.summary.warnings.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-[#71717a] text-[12.5px]">
                                Tidak ada error atau catatan anomali pada file ini.
                              </td>
                            </tr>
                          ) : (
                            [...validationResult.summary.errors, ...validationResult.summary.warnings].map(
                              (item, idx) => (
                                <tr key={idx} className="hover:bg-[#fafafa] dark:hover:bg-zinc-800/40">
                                  <td className="py-2.5 px-4 font-medium text-[#18181b] dark:text-zinc-100 tabular-nums">
                                    {item.rowNumber}
                                  </td>
                                  <td className="py-2.5 px-4 text-[#71717a]">
                                    {item.field}
                                  </td>
                                  <td className="py-2.5 px-4 text-[#18181b] dark:text-zinc-200">
                                    {item.message}
                                  </td>
                                  <td className="py-2.5 px-4">
                                    {item.severity === 'error' ? (
                                      <span className="rounded-full border border-dashed border-red-300 bg-red-50/60 px-2.5 py-0.5 text-[11px] text-red-700">
                                        Error
                                      </span>
                                    ) : (
                                      <span className="rounded-full border border-dashed border-[#d4d4d8] bg-[#fafafa] px-2.5 py-0.5 text-[11px] text-[#52525b]">
                                        Peringatan
                                      </span>
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
        <TabsContent value="wilayah" className="space-y-5">
          <Card className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#e5e7eb] dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-[#18181b] dark:text-zinc-100">
                  Tabel acuan wilayah &amp; palet warna titik spasial
                </h2>
                <p className="text-[12px] text-[#71717a] dark:text-zinc-400 mt-0.5">
                  Kode wilayah (4 digit KKWW) digunakan sebagai acuan validasi ID pelanggan dan warna marker peta GIS.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetColors}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset warna</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowAddWilayahModal(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah wilayah</span>
                </Button>
              </div>
            </div>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#e5e7eb] dark:border-zinc-800 bg-[#fafafa] dark:bg-zinc-900/50 text-[#71717a] text-[12px]">
                      <th className="py-2.5 px-5 font-medium">Kode acuan</th>
                      <th className="py-2.5 px-4 font-medium">Nama wilayah</th>
                      <th className="py-2.5 px-4 font-medium">Kecamatan</th>
                      <th className="py-2.5 px-4 font-medium">Jumlah pelanggan</th>
                      <th className="py-2.5 px-4 font-medium">Warna marker</th>
                      <th className="py-2.5 px-4 font-medium">Kode HEX</th>
                      <th className="py-2.5 px-5 font-medium text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e7eb] dark:divide-zinc-800">
                    {wilayahList.map((w: WilayahAcuan) => (
                      <tr key={w.kode} className="hover:bg-[#fafafa] dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-5 font-medium text-[#18181b] dark:text-zinc-100 tabular-nums">
                          {w.kode}
                        </td>
                        <td className="py-3 px-4 text-[#18181b] dark:text-zinc-100">
                          {editingWilayahKode === w.kode ? (
                            <div className="flex items-center gap-1.5">
                              <Input
                                value={editingWilayahNama}
                                onChange={(e) => setEditingWilayahNama(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEditWilayah(w.kode);
                                  if (e.key === 'Escape') handleCancelEditWilayah();
                                }}
                                autoFocus
                                className="h-8 text-[12.5px] px-2.5 w-48"
                                placeholder="Nama wilayah..."
                              />
                              <Button
                                size="sm"
                                onClick={() => handleSaveEditWilayah(w.kode)}
                                className="h-8 w-8 p-0 shrink-0"
                                title="Simpan nama"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEditWilayah}
                                className="h-8 w-8 p-0 shrink-0"
                                title="Batal"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <span>{w.nama}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[#71717a] dark:text-zinc-400">
                          {w.kodeKecamatan} ({w.namaKecamatan})
                        </td>
                        <td className="py-3 px-4 text-[#71717a] dark:text-zinc-400 tabular-nums">
                          {formatNumber(w.totalPelanggan || 0)} pelanggan
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="color"
                              value={w.warna}
                              onChange={(e) => handleColorChange(w.kode, e.target.value)}
                              className="w-7 h-7 rounded-lg cursor-pointer border border-[#e4e4e7] p-0.5 bg-white"
                              title={`Ubah warna wilayah ${w.nama}`}
                            />
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: safeColor(w.warna, '#3B6EA8') }}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[12px] text-[#71717a] tabular-nums">
                          {w.warna}
                        </td>
                        <td className="py-3 px-5 text-right">
                          {editingWilayahKode === w.kode ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleSaveEditWilayah(w.kode)}
                                className="h-7 px-2.5 text-[12px]"
                              >
                                Simpan
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEditWilayah}
                                className="h-7 px-2.5 text-[12px]"
                              >
                                Batal
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartEditWilayah(w)}
                              className="h-7 px-2.5 text-[12px]"
                            >
                              Ubah nama
                            </Button>
                          )}
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
            <Card className="p-5 max-w-md mx-auto space-y-4">
              <div className="flex items-center justify-between border-b border-[#e5e7eb] dark:border-zinc-800 pb-3">
                <span className="font-semibold text-[14px] text-[#18181b] dark:text-zinc-100">
                  Tambah acuan wilayah baru
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddWilayahModal(false)}
                  className="h-7 w-7 p-0 text-[#71717a]"
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-3.5 text-[13px]">
                <div>
                  <label className="text-[12px] text-[#71717a] block mb-1">
                    Kode wilayah (4 digit angka, misal: 1001)
                  </label>
                  <Input
                    placeholder="Contoh: 1001"
                    value={newWilayahKode}
                    maxLength={4}
                    onChange={(e) => setNewWilayahKode(e.target.value)}
                  />
                  {newWilayahKode.length >= 2 && (
                    <div className="mt-1.5 p-2.5 rounded-lg bg-[#fafafa] dark:bg-zinc-800 border border-[#e5e7eb] dark:border-zinc-700 text-[12px] text-[#18181b] dark:text-zinc-200 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[#71717a]">Kecamatan:</span>
                      <strong className="font-medium">{kecamatanName(newWilayahKode.slice(0, 2))}</strong>
                      <span className="text-[#71717a]">({newWilayahKode.slice(0, 2)})</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[12px] text-[#71717a] block mb-1">
                    Nama wilayah / dusun
                  </label>
                  <Input
                    placeholder="Contoh: Desa Kateng"
                    value={newWilayahNama}
                    onChange={(e) => setNewWilayahNama(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[12px] text-[#71717a] block mb-1">
                    Pilih warna marker
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={newWilayahWarna}
                      onChange={(e) => setNewWilayahWarna(e.target.value)}
                      className="w-9 h-8 rounded-lg cursor-pointer border border-[#e4e4e7]"
                    />
                    <span className="text-[12.5px] text-[#18181b] dark:text-zinc-200 tabular-nums">{newWilayahWarna}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e5e7eb] dark:border-zinc-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddWilayahModal(false)}
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddNewWilayah}
                >
                  Simpan wilayah
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ════ TAB 3: RIWAYAT SNAPSHOT & ROLLBACK ════ */}
        <TabsContent value="history" className="space-y-5">
          <Card className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#e5e7eb] dark:border-zinc-800">
              <h2 className="text-[15px] font-semibold text-[#18181b] dark:text-zinc-100">
                Riwayat snapshot dataset
              </h2>
              <p className="text-[12px] text-[#71717a] dark:text-zinc-400 mt-0.5">
                Daftar versi data yang tersimpan di sistem. Anda dapat memulihkan (rollback) data aktif ke versi sebelumnya.
              </p>
            </div>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#e5e7eb] dark:border-zinc-800 bg-[#fafafa] dark:bg-zinc-900/50 text-[#71717a] text-[12px]">
                      <th className="py-2.5 px-5 font-medium">Tanggal unggah (WITA)</th>
                      <th className="py-2.5 px-4 font-medium">Nama file</th>
                      <th className="py-2.5 px-4 font-medium">Pengunggah</th>
                      <th className="py-2.5 px-4 font-medium">Total baris</th>
                      <th className="py-2.5 px-4 font-medium">Lolos / flag</th>
                      <th className="py-2.5 px-4 font-medium">Status versi</th>
                      <th className="py-2.5 px-5 font-medium text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e7eb] dark:divide-zinc-800">
                    {snapshots.map((snap) => (
                      <tr key={snap.id} className="hover:bg-[#fafafa] dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-5 text-[#18181b] dark:text-zinc-100 tabular-nums">
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
                        <td className="py-3 px-4 font-medium text-[#18181b] dark:text-zinc-100">
                          {snap.filename}
                        </td>
                        <td className="py-3 px-4 text-[#71717a] dark:text-zinc-400">
                          {snap.uploader_name}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#18181b] dark:text-zinc-100 tabular-nums">
                          {formatNumber(snap.total_rows)}
                        </td>
                        <td className="py-3 px-4 tabular-nums text-[#71717a]">
                          <span className="text-[#18181b] dark:text-zinc-100 font-medium">
                            {formatNumber(snap.valid_rows)}
                          </span>{' '}
                          / {formatNumber(snap.flagged_rows)}
                        </td>
                        <td className="py-3 px-4">
                          {snap.is_active ? (
                            <span className="rounded-full border border-dashed border-[#d4d4d8] dark:border-zinc-700 bg-[#fafafa] dark:bg-zinc-800 px-2.5 py-0.5 text-[11px] font-medium text-[#18181b] dark:text-zinc-100">
                              Aktif
                            </span>
                          ) : (
                            <span className="text-[12px] text-[#71717a]">
                              Arsip
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-5 text-right">
                          {!snap.is_active ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmRollbackId(snap.id)}
                              className="h-7 px-2.5 text-[12px]"
                            >
                              Pulihkan
                            </Button>
                          ) : (
                            <span className="text-[12px] text-[#71717a]">
                              Versi saat ini
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
            <Card className="p-5 max-w-md mx-auto space-y-4">
              <div>
                <h3 className="font-semibold text-[14px] text-[#18181b] dark:text-zinc-100">
                  Konfirmasi pemulihan data (rollback)
                </h3>
                <p className="text-[12px] text-[#71717a] mt-0.5">
                  ID snapshot: {confirmRollbackId}
                </p>
              </div>

              <p className="text-[12.5px] text-[#52525b] dark:text-zinc-300 leading-relaxed">
                Apakah Anda yakin ingin memulihkan seluruh data aktif ke versi snapshot ini?
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e5e7eb] dark:border-zinc-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmRollbackId(null)}
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleRollback(confirmRollbackId)}
                >
                  Ya, pulihkan versi ini
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ════ TAB 4: PINDAH / SINKRON PERANGKAT ════ */}
        <TabsContent value="sync" className="space-y-5">
          <Card className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#e5e7eb] dark:border-zinc-800 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-[15px] font-semibold text-[#18181b] dark:text-zinc-100">
                  Sinkronisasi cloud database (Neon PostgreSQL &amp; PostGIS)
                </h2>
                <p className="text-[12px] text-[#71717a] dark:text-zinc-400 mt-0.5">
                  Data pelanggan dan jaringan pipa tersinkronisasi antar-perangkat melalui server database Neon Cloud.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e4e4e7] dark:border-zinc-700 px-2.5 py-0.5 text-[11.5px] text-[#18181b] dark:text-zinc-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Cloud online
              </span>
            </div>

            <CardContent className="p-5 space-y-5">
              {/* Cloud Sync Status & Actions */}
              <div className="p-4 rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-[#fafafa] dark:bg-zinc-900/50 text-[13px] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#18181b] dark:text-zinc-100">
                    Sinkronisasi realtime terhubung
                  </span>
                  <span className="text-[12.5px] text-[#52525b] dark:text-zinc-300 font-medium tabular-nums">
                    {pelangganList.length.toLocaleString('id-ID')} titik aktif
                  </span>
                </div>
                <p className="text-[#52525b] dark:text-zinc-400 leading-relaxed text-[12.5px]">
                  Setiap kali Anda mengunggah file Excel pelanggan atau file QGIS, sistem otomatis menyimpannya ke Neon Cloud agar perangkat lain selalu memuat data terbaru.
                </p>
                <div className="pt-1 flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={handleSyncCloud}
                    disabled={isSyncingCloud}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                    <span>Tarik data terbaru dari Cloud</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handlePushCloud}
                    disabled={isSyncingCloud || pelangganList.length === 0}
                  >
                    {isSyncingCloud && cloudProgress ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Mengunggah {cloudProgress.sent.toLocaleString('id-ID')} / {cloudProgress.total.toLocaleString('id-ID')}...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Kirim data perangkat ini ke Cloud</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Offline Manual Backup & Restore Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h4 className="text-[13.5px] font-semibold text-[#18181b] dark:text-zinc-100">
                      Unduh file cadangan (.json)
                    </h4>
                    <p className="text-[12px] text-[#71717a] leading-relaxed">
                      Unduh salinan arsip lokal ({pelangganList.length.toLocaleString('id-ID')} titik) untuk cadangan di flashdisk atau arsip internal.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      pdamService.exportDatabaseBackup();
                      toast.success('File backup database PDAM berhasil diunduh.');
                    }}
                    className="w-full"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download backup (.json)</span>
                  </Button>
                </div>

                <div className="p-4 rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h4 className="text-[13.5px] font-semibold text-[#18181b] dark:text-zinc-100">
                      Pulihkan dari file cadangan
                    </h4>
                    <p className="text-[12px] text-[#71717a] leading-relaxed">
                      Pilih file backup (.json) untuk memulihkan seluruh data dan snapshot jika perangkat sedang offline.
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
                      className="w-full"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Pilih file backup (.json) &amp; pulihkan</span>
                    </Button>
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
