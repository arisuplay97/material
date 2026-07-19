import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';

// Pages
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import NotFound from '@/pages/not-found';
import Trackings from '@/pages/trackings';
import TrackingNew from '@/pages/trackings-new';
import TrackingDetail from '@/pages/tracking-detail';
import Receive from '@/pages/receive';
import Lapangan from '@/pages/lapangan';
import LapanganUpload from '@/pages/lapangan-upload';
import FlaggedProofs from '@/pages/flagged-proofs';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

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
      
      {/* Protected Routes */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/trackings" component={Trackings} />
      <ProtectedRoute path="/trackings/new" component={TrackingNew} />
      <ProtectedRoute path="/trackings/:id" component={TrackingDetail} />
      <ProtectedRoute path="/receive" component={Receive} />
      <ProtectedRoute path="/lapangan" component={Lapangan} />
      <ProtectedRoute path="/lapangan/upload/:id" component={LapanganUpload} />
      <ProtectedRoute path="/spi/flagged" component={FlaggedProofs} />
      
      {/* Defaults/Fallbacks */}
      <Route path="/">
        {() => {
          // Redirect to login, auth context handles redirection based on auth state
          window.location.replace('/login');
          return null;
        }}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
