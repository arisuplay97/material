import { useListTrackings, Tracking } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import TrackingTimeline from '@/components/TrackingTimeline';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string, colorClass: string }> = {
    dikirim: { label: 'Dikirim', colorClass: 'bg-slate-200 text-slate-800' },
    diterima_cabang: { label: 'Diterima Cabang', colorClass: 'bg-blue-100 text-blue-800' },
    menunggu_verifikasi: { label: 'Menunggu Verif', colorClass: 'border-amber-500 text-amber-700 bg-amber-50' },
    terverifikasi: { label: 'Terverifikasi', colorClass: 'bg-green-700 text-white' },
    kritis: { label: 'Kritis', colorClass: 'bg-red-700 text-white' }
  };
  
  const config = map[status] || { label: status, colorClass: 'bg-gray-100 text-gray-800' };
  
  return (
    <Badge variant="outline" className={`font-mono text-[10px] rounded-none px-2 py-0.5 border-transparent uppercase tracking-wider ${config.colorClass}`}>
      {config.label}
    </Badge>
  );
}

export default function Trackings() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [, setLocation] = useLocation();

  const queryParams: any = { limit: 50 };
  if (statusFilter !== 'all') queryParams.status = statusFilter;
  
  // Note: API doesn't support direct code search in list endpoint out of the box in the schema, 
  // but we can filter locally or rely on trackingCode search if implemented. 
  // Let's rely on the list and filter locally for simplicity in this demo if needed, 
  // or assume the API might take it. We will fetch and then local filter for robustness.

  const { data: response, isLoading } = useListTrackings({
    status: statusFilter !== 'all' ? statusFilter : undefined
  });

  const trackings = response?.data || [];
  const filteredTrackings = search 
    ? trackings.filter(t => t.trackingCode.toLowerCase().includes(search.toLowerCase()) || t.materialName?.toLowerCase().includes(search.toLowerCase()))
    : trackings;

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Tracking Material</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Lacak pergerakan material dari gudang hingga terpasang.</p>
        </div>
        <Button onClick={() => setLocation('/trackings/new')} className="rounded-none font-bold uppercase tracking-wider font-mono text-xs h-10">
          <Plus className="mr-2 h-4 w-4" /> Issue Material
        </Button>
      </div>

      <Card className="rounded-none border-border shadow-sm">
        <CardHeader className="border-b border-border bg-muted/10 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari kode atau nama material..." 
                className="pl-9 rounded-none border-border focus-visible:ring-0 focus-visible:border-primary font-mono text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-[200px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="rounded-none font-mono text-sm focus:ring-0 border-border">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="dikirim">Dikirim</SelectItem>
                  <SelectItem value="diterima_cabang">Diterima Cabang</SelectItem>
                  <SelectItem value="menunggu_verifikasi">Menunggu Verifikasi</SelectItem>
                  <SelectItem value="terverifikasi">Terverifikasi</SelectItem>
                  <SelectItem value="kritis">Kritis</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Accordion type="single" collapsible className="w-full">
            {isLoading ? (
              <div className="p-8 text-center font-mono text-muted-foreground animate-pulse">Memuat data...</div>
            ) : filteredTrackings.length === 0 ? (
              <div className="p-8 text-center font-mono text-muted-foreground">Data tidak ditemukan</div>
            ) : (
              <div className="divide-y divide-border">
                {/* Header row for alignment */}
                <div className="hidden md:grid grid-cols-12 gap-4 p-4 font-mono text-xs uppercase font-bold text-muted-foreground bg-muted/20 border-b border-border">
                  <div className="col-span-2">Kode</div>
                  <div className="col-span-3">Material</div>
                  <div className="col-span-2">Cabang</div>
                  <div className="col-span-2">Tgl Keluar</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1 text-right">Detail</div>
                </div>

                {filteredTrackings.map((tracking) => (
                  <AccordionItem value={tracking.id} key={tracking.id} className="border-none">
                    <AccordionTrigger className="hover:no-underline hover:bg-muted/10 px-4 py-3 data-[state=open]:bg-primary/5 transition-colors">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 w-full text-left items-center">
                        <div className="col-span-2 font-mono font-bold text-primary">
                          {tracking.trackingCode}
                        </div>
                        <div className="col-span-3 font-medium truncate">
                          {tracking.materialName} <span className="text-muted-foreground font-normal ml-1">x{tracking.qtyIssued}</span>
                        </div>
                        <div className="col-span-2 text-sm text-muted-foreground">
                          {tracking.branchName || '-'}
                        </div>
                        <div className="col-span-2 font-mono text-xs text-muted-foreground">
                          {format(new Date(tracking.issuedAt), 'dd MMM yyyy', { locale: id })}
                        </div>
                        <div className="col-span-2">
                          <StatusBadge status={tracking.status} />
                        </div>
                        <div className="col-span-1 text-right text-muted-foreground md:pr-4">
                          <Link href={`/trackings/${tracking.id}`} className="text-primary font-mono text-xs hover:underline" onClick={(e) => e.stopPropagation()}>
                            Buka
                          </Link>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="border-t border-border bg-muted/5 p-6">
                      {/* Lazy load timeline when opened */}
                      <TrackingTimeline trackingId={tracking.id} />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </div>
            )}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
