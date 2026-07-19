import { useGetFlaggedProofs, useReviewProof } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, MapPin, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function FlaggedProofs() {
  const { data: proofs, isLoading, refetch } = useGetFlaggedProofs({ reviewStatus: 'pending' });
  const reviewMutation = useReviewProof();
  const { toast } = useToast();
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const handleReview = (id: string, status: 'approved' | 'rejected') => {
    reviewMutation.mutate({
      data: { reviewStatus: status, notes }
    }, {
      onSuccess: () => {
        toast({ title: `Review Berhasil`, description: `Bukti telah di-${status === 'approved' ? 'setujui' : 'tolak'}` });
        setSelectedProof(null);
        setNotes('');
        refetch();
      },
      onError: (err: any) => {
         toast({ variant: 'destructive', title: 'Gagal', description: err?.data?.error || 'Kesalahan sistem' });
      }
    });
  };

  if (isLoading) return <div className="p-8 font-mono animate-pulse">Memuat antrean review...</div>;

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Review Bukti Flagged</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">Antrean verifikasi untuk bukti instalasi dengan anomali data geospasial.</p>
      </div>

      {proofs?.length === 0 ? (
        <Card className="rounded-none border-border shadow-none bg-muted/10">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
             <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
               <Check className="w-8 h-8 text-green-600" />
             </div>
             <h3 className="font-serif text-xl font-bold">Semua Bersih</h3>
             <p className="text-muted-foreground font-mono text-sm mt-2">Tidak ada bukti yang memerlukan tinjauan saat ini.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {proofs?.map((proof) => (
            <Card key={proof.id} className="rounded-none border-border shadow-sm border-t-4 border-t-amber-500 overflow-hidden flex flex-col">
              <CardHeader className="bg-amber-50/50 border-b border-border pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="font-mono text-lg font-bold text-primary">{proof.trackingCode}</CardTitle>
                    <p className="text-sm font-medium mt-1">{proof.materialName}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">{proof.branchName} • Oleh: {proof.submittedByName}</p>
                  </div>
                  <Badge variant="destructive" className="rounded-none font-mono text-[10px] uppercase">Pending</Badge>
                </div>
              </CardHeader>
              
              <CardContent className="p-0 flex-1 flex flex-col md:flex-row">
                <div className="w-full md:w-2/5 aspect-[3/4] md:aspect-auto bg-black relative">
                  <img src={proof.photoUrl || ''} alt="Bukti" className="w-full h-full object-cover" />
                </div>
                
                <div className="p-6 w-full md:w-3/5 space-y-6">
                  <div>
                    <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600" /> Alasan Flag
                    </h4>
                    <ul className="list-disc pl-4 space-y-1 text-sm font-medium text-amber-800 bg-amber-50 p-3 border border-amber-200">
                      {proof.flagReasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Metadata GPS</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-muted p-2 border border-border">
                        <span className="text-muted-foreground block mb-1">Koordinat</span>
                        {proof.gpsLat?.toFixed(4)}, {proof.gpsLng?.toFixed(4)}
                      </div>
                      <div className="bg-muted p-2 border border-border">
                         <span className="text-muted-foreground block mb-1">Akurasi</span>
                         <span className={proof.gpsAccuracyMeters && proof.gpsAccuracyMeters > 50 ? 'text-red-600 font-bold' : ''}>
                           {proof.gpsAccuracyMeters}m
                         </span>
                      </div>
                      <div className="bg-muted p-2 border border-border col-span-2">
                        <span className="text-muted-foreground block mb-1">Waktu Submit</span>
                        {format(new Date(proof.submittedAt), 'dd MMM yyyy HH:mm', { locale: id })}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="p-0 border-t border-border grid grid-cols-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="rounded-none h-14 border-0 border-r border-border text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setSelectedProof(proof.id)}>
                      <X className="w-4 h-4 mr-2" /> Tolak
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-none sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle className="font-serif">Tolak Bukti Instalasi</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                       <Input 
                         placeholder="Alasan penolakan..." 
                         value={notes} 
                         onChange={e => setNotes(e.target.value)} 
                         className="rounded-none border-border font-mono text-sm"
                       />
                    </div>
                    <Button 
                      onClick={() => handleReview(proof.id, 'rejected')} 
                      disabled={reviewMutation.isPending}
                      variant="destructive" 
                      className="rounded-none uppercase tracking-widest font-mono text-xs h-12"
                    >
                      Konfirmasi Tolak
                    </Button>
                  </DialogContent>
                </Dialog>
                
                <Button 
                  className="rounded-none h-14 border-0 bg-green-700 hover:bg-green-800 text-white"
                  onClick={() => handleReview(proof.id, 'approved')}
                  disabled={reviewMutation.isPending}
                >
                  <Check className="w-4 h-4 mr-2" /> Setujui (Abaikan Flag)
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
