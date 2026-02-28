import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ViewerLayout } from './viewer/ViewerLayout';
import { HomePage } from './viewer/HomePage';
import { SeriesLandingPage } from './viewer/SeriesLandingPage';
import { ComicViewerPage } from './viewer/ComicViewerPage';
import { AdminLayout } from './admin/AdminLayout';
import { AdminDashboard } from './admin/AdminDashboard';
import { SeriesManager } from './admin/SeriesManager';
import { PageManager } from './admin/PageManager';
import { LoginPage } from './admin/LoginPage';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Toaster } from '@/components/ui/sonner';

// Protected route component for admin
const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Viewer Routes */}
          <Route path="/" element={<ViewerLayout />}>
            <Route index element={<HomePage />} />
            <Route path="series/:seriesId" element={<SeriesLandingPage />} />
            <Route path="comic/:seriesId/:pageNumber" element={<ComicViewerPage />} />
          </Route>
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute>
                <AdminLayout />
              </ProtectedAdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="series" element={<SeriesManager />} />
            <Route path="pages" element={<PageManager />} />
          </Route>
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
