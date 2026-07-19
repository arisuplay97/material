import { useListUsers } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function Users() {
  const { data: users, isLoading } = useListUsers();

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Manajemen Pengguna</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">Daftar akses sistem PDAM Tiara Tracking.</p>
      </div>

      <Card className="rounded-none border-border shadow-sm">
        <CardHeader className="border-b border-border bg-muted/10 pb-4">
          <CardTitle className="font-serif text-xl">Daftar Pengguna</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b-2 border-border font-mono text-xs uppercase tracking-wider">
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Terdaftar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 font-mono">Memuat...</TableCell></TableRow>
              ) : users?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 font-mono">Tidak ada data pengguna.</TableCell></TableRow>
              ) : (
                users?.map((u) => (
                  <TableRow key={u.id} className="table-row-hover">
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-none font-mono text-[10px] uppercase border-border bg-muted">
                        {u.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.branchName || '-'}</TableCell>
                    <TableCell>
                      {u.isActive ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 rounded-none border-none font-mono text-[10px] uppercase">Aktif</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100 rounded-none border-none font-mono text-[10px] uppercase">Non-Aktif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {format(new Date(u.createdAt), 'dd MMM yyyy', { locale: id })}
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
