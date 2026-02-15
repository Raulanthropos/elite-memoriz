import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { X, QrCode } from 'lucide-react';

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

// Helper to construct full image URL
const getImageUrl = (path: string) => {
  if (path.startsWith('http')) return path;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/uploads/${path}`;
};

// Sub-component for individual memory cards to handle local 'expanded' state
const MemoryCard = ({ memory, onUpdateStatus }: { memory: Memory; onUpdateStatus: (id: number, status: boolean) => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const text = memory.aiStory || "";
  const isLongText = text.length > 100; // Arbitrary threshold for "long"

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-lg hover:border-indigo-500/50 transition-all flex flex-col">
      <div className="aspect-square relative bg-gray-800">
          {memory.type === 'photo' ? (
              <img 
                src={getImageUrl(memory.storagePath)} 
                alt="Memory" 
                className="w-full h-full object-cover"
                onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/400x600?text=Broken+Image';
                }}
              />
          ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                  Video Placeholder
              </div>
          )}
          
          <div className="absolute top-3 right-3">
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
          {text && (
            <div className="mb-3">
              <p className={`text-sm text-gray-300 italic transition-all ${isExpanded ? '' : 'line-clamp-3'}`}>
                "{text}"
              </p>
              {isLongText && (
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="mt-1 text-xs text-blue-400 hover:text-blue-300 font-medium focus:outline-none"
                >
                  {isExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          {memory.originalText && (
              <p className="text-xs text-gray-500 line-clamp-1 mb-4 mt-auto">Original: {memory.originalText}</p>
          )}

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
                  onClick={() => onUpdateStatus(memory.id, false)}
                  className="flex-1 py-2 bg-gray-800 hover:bg-red-900/50 hover:text-red-200 rounded-lg text-xs font-semibold text-gray-300 transition-colors"
              >
                  Reject
              </button>
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

  const updateStatus = async (memoryId: number, isApproved: boolean) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        const res = await fetch(`http://localhost:4000/api/host/memories/${memoryId}`, {
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        // Fetch Memories
        const memoriesRes = await fetch(`http://localhost:4000/api/host/events/${id}/memories`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        // Fetch Event Details (to get slug for QR)
        // Note: Currently we don't have a direct "get single event for host" endpoint documented in previous context,
        // but we can assume /api/host/events returns list, or we need to add one.
        // Optimization: Let's fetch the list and find this event, OR add a GET /api/host/events/:id endpoint.
        // For MVP speed, let's just fetch all host events and find this one to get the slug.
        // Ideally we should have Get Event Details endpoint.
        const eventsRes = await fetch(`http://localhost:4000/api/host/events`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
        });
        
        if (!memoriesRes.ok || !eventsRes.ok) throw new Error('Failed to fetch data');

        const memoriesData = await memoriesRes.json();
        const eventsData = await eventsRes.json();
        
        setMemories(memoriesData);
        
        const currentEvent = eventsData.find((e: any) => e.id === Number(id));
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {memories.map((memory) => (
              <MemoryCard 
                key={memory.id} 
                memory={memory} 
                onUpdateStatus={updateStatus} 
              />
            ))}
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
    </div>
  );
};

export default EventDetailsPage;
