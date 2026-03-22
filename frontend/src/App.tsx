import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CryptoProvider, useCrypto } from './context/CryptoContext';
import Landing from './pages/Landing';
import SignUp from './pages/SignUp';
import LogIn from './pages/LogIn';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import { Toaster } from '@/components/ui/sonner';

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
    <Routes>
      <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><LogIn /></PublicRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
