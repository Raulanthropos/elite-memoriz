
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Loader2, CheckCircle2, Image as ImageIcon } from 'lucide-react';

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

// Helper to construct full image URL
const getImageUrl = (path: string) => {
  if (path.startsWith('http')) return path;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/uploads/${path}`;
};

export const GuestEventPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Form State
  const [guestName, setGuestName] = useState('Guest');
  const [caption, setCaption] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Parallel fetch for speed
        const [eventRes, memoriesRes] = await Promise.all([
            fetch(`https://elite-memoriz-production.up.railway.app/api/events/${slug}`),
            fetch(`https://elite-memoriz-production.up.railway.app/api/events/${slug}/memories`)
        ]);

        if (!eventRes.ok) throw new Error('Event not found');
        
        const eventData = await eventRes.json();
        setEvent(eventData);

        if (memoriesRes.ok) {
            const memoriesData = await memoriesRes.json();
            setMemories(memoriesData);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setSuccess(false);

    const formData = new FormData();
    formData.append('photo', file);
    
    // Combine Name and Caption into one metadata string if desired, or send separately.
    // For now, based on previous backend logic which accepts 'memory' as text:
    const finalCaption = `${caption} - Uploaded by ${guestName}`.trim();
    formData.append('memory', finalCaption); 

    try {
      const res = await fetch(`https://elite-memoriz-production.up.railway.app/api/events/${slug}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      setSuccess(true);
      // Reset after 3 seconds
      setTimeout(() => {
          setSuccess(false);
          setCaption(''); // Clear caption but keep name
      }, 3000);

    } catch (err) {
      alert(`Upload failed: ${(err as Error).message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerCamera = () => {
      fileInputRef.current?.click();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>;
  }

  if (!event) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Event not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      {/* 1. Header */}
      <div className="bg-white shadow-sm p-6 text-center sticky top-0 z-20">
        <h1 className="text-2xl font-serif text-gray-900 mb-1">{event.title}</h1>
        <p className="text-sm text-gray-500">{new Date(event.date).toLocaleDateString()}</p>
        
        {event.welcomeMessage && (
            <div className="mt-3 p-3 bg-purple-50 rounded-lg text-purple-800 text-sm italic">
                "{event.welcomeMessage}"
            </div>
        )}
      </div>

      {/* 2. Upload Action Area */}
      <div className="p-6 flex flex-col items-center gap-4 bg-white border-b border-gray-100 shadow-sm mb-6">
        
        {/* Inputs */}
        <div className="w-full max-w-sm space-y-3">
            <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Your Name</label>
                <input 
                    type="text" 
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="e.g. Aunt Maria"
                />
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Memory / Caption</label>
                <textarea 
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
                    placeholder="Write a sweet messsage..."
                    rows={2}
                />
            </div>
        </div>

        {/* Hidden Input */}
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileSelect}
        />

        {/* Action Button */}
        <div className="mt-2">
            {!uploading && !success && (
            <button 
                onClick={triggerCamera}
                className="w-40 h-40 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 shadow-lg shadow-purple-200 flex flex-col items-center justify-center text-white active:scale-95 transition-transform"
            >
                <Camera className="w-10 h-10 mb-2" />
                <span className="font-bold text-lg">Share Photo</span>
            </button>
            )}

            {uploading && (
            <div className="w-40 h-40 rounded-full bg-white border-4 border-purple-100 flex flex-col items-center justify-center text-purple-600">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span className="font-medium text-sm">Uploading...</span>
            </div>
            )}

            {success && (
            <div className="w-40 h-40 rounded-full bg-green-50 border-4 border-green-100 flex flex-col items-center justify-center text-green-600 animate-in zoom-in duration-300">
                <CheckCircle2 className="w-10 h-10 mb-2" />
                <span className="font-bold text-sm">Sent!</span>
            </div>
            )}
        </div>
        <p className="text-xs text-gray-400 text-center max-w-xs">
            Tap above to take a photo or choose from gallery.
        </p>
      </div>

      {/* 3. Live Gallery */}
      <div className="px-4 max-w-4xl mx-auto">
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">
            <ImageIcon size={16} className="text-purple-600"/>
            Live Gallery
        </h3>
        
        {memories.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-400">No approved photos yet. Be the first!</p>
            </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {memories.map(memory => (
                    <div key={memory.id} className="relative aspect-[4/5] bg-gray-100 rounded-xl overflow-hidden shadow-sm">
                        <img 
                            src={getImageUrl(memory.storagePath)} 
                            alt="Memory" 
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                        {/* Gradient Overlay for Caption visibility if needed, or simple footer */}
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};
