import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { supabase } from './lib/supabase';
import './index.css';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CreateEvent = lazy(() => import('./pages/CreateEvent'));
const PaymentPlaceholder = lazy(() => import('./pages/PaymentPlaceholder'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PaymentCancel = lazy(() => import('./pages/PaymentCancel'));
const EventDetails = lazy(() => import('./pages/EventDetailsPage'));
const ExitPage = lazy(() => import('./pages/ExitPage'));
const GuestEventPage = lazy(() =>
  import('./pages/GuestEventPage').then((module) => ({ default: module.GuestEventPage }))
);

const RouteFallback = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-gray-900">
    <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
    <p className="font-medium tracking-wide text-gray-500">Loading Elite Memoriz...</p>
  </div>
);

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      await supabase.auth.getSession();
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) {
    return <RouteFallback />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans antialiased text-gray-900">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/payment"
              element={
                <ProtectedRoute>
                  <PaymentPlaceholder />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment/success"
              element={
                <ProtectedRoute>
                  <PaymentSuccess />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment/cancel"
              element={
                <ProtectedRoute>
                  <PaymentCancel />
                </ProtectedRoute>
              }
            />
            <Route path="/e/:slug" element={<GuestEventPage />} />
            <Route path="/exit" element={<ExitPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/create-event" element={<CreateEvent />} />
            <Route
              path="/dashboard/event/:id"
              element={
                <ProtectedRoute>
                  <EventDetails />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
