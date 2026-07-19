import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileSearch } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md rounded-none border-border shadow-xl">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-6">
          <div className="w-20 h-20 bg-muted flex items-center justify-center rounded-full">
            <FileSearch className="w-10 h-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-3xl font-bold text-foreground">Halaman Tidak Ditemukan</h1>
            <p className="font-mono text-sm text-muted-foreground">Path yang Anda tuju tidak tersedia di sistem ini.</p>
          </div>
          <a href="/" className="inline-block mt-4 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-widest font-bold px-6 py-3">
            Kembali ke Beranda
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
