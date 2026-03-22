import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CryptoProvider, useCrypto } from './context/CryptoContext';
import { Toaster } from '@/components/ui/sonner';

const Landing = lazy(() => import('./pages/Landing'));
const SignUp = lazy(() => import('./pages/SignUp'));
const LogIn = lazy(() => import('./pages/LogIn'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isCryptoReady, token } = useCrypto();
  if (!token || !isCryptoReady) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isCryptoReady, token } = useCrypto();
  if (token && isCryptoReady) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <Routes>
        <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><LogIn /></PublicRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <CryptoProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster theme="dark" />
      </BrowserRouter>
    </CryptoProvider>
  );
}

export default App;
