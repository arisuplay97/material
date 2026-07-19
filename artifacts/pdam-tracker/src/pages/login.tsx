import { useAuth } from '@/contexts/AuthContext';
import { useLogin } from '@workspace/api-client-react';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [error, setError] = useState('');

  const loginMutation = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (data) => {
          login(data.accessToken, data.refreshToken, data.user);
          // Redirect based on role
          const role = data.user.role;
          if (role === 'petugas_lapangan') {
            setLocation('/lapangan');
          } else if (role === 'admin_gudang') {
            setLocation('/trackings');
          } else {
            setLocation('/dashboard');
          }
        },
        onError: (err) => {
          setError(err.data?.error || 'Gagal masuk. Periksa email dan kata sandi.');
        }
      }
    );
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col md:flex-row">
      {/* Left side - Branding */}
      <div className="hidden md:flex flex-col bg-primary text-primary-foreground p-12 justify-between w-1/3 max-w-[480px]">
        <div>
          <ShieldCheck className="h-12 w-12 mb-6" />
          <h1 className="text-4xl font-serif font-bold tracking-tight text-primary-foreground mb-4 leading-tight">
            Nerve Center untuk Akuntabilitas Infrastruktur.
          </h1>
          <p className="font-mono text-sm opacity-80 leading-relaxed max-w-sm">
            Setiap sambungan pipa dan gate valve yang keluar dari gudang tercatat dengan jejak digital. 
            Dari ruang penyimpanan hingga lokasi pemasangan.
          </p>
        </div>
        <div className="font-mono text-[10px] tracking-widest uppercase opacity-50">
          Sistem Verifikasi PDAM Tiara v2.0
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile branding header */}
          <div className="md:hidden flex items-center gap-2 mb-8 text-primary">
            <ShieldCheck className="h-8 w-8" />
            <div className="flex flex-col">
              <span className="font-serif font-bold text-xl leading-none">PDAM Tiara</span>
              <span className="font-mono text-[10px] uppercase tracking-widest">Tracking Sistem</span>
            </div>
          </div>

          <Card className="border-none shadow-none bg-transparent md:bg-card md:shadow-xl md:border-solid md:border-border rounded-none md:rounded-lg">
            <CardHeader className="px-0 md:px-6 pt-0 md:pt-6">
              <CardTitle className="font-serif text-3xl font-bold tracking-tight">Otorisasi Sistem</CardTitle>
              <CardDescription className="font-mono text-xs uppercase tracking-wider mt-2">
                Masukkan kredensial akses
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 md:px-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive" className="rounded-none border-l-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-mono text-xs font-bold uppercase">Surat Elektronik</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="nama@pdam.co.id" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="font-mono rounded-none border-b-2 border-t-0 border-x-0 border-border focus-visible:border-primary focus-visible:ring-0 px-0 bg-transparent h-12"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="font-mono text-xs font-bold uppercase">Kata Sandi</Label>
                  </div>
                  <div className="relative">
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      required 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="font-mono rounded-none border-b-2 border-t-0 border-x-0 border-border focus-visible:border-primary focus-visible:ring-0 px-0 bg-transparent h-12 pr-10"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full rounded-none font-bold tracking-widest uppercase h-14 mt-8" 
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? 'Memverifikasi...' : 'Akses Dashboard'}
                  {!loginMutation.isPending && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
