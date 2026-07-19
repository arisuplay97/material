import { useListMaterialRequests, useCreateTracking } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Printer, Box } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';

export default function TrackingNew() {
  const { data: requests, isLoading } = useListMaterialRequests({ status: 'approved' });
  const [selectedRequest, setSelectedRequest] = useState<string>('');
  const [qtyIssued, setQtyIssued] = useState<string>('');
  const [slaDays, setSlaDays] = useState<string>('3');
  const [qrResult, setQrResult] = useState<{ url: string, code: string } | null>(null);

  const createMutation = useCreateTracking();
  const { toast } = useToast();

  const handleIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !qtyIssued || !slaDays) return;

    createMutation.mutate({
      data: {
        materialRequestId: selectedRequest,
        qtyIssued: parseInt(qtyIssued),
        slaDays: parseInt(slaDays)
      }
    }, {
      onSuccess: (data) => {
        toast({
          title: 'Tracking Dibuat',
          description: `Material berhasil dikeluarkan dengan kode ${data.trackingCode}`,
        });
        setQrResult({ url: data.qrCodeUrl || '', code: data.trackingCode });
      },
      onError: (err: any) => {
        toast({
          variant: 'destructive',
          title: 'Gagal',
          description: err?.data?.error || 'Terjadi kesalahan saat mengeluarkan material',
        });
      }
    });
  };

  const reqObj = requests?.find(r => r.id === selectedRequest);

  if (qrResult) {
    return (
      <div className="p-6 md:p-8 max-w-[800px] mx-auto space-y-6">
        <div className="flex flex-col items-center justify-center py-12">
          <Card className="w-full max-w-md rounded-none border-border shadow-xl border-t-8 border-t-primary">
            <CardHeader className="text-center pb-2">
              <CardTitle className="font-serif text-2xl font-bold">Material Dikeluarkan</CardTitle>
              <CardDescription className="font-mono text-xs uppercase tracking-wider">Silakan tempel QR Code pada material</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center p-8 space-y-6">
              <div className="bg-white p-4 border-2 border-primary">
                {/* Fallback to text if no QR image */}
                {qrResult.url ? (
                  <img src={qrResult.url} alt="QR Code" className="w-48 h-48" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-gray-100 border border-dashed border-gray-300">
                    <span className="font-mono text-sm text-gray-500 text-center">QR Code<br/>Placeholder</span>
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="font-mono text-xs text-muted-foreground uppercase mb-1">Tracking Code</p>
                <p className="font-mono text-2xl font-bold text-primary tracking-widest">{qrResult.code}</p>
              </div>
              <div className="w-full bg-muted/30 p-4 border border-border text-sm grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Material</span>
                <span className="font-bold text-right truncate">{reqObj?.materialName}</span>
                <span className="text-muted-foreground">Jumlah</span>
                <span className="font-bold text-right">{qtyIssued}</span>
                <span className="text-muted-foreground">SLA</span>
                <span className="font-bold text-right text-amber-700">{slaDays} Hari</span>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 p-6 pt-0">
              <Button className="w-full rounded-none font-bold uppercase tracking-widest h-12" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" /> Cetak Label QR
              </Button>
              <Button variant="outline" className="w-full rounded-none" onClick={() => {
                setQrResult(null);
                setSelectedRequest('');
                setQtyIssued('');
              }}>
                Keluarkan Material Lain
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-[800px] mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="rounded-none border-border">
          <Link href="/trackings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground tracking-tight">Keluarkan Material</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Pilih request yang disetujui untuk di-issue.</p>
        </div>
      </div>

      <Card className="rounded-none border-border shadow-sm">
        <CardHeader className="border-b border-border bg-muted/10 pb-4">
          <CardTitle className="font-serif text-xl flex items-center gap-2">
            <Box className="w-5 h-5 text-primary" /> Formulir Issue
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleIssue} className="space-y-8">
            <div className="space-y-3">
              <Label className="font-mono text-xs font-bold uppercase tracking-wider">Pilih Material Request (Disetujui)</Label>
              <Select value={selectedRequest} onValueChange={(val) => {
                setSelectedRequest(val);
                const req = requests?.find(r => r.id === val);
                if (req) setQtyIssued(req.qtyRequested.toString());
              }}>
                <SelectTrigger className="rounded-none border-border h-12 focus:ring-0 focus:border-primary">
                  <SelectValue placeholder="Pilih request..." />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  {isLoading ? (
                    <SelectItem value="loading" disabled>Memuat...</SelectItem>
                  ) : requests?.length === 0 ? (
                    <SelectItem value="empty" disabled>Tidak ada request pending</SelectItem>
                  ) : (
                    requests?.map(req => (
                      <SelectItem key={req.id} value={req.id}>
                        {req.requestNumber} — {req.materialName} ({req.qtyRequested} unit)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedRequest && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/10 p-6 border border-border">
                <div className="space-y-3">
                  <Label className="font-mono text-xs font-bold uppercase tracking-wider">Jumlah Dikeluarkan</Label>
                  <Input 
                    type="number" 
                    required 
                    min="1"
                    max={reqObj?.qtyRequested}
                    value={qtyIssued}
                    onChange={(e) => setQtyIssued(e.target.value)}
                    className="rounded-none border-border h-12 focus-visible:ring-0 focus-visible:border-primary font-mono text-lg"
                  />
                  <p className="text-xs text-muted-foreground">Maks: {reqObj?.qtyRequested}</p>
                </div>
                
                <div className="space-y-3">
                  <Label className="font-mono text-xs font-bold uppercase tracking-wider">SLA (Hari)</Label>
                  <Select value={slaDays} onValueChange={setSlaDays}>
                    <SelectTrigger className="rounded-none border-border h-12 focus:ring-0 focus:border-primary font-mono text-lg text-amber-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-none">
                      <SelectItem value="1">1 Hari (Mendesak)</SelectItem>
                      <SelectItem value="3">3 Hari (Normal)</SelectItem>
                      <SelectItem value="7">7 Hari (Proyek Besar)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Batas waktu terpasang</p>
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-14 rounded-none font-bold uppercase tracking-widest text-sm"
              disabled={!selectedRequest || createMutation.isPending}
            >
              {createMutation.isPending ? 'Memproses...' : 'Generate Tracking QR'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
