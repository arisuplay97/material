import { useGetDashboardSummary, useGetBranchStatus, useGetSlaOverview, useGetRecentActivity } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, CheckCircle2, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Link } from 'wouter';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string, variant: 'default'|'secondary'|'destructive'|'outline', colorClass: string }> = {
    dikirim: { label: 'Dikirim', variant: 'secondary', colorClass: 'bg-slate-200 text-slate-800' },
    diterima_cabang: { label: 'Diterima Cabang', variant: 'secondary', colorClass: 'bg-blue-100 text-blue-800' },
    menunggu_verifikasi: { label: 'Menunggu Verif', variant: 'outline', colorClass: 'border-amber-500 text-amber-700 bg-amber-50' },
    terverifikasi: { label: 'Terverifikasi', variant: 'default', colorClass: 'bg-green-700 text-white' },
    kritis: { label: 'Kritis', variant: 'destructive', colorClass: 'bg-red-700 text-white' }
  };
  
  const config = map[status] || { label: status, variant: 'outline', colorClass: '' };
  
  return (
    <Badge variant="outline" className={`font-mono text-[10px] rounded-none px-2 py-0.5 border-transparent uppercase tracking-wider ${config.colorClass}`}>
      {config.label}
    </Badge>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: branches, isLoading: isLoadingBranches } = useGetBranchStatus();
  const { data: sla, isLoading: isLoadingSla } = useGetSlaOverview();
  const { data: activities, isLoading: isLoadingActivity } = useGetRecentActivity({ limit: 10 });

  if (isLoadingSummary || isLoadingBranches || isLoadingSla) {
    return <div className="p-8 font-mono animate-pulse">Memuat data operasional...</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Overview Operasional</h1>
        <p className="text-muted-foreground font-mono text-sm mt-2">Ringkasan status tracking material dan verifikasi harian.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-none border-b-4 border-b-primary bg-card/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-sm font-mono text-muted-foreground uppercase tracking-widest">Total Aktif</p>
                <p className="text-4xl font-serif font-bold">{summary?.totalActive || 0}</p>
              </div>
              <TrendingUp className="h-5 w-5 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-none border-b-4 border-b-amber-500 bg-card/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-sm font-mono text-muted-foreground uppercase tracking-widest">Menunggu Verif</p>
                <p className="text-4xl font-serif font-bold text-amber-700">{summary?.totalMenungguVerifikasi || 0}</p>
              </div>
              <Clock className="h-5 w-5 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border-b-4 border-b-red-600 bg-card/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-sm font-mono text-muted-foreground uppercase tracking-widest">Kritis / Overdue</p>
                <p className="text-4xl font-serif font-bold text-red-700">{(summary?.totalKritis || 0) + (summary?.totalOverdue || 0)}</p>
              </div>
              <AlertCircle className="h-5 w-5 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border-b-4 border-b-green-600 bg-card/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-sm font-mono text-muted-foreground uppercase tracking-widest">Terverifikasi</p>
                <p className="text-4xl font-serif font-bold text-green-700">{summary?.totalTerverifikasi || 0}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-none shadow-sm border-border">
            <CardHeader className="border-b border-border bg-muted/20 pb-4">
              <CardTitle className="font-serif text-xl flex items-center justify-between">
                <span>Status Cabang</span>
                <Link href="/branches" className="text-sm font-mono font-normal text-primary hover:underline flex items-center gap-1">
                  Lihat Semua <ArrowRight className="h-3 w-3" />
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b-2 border-border font-mono text-xs uppercase">
                    <TableHead className="w-[30%]">Cabang</TableHead>
                    <TableHead className="text-right">Aktif</TableHead>
                    <TableHead className="text-right">Kritis</TableHead>
                    <TableHead className="text-right">Risk Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches?.map((branch) => (
                    <TableRow key={branch.branchId} className="table-row-hover">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{branch.branchName}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">{branch.branchCode}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{branch.active}</TableCell>
                      <TableCell className="text-right font-mono">
                        {branch.kritis > 0 ? (
                          <span className="text-red-600 font-bold flex items-center justify-end gap-1">
                            {branch.kritis} <AlertTriangle className="h-3 w-3" />
                          </span>
                        ) : '0'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <Badge variant="outline" className={`rounded-none px-2 font-mono ${branch.riskScore > 75 ? 'border-red-500 text-red-700 bg-red-50' : branch.riskScore > 40 ? 'border-amber-500 text-amber-700 bg-amber-50' : 'border-green-500 text-green-700 bg-green-50'}`}>
                          {branch.riskScore.toFixed(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!branches || branches.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground font-mono text-sm">
                        Tidak ada data cabang
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-none shadow-sm border-border">
            <CardHeader className="border-b border-border bg-muted/20 pb-4">
              <CardTitle className="font-serif text-xl flex items-center justify-between">
                <span>SLA Nearing Deadline</span>
                <Badge variant="outline" className="rounded-none font-mono bg-amber-50 text-amber-700 border-amber-200">
                  {sla?.warningCount || 0} Perhatian
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b-2 border-border font-mono text-xs uppercase">
                    <TableHead>Kode</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Sisa Waktu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sla?.nearingDeadline?.map((track) => (
                    <TableRow key={track.id} className="table-row-hover">
                      <TableCell className="font-mono text-xs">
                        <Link href={`/trackings/${track.id}`} className="hover:underline text-primary font-bold">
                          {track.trackingCode}
                        </Link>
                      </TableCell>
                      <TableCell className="truncate max-w-[200px]">{track.materialName}</TableCell>
                      <TableCell><StatusBadge status={track.status} /></TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {track.hoursRemaining !== null && track.hoursRemaining !== undefined ? (
                          <span className={`pulse-amber font-bold inline-block px-2 py-0.5 ${track.hoursRemaining < 24 ? 'text-amber-700 bg-amber-50' : ''}`}>
                            {Math.floor(track.hoursRemaining)}j {(track.hoursRemaining % 1 * 60).toFixed(0)}m
                          </span>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!sla?.nearingDeadline || sla.nearingDeadline.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground font-mono text-sm">
                        Tidak ada antrean SLA mendesak
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="rounded-none shadow-sm border-border h-full">
            <CardHeader className="border-b border-border bg-muted/20 pb-4">
              <CardTitle className="font-serif text-xl">Aktivitas Terkini</CardTitle>
              <CardDescription className="font-mono text-xs">Live feed pergerakan material</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div className="flex flex-col divide-y divide-border">
                  {activities?.map((act) => (
                    <div key={act.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <Link href={`/trackings/${act.trackingCode}`} className="font-mono text-xs font-bold text-primary hover:underline">
                          {act.trackingCode}
                        </Link>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {format(new Date(act.occurredAt), 'dd MMM HH:mm', { locale: id })}
                        </span>
                      </div>
                      <p className="text-sm font-medium leading-snug">{act.description}</p>
                      <div className="flex justify-between items-end mt-2">
                        <span className="text-xs text-muted-foreground truncate max-w-[70%]">{act.materialName}</span>
                        <span className="text-[10px] font-mono uppercase bg-secondary px-1.5 py-0.5">{act.actorName}</span>
                      </div>
                    </div>
                  ))}
                  {(!activities || activities.length === 0) && (
                    <div className="p-8 text-center text-muted-foreground font-mono text-sm">
                      Belum ada aktivitas
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
