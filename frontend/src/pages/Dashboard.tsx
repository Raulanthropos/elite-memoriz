import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Event {
  id: number;
  title: string;
  slug: string;
  date: string;
  coverImage?: string;
}

const Dashboard = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        const res = await fetch('http://localhost:4000/api/host/events', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) throw new Error('Failed to fetch events');

        const data = await res.json();
        setEvents(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div className="p-8 bg-gray-950 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Guest Reflections</h1>
            <p className="mt-2 text-gray-400">View and manage your event albums</p>
          </div>
          <button 
            onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
            className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Sign Out
          </button>
        </div>

        {loading ? (
          <div className="text-white">Loading your memories...</div>
        ) : error ? (
          <div className="text-red-400">Error: {error}</div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 rounded-2xl border border-gray-800 border-dashed">
            <h3 className="text-xl font-medium text-white">No events yet</h3>
            <p className="mt-2 text-gray-400">Create your first event to start collecting memories.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div key={event.id} className="group relative bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
                <div className="aspect-video w-full bg-gray-800 overflow-hidden relative">
                  {event.coverImage ? (
                    <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 bg-gray-800">
                      <span className="text-sm font-medium uppercase tracking-wider">No Cover</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                </div>
                
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-medium text-indigo-400 mb-1 uppercase tracking-wide">
                        {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {event.title}
                      </h3>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700">
                       /{event.slug}
                     </span>
                     <button className="text-sm font-medium text-white hover:text-indigo-400 transition-colors">
                       View Album →
                     </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
