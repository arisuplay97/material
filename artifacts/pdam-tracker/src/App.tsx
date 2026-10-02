import React from 'react';
import { Route, Switch, Redirect, Router as WouterRouter } from 'wouter';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppLayout } from '@/components/layout/AppLayout';

// New PDAM Tirta Ardhia Rinjani GIS & Dashboard Pages
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import GisMap from '@/pages/gis-map';
import Settings from '@/pages/settings';
import NotFound from '@/pages/not-found';

function ProtectedRoute({ component: Component, ...rest }: any) {
  return (
    <Route {...rest}>
      {(params) => (
        <AppLayout>
          <Component params={params} />
        </AppLayout>
      )}
    </Route>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />

      {/* 3 Menu Utama Sesuai PRD Section 1 */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/gis" component={GisMap} />
      <ProtectedRoute path="/gis-map" component={GisMap} />
      <ProtectedRoute path="/settings" component={Settings} />

      {/* Redirect root to dashboard */}
      <Route path="/">
        {() => <Redirect to="/dashboard" />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, '') || ''}>
            <Router />
          </WouterRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
