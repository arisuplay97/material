import { useGetMaterialAccountabilityReport } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState } from 'react';
import { format, subDays } from 'date-fns';
import { id } from 'date-fns/locale';
import { Download, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30).toISOString(),
    to: new Date().toISOString()
  });

  const { data: report, isLoading } = useGetMaterialAccountabilityReport({
    from: dateRange.from,
    to: dateRange.to
  });

  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  });

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Laporan Akuntabilitas</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Rekapitulasi nilai dan status material.</p>
        </div>
        <Button variant="outline" className="rounded-none border-border font-mono text-xs uppercase">
          <Download className="w-4 h-4 mr-2" /> Unduh CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-none border-border bg-muted/10 shadow-sm">
          <CardContent className="p-6">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Total Issue</p>
            <p className="font-serif text-3xl font-bold">{report?.totalIssued || 0} <span className="text-sm font-normal text-muted-foreground font-mono">item</span></p>
          </CardContent>
        </Card>
        <Card className="rounded-none border-border bg-muted/10 shadow-sm">
           <CardContent className="p-6">
             <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Nilai Issue</p>
             <p className="font-serif text-2xl font-bold text-primary">{formatter.format(report?.totalValueIssued || 0)}</p>
           </CardContent>
        </Card>
        <Card className="rounded-none border-border bg-green-50/50 shadow-sm">
           <CardContent className="p-6">
             <p className="font-mono text-xs uppercase tracking-widest text-green-700 mb-2">Nilai Terverifikasi</p>
             <p className="font-serif text-2xl font-bold text-green-700">{formatter.format(report?.totalValueVerified || 0)}</p>
           </CardContent>
        </Card>
        <Card className="rounded-none border-border bg-red-50/50 shadow-sm">
           <CardContent className="p-6">
             <p className="font-mono text-xs uppercase tracking-widest text-red-700 mb-2">Status Kritis</p>
             <p className="font-serif text-3xl font-bold text-red-700">{report?.totalKritis || 0} <span className="text-sm font-normal font-mono opacity-80">item</span></p>
           </CardContent>
        </Card>
      </div>

      <Card className="rounded-none border-border shadow-sm">
        <CardHeader className="border-b border-border bg-muted/10 pb-4">
          <CardTitle className="font-serif text-xl">Rincian Pergerakan Material</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b-2 border-border font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <TableHead>Kode Tracking</TableHead>
                <TableHead>No. WO</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead className="text-right">Qty Issue</TableHead>
                <TableHead className="text-right">Qty Pakai</TableHead>
                <TableHead className="text-right">Nilai Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 font-mono animate-pulse">Memuat laporan...</TableCell>
                </TableRow>
              ) : report?.rows.map((row, i) => (
                <TableRow key={i} className="font-mono text-xs table-row-hover">
                  <TableCell className="font-bold text-primary">{row.trackingCode}</TableCell>
                  <TableCell>{row.woNumber || '-'}</TableCell>
                  <TableCell className="font-sans font-medium">{row.materialName}</TableCell>
                  <TableCell>{row.branchName}</TableCell>
                  <TableCell className="text-right">{row.qtyIssued}</TableCell>
                  <TableCell className="text-right">{row.qtyUsed ?? '-'}</TableCell>
                  <TableCell className="text-right font-medium">{row.totalValue ? formatter.format(row.totalValue) : '-'}</TableCell>
                  <TableCell className="uppercase">{row.status.replace('_', ' ')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
