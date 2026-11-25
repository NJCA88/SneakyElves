import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load pages
const AuthPage = lazy(() => import('./pages/AuthPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Invite = lazy(() => import('./pages/Invite'));
const WishlistDetail = lazy(() => import('./pages/WishlistDetail'));
const About = lazy(() => import('./pages/About'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Settings = lazy(() => import('./pages/Settings'));

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/continue" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (!user || (!user.isAdmin && (!user.memberships || user.memberships.length === 0))) return <Navigate to="/" replace />;
  return children;
};

import { NotificationProvider } from './context/NotificationContext';

const Landing = lazy(() => import('./pages/Landing'));

const HomeRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  return user ? <Dashboard /> : <Landing />;
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  <Route path="/continue" element={<AuthPage />} />
                  {/* Old links (invites, bookmarks) still work */}
                  <Route path="/login" element={<AuthPage />} />
                  <Route path="/signup" element={<AuthPage initialMode="signup" />} />

                  {/* Root Route logic handled by HomeRoute */}
                  <Route path="/" element={<HomeRoute />} />
                  <Route path="/invite" element={
                    <ProtectedRoute>
                      <Invite />
                    </ProtectedRoute>
                  } />
                  <Route path="/about" element={
                    <ProtectedRoute>
                      <About />
                    </ProtectedRoute>
                  } />
                  <Route path="/wishlists/:id" element={<WishlistDetail />} />
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin" element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  } />
                </Routes>
              </Suspense>
            </div>
          </div>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
