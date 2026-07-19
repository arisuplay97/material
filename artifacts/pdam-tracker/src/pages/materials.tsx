import { useListMaterials } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function Materials() {
  const { data: materials, isLoading } = useListMaterials();

  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  });

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Data Master Material</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">Daftar referensi komponen dan material operasional PDAM.</p>
      </div>

      <Card className="rounded-none border-border shadow-sm">
        <CardHeader className="border-b border-border bg-muted/10 pb-4">
          <CardTitle className="font-serif text-xl">Katalog Material</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b-2 border-border font-mono text-xs uppercase tracking-wider">
                <TableHead>Kode</TableHead>
                <TableHead>Nama Material</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Stok Aktif</TableHead>
                <TableHead className="text-right">Harga Satuan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 font-mono">Memuat...</TableCell></TableRow>
              ) : materials?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 font-mono">Tidak ada data material.</TableCell></TableRow>
              ) : (
                materials?.map((mat) => (
                  <TableRow key={mat.id} className="table-row-hover">
                    <TableCell className="font-mono font-bold text-primary">{mat.code}</TableCell>
                    <TableCell className="font-medium">{mat.name}</TableCell>
                    <TableCell className="uppercase text-xs font-mono text-muted-foreground">{mat.category}</TableCell>
                    <TableCell className="text-right font-mono font-bold">{mat.currentStock} {mat.unit}</TableCell>
                    <TableCell className="text-right font-mono">{mat.unitPrice ? formatter.format(mat.unitPrice) : '-'}</TableCell>
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
