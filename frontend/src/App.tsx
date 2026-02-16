import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateEvent from './pages/CreateEvent';
import EventDetails from './pages/EventDetailsPage';
import { GuestEventPage } from './pages/GuestEventPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { supabase } from './lib/supabase';
import './index.css'; // Explicit import to ensure Tailwind loads

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
    return <div className="flex justify-center items-center h-screen bg-gray-900 text-white">Loading...</div>;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-white font-sans antialiased">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Guest Route */}
          <Route path="/e/:slug" element={<GuestEventPage />} />

          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/create-event" 
            element={
              <ProtectedRoute>
                <CreateEvent />
              </ProtectedRoute>
            } 
          />
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
      </div>
    </Router>
  );
}

export default App;
