import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { X, QrCode, Trash2, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { getImageUrl } from '../utils/image'; // FIX: Imported centralized utility
import { API_URL } from '../lib/config';

// FIX: Updated to match Backend/Drizzle naming (camelCase) & UUIDs
interface Memory {
  id: string; // UUID
  type: 'photo' | 'video' | 'story';
  storagePath: string; 
  originalText?: string;
  aiStory?: string;
  isApproved: boolean;
  createdAt: string;
}

// Memory Card Component
const MemoryCard = ({ 
    memory, 
    onUpdateStatus,
    onDelete,
    onViewStory
}: { 
    memory: Memory; 
    onUpdateStatus: (id: string, status: boolean) => void;
    onDelete: (id: string) => void;
    onViewStory: (memory: Memory) => void;
}) => {
  const text = memory.aiStory || "";
  const isLongText = text.length > 100;

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-lg hover:border-indigo-500/50 transition-all flex flex-col h-full group">
      {/* Image Area */}
      <div className="aspect-[4/3] w-full relative bg-gray-800 overflow-hidden cursor-pointer" onClick={() => onViewStory(memory)}>
          {memory.type === 'photo' ? (
              <img 
                src={getImageUrl(memory.storagePath)} // FIX: Use centralized utility
                alt="Memory" 
                className="w-full h-full object-cover block transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/400x600?text=Broken+Image';
                }}
              />
          ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gray-800">
                  <span className="text-xs uppercase tracking-widest">Video</span>
              </div>
          )}
          
          <div className="absolute top-3 right-3 z-10">
              <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold text-white shadow-sm backdrop-blur-md flex items-center gap-1 ${
                  memory.isApproved 
                      ? 'bg-green-600/90' 
                      : 'bg-yellow-600/90'
              }`}>
                  {memory.isApproved ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                  {memory.isApproved ? 'Live' : 'Pending'}
              </span>
          </div>
      </div>
      
      {/* Content Area */}
      <div className="p-4 flex flex-col flex-grow">
          {text && (
            <div className="mb-3">
              <p className="text-sm text-gray-300 italic line-clamp-3">"{text}"</p>
              {isLongText && (
                <button onClick={(e) => { e.stopPropagation(); onViewStory(memory); }} className="text-xs text-indigo-400 hover:text-indigo-300 mt-1">
                  Read more
                </button>
              )}
            </div>
          )}

          {memory.originalText && (
              <div className="mt-auto mb-4 flex items-start gap-2 text-xs text-gray-500">
                  <FileText size={12} className="mt-0.5 flex-shrink-0" />
                  <p className="line-clamp-2">{memory.originalText}</p>
              </div>
          )}

          {/* Action Buttons */}
          <div className={`grid gap-2 mt-auto ${memory.isApproved ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {!memory.isApproved && (
                  <button 
                      onClick={() => onUpdateStatus(memory.id, true)}
                      className="py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white transition-colors"
                  >
                      Approve
                  </button>
              )}
              
              <button 
                  onClick={() => onDelete(memory.id)}
                  className={`py-2 rounded-lg text-xs font-semibold transition-colors border ${
                      memory.isApproved 
                        ? 'border-red-900/50 text-red-400 hover:bg-red-900/20' 
                        : 'bg-gray-800 hover:bg-red-900/30 text-gray-300 hover:text-red-300'
                  }`}
              >
                  {memory.isApproved ? 'Reject / Delete' : 'Reject'}
              </button>
          </div>
      </div>
    </div>
  );
};

// Story Modal Component
const StoryModal = ({ memory, onClose }: { memory: Memory; onClose: () => void }) => {
  if (!memory) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 text-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row relative animate-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-red-600/80 text-white rounded-full p-2 transition-colors backdrop-blur-md"
        >
          <X size={20} />
        </button>

        <div className="md:w-1/2 bg-black flex items-center justify-center bg-pattern">
           <img 
             src={getImageUrl(memory.storagePath)} 
             alt="Memory" 
             className="w-full h-full object-contain max-h-[50vh] md:max-h-full"
           />
        </div>
        
        <div className="p-8 md:w-1/2 flex flex-col bg-gray-900 overflow-y-auto">
            <h3 className="text-2xl font-serif text-indigo-300 italic mb-6 leading-relaxed">
              "{memory.aiStory || "No story generated yet..."}"
            </h3>
            
            <div className="mt-auto border-t border-gray-800 pt-6 space-y-4">
               {memory.originalText && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-bold">Guest Caption</p>
                    <div className="bg-gray-800/50 p-3 rounded-lg text-sm text-gray-300 border border-gray-800">
                        {memory.originalText}
                    </div>
                  </div>
               )}
               <div className="flex items-center justify-between text-xs text-gray-600 pt-2">
                   <span>Captured on {new Date(memory.createdAt).toLocaleDateString()}</span>
                   <span className="uppercase tracking-widest">{memory.type}</span>
               </div>
            </div>
        </div>
      </div>
    </div>
  );
};

// MAIN PAGE COMPONENT
const EventDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventSlug, setEventSlug] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isAdmin, setIsAdmin] = useState(false); // NEW: Admin Check

  // Approve Logic
  const updateStatus = async (memoryId: string, isApproved: boolean) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        const res = await fetch(`${API_URL}/api/host/memories/${memoryId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isApproved })
        });

        if (!res.ok) throw new Error('Failed to update status');

        // Optimistic UI update
        setMemories(prev => prev.map(m => m.id === memoryId ? { ...m, isApproved } : m));
    } catch (err: any) {
        console.error('Error updating status:', err);
        alert('Failed to update status');
    }
  };

  // Delete Logic (Reject)
  const deleteMemory = async (memoryId: string) => {
      if(!window.confirm("Are you sure you want to delete this memory? This cannot be undone.")) return;

      // Optimistic Update
      setMemories(prev => prev.filter(m => m.id !== memoryId));
      if (selectedMemory?.id === memoryId) setSelectedMemory(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        const res = await fetch(`${API_URL}/api/host/memories/${memoryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        if (!res.ok) throw new Error('Failed to delete');
      } catch (err) {
          console.error('Error deleting memory:', err);
          alert('Failed to reject memory.');
      }
  };

  // NEW: Force Delete Event (Admin Only)
  const handleDeleteEvent = async () => {
      const confirmText = "DELETE-EVENT";
      const input = window.prompt(`WARNING: This will permanently delete this event and ALL ${memories.length} memories.\n\nType "${confirmText}" to confirm.`);
      
      if (input !== confirmText) return;

      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          const res = await fetch(`${API_URL}/api/host/events/${id}`, {
              method: 'DELETE',
              headers: {
                  'Authorization': `Bearer ${session.access_token}`
              }
          });

          if (!res.ok) throw new Error('Failed to delete event');
          
          alert("Event deleted successfully.");
          navigate('/dashboard');

      } catch (err: any) {
          alert(`Error: ${err.message}`);
      }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        // 1. Fetch Memories
        const memoriesRes = await fetch(`${API_URL}/api/host/events/${id}/memories`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });

        // 2. Fetch All Events (to find current one)
        const eventsRes = await fetch(`${API_URL}/api/host/events`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });

        // 3. Fetch Profile (To check Admin Status)
        const profileRes = await fetch(`${API_URL}/api/host/profile`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        
        if (!memoriesRes.ok || !eventsRes.ok) throw new Error('Failed to fetch data');

        const memoriesData = await memoriesRes.json();
        const eventsData = await eventsRes.json();
        
        // Handle Profile for Admin Check
        if (profileRes.ok) {
            const profile = await profileRes.json();
            setIsAdmin(profile.role === 'admin');
        }

        setMemories(memoriesData);

        if (Array.isArray(eventsData)) {
            // FIX: UUID string comparison (no Number() casting)
            const currentEvent = eventsData.find((e: any) => e.id === id);
            if (currentEvent) setEventSlug(currentEvent.slug);
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();

    // Set up Realtime Subscription for Host
    const channel = supabase
      .channel('host_memories_dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memories',
        },
        (payload) => {
           console.log('Host Realtime Payload:', payload);
           // Client-side filtering to bypass strict RLS replication missing grants
           const incomingEventId = payload.eventType === 'DELETE' 
             ? payload.old.event_id 
             : payload.new.event_id;
             
           if (incomingEventId !== id) return;

           if (payload.eventType === 'INSERT') {
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
              setMemories(prev => prev.map(m => m.id === payload.new.id ? { 
                ...m,
                isApproved: payload.new.is_approved,
                aiStory: payload.new.ai_story 
             } : m));
           }

           if (payload.eventType === 'DELETE') {
              setMemories(prev => prev.filter(m => m.id !== payload.old.id));
           }
        }
      )
      .subscribe();

      return () => {
          supabase.removeChannel(channel);
      };

  }, [id]);

  const guestUrl = eventSlug ? `${window.location.origin}/e/${eventSlug}` : '';

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8 text-white relative">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <button 
                onClick={() => navigate('/dashboard')}
                className="flex items-center text-gray-400 hover:text-white transition-colors group"
            >
                <span className="group-hover:-translate-x-1 transition-transform">←</span> 
                <span className="ml-2">Back to Dashboard</span>
            </button>
            
            <div className="flex gap-3">
                {/* Admin Nuke Button */}
                {isAdmin && (
                    <button 
                        onClick={handleDeleteEvent}
                        className="flex items-center gap-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                    >
                        <Trash2 size={16} />
                        Force Delete Event
                    </button>
                )}

                {eventSlug && (
                    <button 
                    onClick={() => setShowQR(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        <QrCode size={18} />
                        Show Guest QR
                    </button>
                )}
            </div>
        </div>

        <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Manage Event Memories</h1>
            <p className="text-gray-400">Review, approve, or reject content uploaded by your guests.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>
        ) : error ? (
          <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-300">Error: {error}</div>
        ) : memories.length === 0 ? (
           <div className="text-center py-20 bg-gray-900 rounded-2xl border border-gray-800 border-dashed">
            <h3 className="text-xl font-medium text-white">No memories yet</h3>
            <p className="mt-2 text-gray-400">Guests haven't uploaded anything for this event.</p>
            {eventSlug && (
                <button 
                  onClick={() => setShowQR(true)}
                  className="mt-6 px-6 py-2 bg-gray-800 rounded-full text-sm text-indigo-400 hover:text-indigo-300 hover:bg-gray-700 transition-colors"
                >
                    Display QR Code
                </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-fr"> 
            {memories.map((memory) => (
              <MemoryCard 
                key={memory.id} 
                memory={memory} 
                onUpdateStatus={updateStatus}
                onDelete={deleteMemory}
                onViewStory={setSelectedMemory}
              />
            ))}
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQR && guestUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setShowQR(false)}>
            <div className="bg-white text-gray-900 p-8 rounded-2xl shadow-2xl max-w-sm w-full relative animate-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                <button 
                    onClick={() => setShowQR(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X size={24} />
                </button>
                
                <div className="text-center">
                    <h3 className="text-2xl font-bold mb-2">Scan to Join</h3>
                    <p className="text-gray-500 mb-6 text-sm">Guests can scan this to upload photos directly to this event.</p>
                    
                    <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100 inline-block">
                        <QRCodeSVG value={guestUrl} size={200} level="H" />
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-400 truncate font-mono bg-gray-50 p-2 rounded cursor-pointer hover:bg-gray-100" onClick={() => navigator.clipboard.writeText(guestUrl)}>
                            {guestUrl}
                        </p>
                        <p className="text-[10px] text-indigo-500 mt-1">Click URL to copy</p>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Story Modal */}
      {selectedMemory && (
        <StoryModal 
          memory={selectedMemory} 
          onClose={() => setSelectedMemory(null)} 
        />
      )}
    </div>
  );
};

export default EventDetailsPage;