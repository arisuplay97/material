import { useListBranches } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function Branches() {
  const { data: branches, isLoading } = useListBranches();

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Data Cabang</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">Daftar wilayah pelayanan dan infrastruktur.</p>
      </div>

      <Card className="rounded-none border-border shadow-sm">
        <CardHeader className="border-b border-border bg-muted/10 pb-4">
          <CardTitle className="font-serif text-xl">Daftar Cabang</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b-2 border-border font-mono text-xs uppercase tracking-wider">
                <TableHead>Kode</TableHead>
                <TableHead>Nama Cabang</TableHead>
                <TableHead className="text-right">Track Aktif</TableHead>
                <TableHead className="text-right">Isu Kritis</TableHead>
                <TableHead className="text-right">Didaftarkan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 font-mono">Memuat...</TableCell></TableRow>
              ) : branches?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 font-mono">Tidak ada data cabang.</TableCell></TableRow>
              ) : (
                branches?.map((branch) => (
                  <TableRow key={branch.id} className="table-row-hover">
                    <TableCell className="font-mono font-bold text-primary">{branch.code}</TableCell>
                    <TableCell className="font-medium">{branch.name}</TableCell>
                    <TableCell className="text-right font-mono">{branch.activeTrackings || 0}</TableCell>
                    <TableCell className="text-right font-mono text-red-600 font-bold">{branch.criticalCount || 0}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {format(new Date(branch.createdAt), 'dd MMM yyyy', { locale: id })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
