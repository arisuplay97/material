import { useListMaterialRequests, useApproveMaterialRequest, useRejectMaterialRequest } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function MaterialRequests() {
  const { data: requests, isLoading, refetch } = useListMaterialRequests();
  const approveMutation = useApproveMaterialRequest();
  const rejectMutation = useRejectMaterialRequest();
  const { toast } = useToast();

  const handleAction = (reqId: string, action: 'approve' | 'reject') => {
    const mutation = action === 'approve' ? approveMutation : rejectMutation;
    mutation.mutate({ id: reqId, data: { notes: '' } }, {
      onSuccess: () => {
        toast({ title: 'Berhasil', description: `Request telah di-${action === 'approve' ? 'setujui' : 'tolak'}.` });
        refetch();
      },
      onError: (err: any) => {
        toast({ variant: 'destructive', title: 'Gagal', description: err?.data?.error || 'Terjadi kesalahan sistem' });
      }
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Permintaan Material</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">Kelola dan setujui request material untuk operasional cabang.</p>
      </div>

      <Card className="rounded-none border-border shadow-sm">
        <CardHeader className="border-b border-border bg-muted/10 pb-4">
          <CardTitle className="font-serif text-xl">Daftar Request</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b-2 border-border font-mono text-xs uppercase tracking-wider">
                <TableHead>No. Request</TableHead>
                <TableHead>Tgl Request</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Pemohon</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 font-mono">Memuat...</TableCell></TableRow>
              ) : requests?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 font-mono">Tidak ada request material.</TableCell></TableRow>
              ) : (
                requests?.map((req) => (
                  <TableRow key={req.id} className="table-row-hover">
                    <TableCell className="font-mono font-bold">{req.requestNumber}</TableCell>
                    <TableCell className="font-mono text-xs">{format(new Date(req.createdAt), 'dd MMM yyyy', { locale: id })}</TableCell>
                    <TableCell>
                      <div className="font-medium">{req.materialName}</div>
                      <div className="text-muted-foreground text-xs font-mono">{req.qtyRequested} {req.materialCode ? 'unit' : ''}</div>
                    </TableCell>
                    <TableCell>{req.requestedByName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`rounded-none font-mono text-[10px] uppercase border-transparent ${
                        req.status === 'approved' ? 'bg-green-100 text-green-800' : 
                        req.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {req.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-none border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleAction(req.id, 'reject')} disabled={rejectMutation.isPending}>
                            <X className="w-4 h-4" />
                          </Button>
                          <Button size="sm" className="h-8 w-8 p-0 rounded-none bg-green-700 hover:bg-green-800 text-white" onClick={() => handleAction(req.id, 'approve')} disabled={approveMutation.isPending}>
                            <Check className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
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
