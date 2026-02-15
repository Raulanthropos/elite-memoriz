
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Image as ImageIcon, Loader2, CheckCircle2 } from 'lucide-react';

interface EventDetails {
  id: number;
  title: string;
  date: string;
  coverImage: string | null;
  welcomeMessage: string | null;
}

interface Memory {
  id: number;
  type: string;
  storagePath: string;
  aiStory: string | null;
  isApproved: boolean;
}

export const GuestEventPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://lwtaufsmduksbxyuqure.supabase.co';

  useEffect(() => {
    // Fetch Event Details
    const fetchEvent = async () => {
      try {
        const res = await fetch(`http://localhost:4000/api/events/${slug}`);
        if (!res.ok) throw new Error('Event not found');
        const data = await res.json();
        setEvent(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [slug]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setSuccess(false);

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('memory', ''); // Optional caption, empty for now as per minimal UI

    try {
      const res = await fetch(`http://localhost:4000/api/events/${slug}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      setSuccess(true);
      // Reset after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert(`Upload failed: ${(err as Error).message}`);
    } finally {
      setUploading(false);
      // Clear input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>;
  }

  if (!event) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Event not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm p-6 text-center">
        <h1 className="text-2xl font-serif text-gray-900 mb-1">{event.title}</h1>
        <p className="text-sm text-gray-500">{new Date(event.date).toLocaleDateString()}</p>
        {event.welcomeMessage && <p className="mt-2 text-gray-600 italic">"{event.welcomeMessage}"</p>}
      </div>

      {/* Main Action Area */}
      <div className="p-6 flex flex-col items-center">
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" // Hints mobile to use camera
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileSelect}
        />

        {!uploading && !success && (
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-48 h-48 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-xl flex flex-col items-center justify-center text-white active:scale-95 transition-transform"
          >
            <Camera className="w-12 h-12 mb-2" />
            <span className="font-medium text-lg">Share Memory</span>
          </button>
        )}

        {uploading && (
          <div className="w-48 h-48 rounded-full bg-white shadow-inner flex flex-col items-center justify-center text-purple-600 border-4 border-purple-100">
            <Loader2 className="w-10 h-10 animate-spin mb-2" />
            <span className="font-medium">Uploading...</span>
          </div>
        )}

        {success && (
          <div className="w-48 h-48 rounded-full bg-green-50 shadow-inner flex flex-col items-center justify-center text-green-600 border-4 border-green-100 animate-in fade-in zoom-in duration-300">
            <CheckCircle2 className="w-12 h-12 mb-2" />
            <span className="font-medium text-center px-4 leading-tight">Sent for approval!</span>
          </div>
        )}
      </div>

      {/* Approved Gallery Preview (Placeholder for now) */}
      <div className="px-6 mt-8">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4 text-center">Live Gallery</h3>
        <div className="grid grid-cols-2 gap-3">
            {/* We could fetch approved memories here, but let's keep it simple for MVP start */}
            <div className="aspect-[4/5] bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="aspect-[4/5] bg-gray-200 rounded-lg animate-pulse delay-75"></div>
            <div className="aspect-[4/5] bg-gray-200 rounded-lg animate-pulse delay-150"></div>
            <div className="aspect-[4/5] bg-gray-200 rounded-lg animate-pulse delay-200"></div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">Approved photos appear here automatically.</p>
      </div>
    </div>
  );
};
