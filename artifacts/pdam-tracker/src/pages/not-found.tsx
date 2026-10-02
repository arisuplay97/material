import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileSearch, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-md rounded-2xl border-border shadow-xl bg-card">
        <CardContent className="flex flex-col items-center justify-center p-8 md:p-12 text-center space-y-5">
          <div className="w-16 h-16 bg-muted/60 flex items-center justify-center rounded-2xl text-muted-foreground">
            <FileSearch className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-1.5">
            <h1 className="font-heading text-2xl font-bold text-foreground">Halaman Tidak Ditemukan</h1>
            <p className="text-xs text-muted-foreground">Path yang Anda tuju tidak tersedia pada modul GIS & Dashboard PDAM.</p>
          </div>
          <Button asChild className="rounded-xl text-xs font-semibold gap-2 mt-2">
            <Link href="/dashboard">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Dashboard</span>
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
