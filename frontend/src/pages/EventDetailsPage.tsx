import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { X, QrCode } from 'lucide-react';
import { getEventCoverUrl } from '../utils/imageUrl';

// Memory Interface
interface Memory {
  id: number;
  type: 'photo' | 'video' | 'story';
  storagePath: string;
  originalText?: string;
  aiStory?: string;
  isApproved: boolean;
  createdAt: string;
}

// Sub-component for individual memory cards
const MemoryCard = ({ 
    memory, 
    onUpdateStatus,
    onDelete,
    onViewStory
}: { 
    memory: Memory; 
    onUpdateStatus: (id: number, status: boolean) => void;
    onDelete: (id: number) => void;
    onViewStory: (memory: Memory) => void;
}) => {
  const text = memory.aiStory || "";
  const isLongText = text.length > 100;

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-lg hover:border-indigo-500/50 transition-all flex flex-col h-full">
      {/* Fixed aspect ratio for image with strict overflow hidden */}
      <div className="aspect-[4/3] w-full relative bg-gray-800 overflow-hidden cursor-pointer" onClick={() => onViewStory(memory)}>
          {memory.type === 'photo' ? (
              <img 
                src={getEventCoverUrl(memory.storagePath)} 
                alt="Memory" 
                className="w-full h-full object-cover block transition-transform duration-500 hover:scale-105"
                onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/400x600?text=Broken+Image';
                }}
              />
          ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                  Video Placeholder
              </div>
          )}
          
          <div className="absolute top-3 right-3 z-10">
              <span className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-md backdrop-blur-md ${
                  memory.isApproved 
                      ? 'bg-green-600/90' 
                      : 'bg-yellow-600/90'
              }`}>
                  {memory.isApproved ? 'Approved' : 'Pending'}
              </span>
          </div>
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
          {/* Main Story Text */}
          {text && (
            <div className="mb-3">
              <p className="text-sm text-gray-300 italic line-clamp-3">
                "{text}"
              </p>
              {isLongText && (
                <button 
                  onClick={() => onViewStory(memory)}
                  className="mt-1 text-xs text-blue-400 hover:text-blue-300 font-medium focus:outline-none"
                >
                  Read full story
                </button>
              )}
            </div>
          )}

          {/* Original Text (Always Visible for Verification) */}
          {memory.originalText && (
              <p className="text-xs text-gray-500 line-clamp-1 mb-4 mt-auto">Original: {memory.originalText}</p>
          )}

          {/* Spacer if no original text, to keep buttons aligned at bottom if desired, 
              but flex-grow on the container above usually handles it if we want buttons at very bottom. 
              The 'mt-auto' on the button container handles the alignment. */}

          <div className="mt-auto flex gap-2 pt-2">
              {memory.isApproved ? (
                  <button 
                      disabled
                      className="flex-1 py-2 bg-green-600/50 cursor-not-allowed rounded-lg text-xs font-semibold text-white transition-colors"
                  >
                      Approved
                  </button>
              ) : (
                  <button 
                      onClick={() => onUpdateStatus(memory.id, true)}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white transition-colors"
                  >
                      Approve
                  </button>
              )}
              
              <button 
                  onClick={() => onDelete(memory.id)}
                  className="flex-1 py-2 bg-gray-800 hover:bg-red-900/50 hover:text-red-200 rounded-lg text-xs font-semibold text-gray-300 transition-colors"
              >
                  Reject
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
      <div className="bg-gray-900 text-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative flex flex-col md:flex-row" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors"
        >
          <X size={24} />
        </button>

        <div className="md:w-1/2 bg-gray-800">
           {memory.type === 'photo' ? (
              <img 
                src={getEventCoverUrl(memory.storagePath)} 
                alt="Memory" 
                className="w-full h-full object-contain md:object-cover min-h-[300px]"
              />
          ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 min-h-[300px]">
                  Video Placeholder
                </div>
          )}
        </div>
        
        <div className="p-8 md:w-1/2 flex flex-col justify-center">
            <h3 className="text-2xl font-serif text-purple-300 italic mb-6">
              "{memory.aiStory}"
            </h3>
            
            <div className="mt-auto border-t border-gray-800 pt-4">
               {memory.originalText && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Original Caption</p>
                    <p className="text-sm text-gray-400">"{memory.originalText}"</p>
                  </div>
               )}
               <p className="text-xs text-gray-600 mt-2">Captured on {new Date(memory.createdAt).toLocaleDateString()}</p>
            </div>
        </div>
      </div>
    </div>
  );
};


const EventDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventSlug, setEventSlug] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Approve Logic
  const updateStatus = async (memoryId: number, isApproved: boolean) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        const res = await fetch(`https://elite-memoriz-production.up.railway.app/api/host/memories/${memoryId}`, {
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
  const deleteMemory = async (memoryId: number) => {
      // Optimistic Update immediately
      setMemories(prev => prev.filter(m => m.id !== memoryId));
      if (selectedMemory?.id === memoryId) setSelectedMemory(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        const res = await fetch(`https://elite-memoriz-production.up.railway.app/api/host/memories/${memoryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        if (!res.ok) {
            throw new Error('Failed to delete');
        }
      } catch (err) {
          console.error('Error deleting memory:', err);
          alert('Failed to reject memory.');
      }
  };

  const handleAdminDelete = async () => {
      if (!confirm('ADMIN: Are you sure you want to FORCE DELETE this event? This action is irreversible.')) return;

      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('No session');

          const res = await fetch(`https://elite-memoriz-production.up.railway.app/api/host/events/${id}`, {
              method: 'DELETE',
              headers: {
                  'Authorization': `Bearer ${session.access_token}`
              }
          });

          if (!res.ok) throw new Error('Failed to delete event');
          
          alert('Event deleted successfully.');
          navigate('/dashboard');
      } catch (err) {
          console.error('Admin delete failed:', err);
          alert('Failed to delete event');
      }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        // Fetch Memories
        const memoriesRes = await fetch(`https://elite-memoriz-production.up.railway.app/api/host/events/${id}/memories`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        // Fetch Event Details
        const eventsRes = await fetch(`https://elite-memoriz-production.up.railway.app/api/host/events`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
        });
        
        if (!memoriesRes.ok || !eventsRes.ok) throw new Error('Failed to fetch data');

        // Fetch User Profile to check for Admin
        const profileRes = await fetch(`https://elite-memoriz-production.up.railway.app/api/host/profile`, {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });
        if (profileRes.ok) {
            const profile = await profileRes.json();
            setIsAdmin(profile.role === 'admin');
        }

        const memoriesData = await memoriesRes.json();
        const eventsData = await eventsRes.json();
        
        setMemories(memoriesData);

        if (!Array.isArray(eventsData)) {
            console.error("Expected array but got:", eventsData);
            return;
        }
        
        // ID is now a UUID string, so we compare directly
        const currentEvent = eventsData.find((e: any) => e.id === id);
        if (currentEvent) setEventSlug(currentEvent.slug);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  const guestUrl = eventSlug ? `${window.location.origin}/e/${eventSlug}` : '';

  return (
    <div className="min-h-screen bg-gray-950 p-8 text-white relative">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-400 hover:text-white transition-colors"
            >
            ← Back to Dashboard
            </button>
            
            {eventSlug && (
                <button 
                  onClick={() => setShowQR(true)}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    <QrCode size={20} />
                    Show QR Code
                </button>
            )}
        </div>

        <h1 className="text-3xl font-bold mb-2">Approval Queue</h1>
        <p className="text-gray-400 mb-8">Review and approve guest memories for Event #{id}</p>

        {loading ? (
          <div>Loading memories...</div>
        ) : error ? (
          <div className="text-red-400">Error: {error}</div>
        ) : memories.length === 0 ? (
           <div className="text-center py-20 bg-gray-900 rounded-2xl border border-gray-800 border-dashed">
            <h3 className="text-xl font-medium text-white">No memories yet</h3>
            <p className="mt-2 text-gray-400">Guests haven't uploaded anything for this event.</p>
            {eventSlug && (
                <button 
                  onClick={() => setShowQR(true)}
                  className="mt-4 px-4 py-2 bg-gray-800 rounded-lg text-sm text-purple-400 hover:text-purple-300"
                >
                    Show Guest QR Code
                </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-fr"> 
            {/* auto-rows-fr ensures all rows have equal height based on the tallest item */}
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
        
        {/* Admin Force Delete Section */}
        {isAdmin && (
            <div className="mt-12 pt-8 border-t border-red-900/30">
                <h3 className="text-xl font-bold text-red-500 mb-4">Admin Danger Zone</h3>
                <div className="bg-red-900/10 border border-red-900/50 rounded-xl p-6 flex justify-between items-center">
                    <div>
                        <p className="text-white font-medium">Force Delete Event</p>
                        <p className="text-sm text-gray-400">Permanently remove this event and all its memories. This cannot be undone.</p>
                    </div>
                    <button 
                        onClick={handleAdminDelete}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-lg shadow-red-900/20"
                    >
                        Force Delete
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQR && guestUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white text-gray-900 p-8 rounded-2xl shadow-2xl max-w-sm w-full relative">
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
                        <p className="text-xs text-gray-400 truncate font-mono bg-gray-50 p-2 rounded selectable">
                            {guestUrl}
                        </p>
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

