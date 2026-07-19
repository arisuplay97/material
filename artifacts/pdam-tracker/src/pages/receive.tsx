import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScanLine, CheckCircle2 } from 'lucide-react';
import { useReceiveTracking } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';

export default function Receive() {
  const [code, setCode] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const receiveMutation = useReceiveTracking();
  const { toast } = useToast();

  const handleReceive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    receiveMutation.mutate({
      data: { qrScannedCode: code }
    }, {
      onSuccess: () => {
        setIsSuccess(true);
        setCode('');
        setTimeout(() => setIsSuccess(false), 3000);
      },
      onError: (err: any) => {
        toast({
          variant: 'destructive',
          title: 'Gagal',
          description: err?.data?.error || 'Gagal menerima material'
        });
      }
    });
  };

  return (
    <div className="p-6 md:p-8 w-full max-w-[600px] mx-auto min-h-[80vh] flex flex-col justify-center">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-serif font-bold text-foreground">Penerimaan Cabang</h1>
        <p className="text-muted-foreground font-mono text-sm mt-2">Scan atau ketik kode QR dari gudang pusat.</p>
      </div>

      <Card className="rounded-none border-border shadow-xl relative overflow-hidden">
        {/* Decorative Top Border */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-blue-600"></div>

        <CardHeader className="text-center pt-8">
          <div className="mx-auto w-16 h-16 bg-blue-50 flex items-center justify-center rounded-full mb-4">
            <ScanLine className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="font-serif text-2xl">Input Kode Tracking</CardTitle>
          <CardDescription className="font-mono text-xs uppercase tracking-wider">Gunakan scanner QR atau input manual</CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-300">
              <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
              <h3 className="font-bold text-xl mb-2 text-green-700">Diterima!</h3>
              <p className="text-sm text-muted-foreground">Material berhasil dicatat di cabang.</p>
            </div>
          ) : (
            <form onSubmit={handleReceive} className="space-y-6">
              <div className="space-y-3 text-center">
                <Input 
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="TRK-XXX-YYY"
                  className="rounded-none border-0 border-b-2 border-border focus-visible:ring-0 focus-visible:border-blue-600 text-center font-mono text-2xl h-16 bg-muted/10 tracking-widest placeholder:opacity-30"
                  autoFocus
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-14 rounded-none font-bold uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!code || receiveMutation.isPending}
              >
                {receiveMutation.isPending ? 'Memproses...' : 'Konfirmasi Penerimaan'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
