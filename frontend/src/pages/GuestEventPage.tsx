import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Loader2, CheckCircle2, Image as ImageIcon, Send, X } from 'lucide-react';
import { getEventCoverUrl, getImageUrl } from '../utils/image';

// FIX: Interface matches Drizzle schema (CamelCase) & includes category for the cover logic
interface EventDetails {
  id: number;
  title: string;
  date: string;
  coverImage: string | null;
  category: string; 
  welcomeMessage: string | null;
}

interface Memory {
  id: string; 
  type: 'photo' | 'video' | 'story';
  storagePath: string; // FIX: Ensure this matches your API response (camelCase)
  originalText?: string;
  aiStory?: string; 
  isApproved: boolean; 
  createdAt: string; 
}

export const GuestEventPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Form State
  const [guestName, setGuestName] = useState('Guest');
  const [caption, setCaption] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Event & Memories in parallel
        // NOTE: Ensure these URLs match your actual backend (localhost vs railway)
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create Preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setSelectedFile(file);
    setSuccess(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);

    const formData = new FormData();
    formData.append('photo', selectedFile);
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
      
    } catch (err) {
      alert(`Upload failed: ${(err as Error).message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerPicker = () => {
      fileInputRef.current?.click();
  };

  const cancelPreview = () => {
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>;
  }

  if (!event) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Event not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-gray-900">
      {/* 1. Header with Intelligent Cover */}
      <div className="relative h-64 bg-gray-200">
          <img 
            src={getEventCoverUrl(event.coverImage, event.category)} 
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-4 text-center backdrop-blur-[2px]">
            <h1 className="text-3xl font-serif font-bold mb-2 shadow-sm">{event.title}</h1>
            <p className="text-sm opacity-90 uppercase tracking-widest">{new Date(event.date).toLocaleDateString()}</p>
            
            {event.welcomeMessage && (
                <div className="mt-3 px-4 py-2 bg-white/20 rounded-full text-xs backdrop-blur-md">
                    "{event.welcomeMessage}"
                </div>
            )}
          </div>
      </div>

      {/* 2. Main Action Area */}
      <div className="p-6 flex flex-col items-center gap-4 bg-white border-b border-gray-100 shadow-xl mb-8 -mt-8 rounded-t-3xl relative z-10 mx-4">
        
        {/* Hidden Input */}
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileSelect}
        />

        {/* --- DEFAULT STATE: No File Selected --- */}
        {!selectedFile && !success && (
            <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-300 py-4">
                <button 
                    onClick={triggerPicker}
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 shadow-lg shadow-indigo-200 flex flex-col items-center justify-center text-white active:scale-95 transition-transform hover:scale-105"
                >
                    <Camera className="w-8 h-8 mb-1" />
                </button>
                <h3 className="text-lg font-bold text-gray-800 mt-4">Share a Memory</h3>
                <p className="text-xs text-gray-400 max-w-xs mt-1">
                    Take a photo or upload from your gallery
                </p>
            </div>
        )}

        {/* --- PREVIEW MODE: File Selected --- */}
        {selectedFile && !uploading && !success && (
            <div className="w-full max-w-sm flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-300">
                
                {/* Image Preview */}
                <div className="relative w-full bg-black rounded-xl overflow-hidden shadow-md group">
                    <img 
                        src={previewUrl!} 
                        alt="Preview" 
                        className="w-full h-auto max-h-[400px] object-contain mx-auto"
                    />
                    <button 
                        onClick={cancelPreview}
                        className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-red-500/80 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Inputs */}
                <div className="space-y-3">
                    <div>
                        <input 
                            type="text" 
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-purple-500 focus:bg-white focus:outline-none transition-all"
                            placeholder="Your Name (e.g. Aunt Maria)"
                        />
                    </div>
                    <div>
                        <textarea 
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-purple-500 focus:bg-white focus:outline-none resize-none transition-all"
                            placeholder="Add a sweet caption..."
                            rows={2}
                        />
                    </div>
                </div>

                {/* Send Button */}
                <button 
                    onClick={handleUpload}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                    <Send size={18} />
                    Send Memory
                </button>
            </div>
        )}

        {/* --- UPLOADING STATE --- */}
        {uploading && (
          <div className="flex flex-col items-center py-8">
            <div className="w-16 h-16 rounded-full bg-white border-4 border-purple-100 flex items-center justify-center text-purple-600 mb-4">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <span className="font-bold text-gray-600">Uploading...</span>
          </div>
        )}

        {/* --- SUCCESS STATE (With Reset Button) --- */}
        {success && (
          <div className="flex flex-col items-center py-6 animate-in zoom-in duration-300 w-full">
            <div className="w-20 h-20 rounded-full bg-green-50 border-4 border-green-100 flex items-center justify-center text-green-600 mb-4">
                <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Photo Sent!</h3>
            <p className="text-gray-500 text-sm mb-6 text-center">It will appear in the gallery once approved.</p>
            
            <button 
                onClick={() => {
                    setSuccess(false);
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setCaption('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-md transition-colors"
            >
                Upload Another Memory
            </button>
          </div>
        )}

      </div>

      {/* 3. Live Gallery */}
      <div className="px-4 max-w-4xl mx-auto">
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 px-2">
            <ImageIcon size={16} className="text-purple-600"/>
            Live Gallery
        </h3>
        
        {(!memories || memories.length === 0) ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-400 text-sm">No approved photos yet.<br/>Be the first to share!</p>
            </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {memories.map(memory => (
                    <div key={memory.id} className="relative aspect-[4/5] bg-gray-100 rounded-xl overflow-hidden shadow-sm">
                        <img 
                            src={getImageUrl(memory.storagePath)} 
                            alt="Memory" 
                            className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                            loading="lazy"
                        />
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};