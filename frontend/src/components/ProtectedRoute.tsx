
import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthenticated(!!session);
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-screen bg-gray-900 text-white">Loading...</div>;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
