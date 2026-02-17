import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Loader2, CheckCircle2, Image as ImageIcon, Send, X } from 'lucide-react';
import { getEventCoverUrl } from '../utils/imageUrl';

interface EventDetails {
  id: string;
  title: string;
  date: string;
  coverImage: string | null;
  welcomeMessage: string | null;
}

interface Memory {
  id: string; 
  type: 'photo' | 'video' | 'story';
  storagePath: string; 
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
      
      // Cleanup Preview after success
      setTimeout(() => {
          setSuccess(false);
          setCaption('');
          setSelectedFile(null);
          setPreviewUrl(null);
      }, 3000);

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
      {/* 1. Header */}
      <div className="bg-white shadow-sm pb-6 text-center sticky top-0 z-20 overflow-hidden">
        {/* Event Cover Background */}
        <div className="h-48 w-full relative mb-12">
            <img 
                src={getEventCoverUrl(event.coverImage)} 
                alt="Cover" 
                className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent"></div>
            
            {/* Title Overlay */}
            <div className="absolute -bottom-8 left-0 right-0 px-6">
                <h1 className="text-3xl font-serif text-gray-900 mb-1 drop-shadow-sm">{event.title}</h1>
                <p className="text-sm text-gray-600 bg-white/80 inline-block px-3 py-1 rounded-full backdrop-blur-sm shadow-sm">
                    {new Date(event.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                </p>
            </div>
        </div>

        {event.welcomeMessage && (
            <div className="mt-4 px-6">
                <div className="p-4 bg-purple-50 rounded-xl text-purple-800 text-sm italic border border-purple-100">
                    "{event.welcomeMessage}"
                </div>
            </div>
        )}
      </div>

      {/* 2. Main Action Area */}
      <div className="p-6 flex flex-col items-center gap-4 bg-white border-b border-gray-100 shadow-sm mb-6 transition-all duration-300">
        
        {/* Hidden Input (Note: removed 'capture' attribute) */}
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileSelect}
        />

        {/* --- DEFAULT STATE: No File Selected --- */}
        {!selectedFile && !success && (
            <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
                <button 
                    onClick={triggerPicker}
                    className="w-40 h-40 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 shadow-xl shadow-purple-200 flex flex-col items-center justify-center text-white active:scale-95 transition-transform"
                >
                    <Camera className="w-10 h-10 mb-2" />
                    <span className="font-bold text-lg">Share Memory</span>
                </button>
                <p className="text-xs text-gray-400 mt-4 max-w-xs">
                    Tap to take a photo or select from gallery
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
                        className="w-full h-auto max-h-[300px] object-contain mx-auto"
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
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                    <Send size={18} />
                    Send Memory
                </button>
            </div>
        )}

        {/* --- UPLOADING STATE --- */}
        {uploading && (
          <div className="flex flex-col items-center py-6">
            <div className="w-20 h-20 rounded-full bg-white border-4 border-purple-100 flex items-center justify-center text-purple-600 mb-4">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <span className="font-bold text-gray-600">Sending...</span>
          </div>
        )}

        {/* --- SUCCESS STATE --- */}
{success && (
  <div className="flex flex-col items-center py-6 animate-in zoom-in duration-300">
    <div className="w-24 h-24 rounded-full bg-green-50 border-4 border-green-100 flex items-center justify-center text-green-600 mb-4">
        <CheckCircle2 className="w-10 h-10" />
    </div>
    <h3 className="text-xl font-bold text-gray-800">Photo Sent!</h3>
    <p className="text-gray-500 text-sm mb-6">The host will approve it shortly.</p>
  </div>
)}
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
{/* Gallery Loop */}
{memories.map(memory => (
    <div key={memory.id} className="relative aspect-[4/5] bg-gray-100 rounded-xl overflow-hidden shadow-sm">
        {/* FIX: Use .storagePath instead of .storage_path */}
        <img 
            src={getEventCoverUrl(memory.storagePath)} 
            alt="Memory" 
            className="w-full h-full object-cover"
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
