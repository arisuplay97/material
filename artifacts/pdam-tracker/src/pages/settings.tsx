import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck, User as UserIcon } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="p-6 md:p-8 max-w-[800px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Pengaturan Akun</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">Informasi profil Anda.</p>
      </div>

      <Card className="rounded-none border-border shadow-sm">
        <CardHeader className="border-b border-border bg-muted/10 pb-4">
          <CardTitle className="font-serif text-xl flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-primary" /> Profil Saya
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            <div className="grid grid-cols-1 md:grid-cols-3 p-6 gap-4 items-center">
              <div className="text-muted-foreground font-mono text-sm uppercase tracking-wider">Nama Lengkap</div>
              <div className="md:col-span-2 font-bold text-lg">{user?.name}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 p-6 gap-4 items-center">
              <div className="text-muted-foreground font-mono text-sm uppercase tracking-wider">Alamat Email</div>
              <div className="md:col-span-2 font-mono">{user?.email}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 p-6 gap-4 items-center bg-primary/5">
              <div className="text-muted-foreground font-mono text-sm uppercase tracking-wider">Hak Akses (Role)</div>
              <div className="md:col-span-2 font-mono uppercase font-bold text-primary flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> {user?.role.replace('_', ' ')}
              </div>
            </div>
            {user?.branchName && (
              <div className="grid grid-cols-1 md:grid-cols-3 p-6 gap-4 items-center">
                <div className="text-muted-foreground font-mono text-sm uppercase tracking-wider">Cabang Penugasan</div>
                <div className="md:col-span-2">{user.branchName}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
