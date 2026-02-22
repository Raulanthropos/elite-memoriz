import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Camera, Loader2, CheckCircle2, Image as ImageIcon, Send, X } from 'lucide-react';
import { getEventCoverUrl, getImageUrl } from '../utils/image';
import ImageCropper from '../components/ImageCropper'; // FIX: Import Cropper
import { API_URL } from '../lib/config';

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
  
  // Cropper State
  const [isCropping, setIsCropping] = useState(false);
  const [rawFileUrl, setRawFileUrl] = useState<string | null>(null);
  
  // Form State
  const [guestName, setGuestName] = useState('Guest');
  const [caption, setCaption] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventRes, memoriesRes] = await Promise.all([
            fetch(`${API_URL}/api/events/${slug}`),
            fetch(`${API_URL}/api/events/${slug}/memories`)
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

    // Set up Realtime Subscription
    const channel = supabase
      .channel('guest_memories_feed')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memories',
        },
        (payload) => {
           console.log('Guest Realtime Payload:', payload);
           // We only care about Approved memories for the guest feed
           if (payload.eventType === 'INSERT' && payload.new.is_approved) {
              setMemories(prev => [
                {
                   id: payload.new.id,
                   type: payload.new.type,
                   storagePath: payload.new.storage_path,
                   originalText: payload.new.original_text,
                   aiStory: payload.new.ai_story,
                   isApproved: payload.new.is_approved,
                   createdAt: payload.new.created_at
                },
                ...prev
              ]);
           }

           if (payload.eventType === 'UPDATE') {
              if (payload.new.is_approved) {
                  // If it was just approved, add it or update it
                  setMemories(prev => {
                     const exists = prev.find(m => m.id === payload.new.id);
                     if (exists) {
                         return prev.map(m => m.id === payload.new.id ? { 
                            ...m,
                            isApproved: true,
                            aiStory: payload.new.ai_story 
                         } : m);
                     } else {
                         return [{
                           id: payload.new.id,
                           type: payload.new.type,
                           storagePath: payload.new.storage_path,
                           originalText: payload.new.original_text,
                           aiStory: payload.new.ai_story,
                           isApproved: payload.new.is_approved,
                           createdAt: payload.new.created_at
                        }, ...prev];
                     }
                  });
              } else {
                 // If it was unapproved/rejected, remove it from feed
                 setMemories(prev => prev.filter(m => m.id !== payload.new.id));
              }
           }

           if (payload.eventType === 'DELETE') {
              setMemories(prev => prev.filter(m => m.id !== payload.old.id));
           }
        }
      )
      .subscribe();

      // Cleanup
      return () => {
          supabase.removeChannel(channel);
      };

  }, [slug]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Create a raw URL for the cropper to use
    const url = URL.createObjectURL(file);
    setRawFileUrl(url);
    
    // 2. Open Cropper immediately
    setIsCropping(true);
    
    // Reset input so same file can be picked again if cancelled
    e.target.value = '';
  };

  const onCropComplete = (croppedBlob: Blob) => {
    // 3. Convert Result back to File
    const file = new File([croppedBlob], "memory.jpg", { type: "image/jpeg" });
    
    // 4. Set Final State for Upload
    const url = URL.createObjectURL(croppedBlob);
    setPreviewUrl(url);
    setSelectedFile(file);
    
    // 5. Close Cropper
    setIsCropping(false);
    setSuccess(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('photo', selectedFile);
    
    // Clean Caption
    const finalCaption = `${caption} - Uploaded by ${guestName}`.trim();
    formData.append('memory', finalCaption); 

    try {
      const res = await fetch(`${API_URL}/api/events/${slug}/upload`, {
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
      setRawFileUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-purple-600" /></div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Event not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-gray-900">
      {/* 1. Header */}
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
        
        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />

        {/* DEFAULT STATE */}
        {!selectedFile && !success && (
            <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-300 py-4">
                <button 
                    onClick={triggerPicker}
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 shadow-lg shadow-indigo-200 flex flex-col items-center justify-center text-white active:scale-95 transition-transform hover:scale-105"
                >
                    <Camera className="w-8 h-8 mb-1" />
                </button>
                <h3 className="text-lg font-bold text-gray-800 mt-4">Share a Memory</h3>
                <p className="text-xs text-gray-400 max-w-xs mt-1">Take a photo or upload from gallery</p>
            </div>
        )}

        {/* PREVIEW MODE (Post-Crop) */}
        {selectedFile && !uploading && !success && (
            <div className="w-full max-w-sm flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-300">
                <div className="relative w-full bg-black rounded-xl overflow-hidden shadow-md group">
                    <img src={previewUrl!} alt="Preview" className="w-full h-auto max-h-[400px] object-contain mx-auto"/>
                    <button onClick={cancelPreview} className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-red-500/80 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="space-y-3">
                    <input 
                        type="text" 
                        value={guestName} onChange={(e) => setGuestName(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        placeholder="Your Name"
                    />
                    <textarea 
                        value={caption} onChange={(e) => setCaption(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                        placeholder="Add a caption..."
                        rows={2}
                    />
                </div>
                <button onClick={handleUpload} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                    <Send size={18} /> Send Memory
                </button>
            </div>
        )}

        {/* UPLOADING */}
        {uploading && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
            <span className="font-bold text-gray-600">Uploading...</span>
          </div>
        )}

        {/* SUCCESS */}
        {success && (
          <div className="flex flex-col items-center py-6 animate-in zoom-in duration-300 w-full">
            <div className="w-20 h-20 rounded-full bg-green-50 border-4 border-green-100 flex items-center justify-center text-green-600 mb-4">
                <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Photo Sent!</h3>
            <p className="text-gray-500 text-sm mb-6">It will appear once approved.</p>
            <button 
                onClick={() => { setSuccess(false); setSelectedFile(null); setPreviewUrl(null); setCaption(''); }}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-md transition-colors"
            >
                Upload Another
            </button>
          </div>
        )}
      </div>

      {/* 3. Gallery */}
      <div className="px-4 max-w-4xl mx-auto">
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 px-2">
            <ImageIcon size={16} className="text-purple-600"/> Live Gallery
        </h3>
        
        {(!memories || memories.length === 0) ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-400 text-sm">No approved photos yet.</p>
            </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {memories.map(memory => (
                    <div key={memory.id} className="relative aspect-[4/5] bg-gray-100 rounded-xl overflow-hidden shadow-sm">
                        <img src={getImageUrl(memory.storagePath)} alt="Memory" className="w-full h-full object-cover" loading="lazy"/>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* CROPPER MODAL - Rendered Conditionally */}
      {isCropping && rawFileUrl && (
          <ImageCropper 
            imageSrc={rawFileUrl}
            aspectRatio={4/5} // Vertical aspect ratio for memories
            onCropComplete={onCropComplete}
            onCancel={() => {
                setIsCropping(false);
                setRawFileUrl(null);
                if(fileInputRef.current) fileInputRef.current.value = '';
            }}
          />
      )}
    </div>
  );
};