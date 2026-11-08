import React from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'wouter';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
        {/* Collapsible Sidebar */}
        <Sidebar />

        {/* Main Content Area — isolated stacking context so internal GIS z-index never leaks above mobile sidebar */}
        <SidebarInset className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-background">
          <Navbar />
          <main className="flex-1 overflow-y-auto relative bg-background">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
